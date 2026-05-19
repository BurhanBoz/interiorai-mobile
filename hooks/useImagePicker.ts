import { useState } from "react";
import { Alert, Linking } from "react-native";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { uploadImage } from "@/services/files";

// Upload-side cap: iPhone photos can be 8-12 MB at 4032×3024; S3 PUT is
// metered and Replicate pulls the image each prediction, so shrinking to
// 2048 on the longest edge + JPEG 0.85 loses no perceptible detail while
// cutting bandwidth 5-8×.
const MAX_EDGE_PX = 2048;
const JPEG_QUALITY = 0.85;

export function useImagePicker() {
    const { t } = useTranslation();
    const [isUploading, setIsUploading] = useState(false);

    /**
     * Ensure the OS permission for the chosen source is granted BEFORE
     * launching the picker.
     *
     * <p>expo-image-picker does NOT auto-prompt for the camera on iOS —
     * calling {@link ImagePicker.launchCameraAsync} without an explicit
     * grant throws "Missing camera or camera roll permission". We request
     * explicitly so the first tap shows the native prompt; on a hard
     * denial (OS will not ask again) we deep-link the user into Settings.
     *
     * <p>States handled:
     * <ul>
     *   <li><b>granted</b> → proceed.</li>
     *   <li><b>undetermined / canAskAgain</b> → fire the native prompt;
     *       if the user declines this moment, stay silent (no nag modal).</li>
     *   <li><b>denied + !canAskAgain</b> → in-app Alert with an
     *       "Open Settings" deep link (only path back to a grant on iOS).</li>
     * </ul>
     *
     * @returns true if the picker may proceed, false if it must abort.
     */
    const ensurePermission = async (
        source: "camera" | "gallery",
    ): Promise<boolean> => {
        const isCamera = source === "camera";

        const current = isCamera
            ? await ImagePicker.getCameraPermissionsAsync()
            : await ImagePicker.getMediaLibraryPermissionsAsync();

        if (current.granted) return true;

        if (
            current.status === ImagePicker.PermissionStatus.UNDETERMINED ||
            current.canAskAgain
        ) {
            const requested = isCamera
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (requested.granted) return true;
            // User just tapped "Don't Allow" — that's an explicit choice
            // made this instant; don't pile an extra modal on top of it.
            if (requested.canAskAgain) return false;
        }

        // Hard denial: iOS won't surface the system prompt again, so the
        // only route back to a grant is the app's Settings page.
        Alert.alert(
            isCamera
                ? t("permissions.camera_title")
                : t("permissions.library_title"),
            isCamera
                ? t("permissions.camera_body")
                : t("permissions.library_body"),
            [
                { text: t("common.cancel"), style: "cancel" },
                {
                    text: t("permissions.open_settings"),
                    onPress: () => Linking.openSettings(),
                },
            ],
        );
        return false;
    };

    const pickImage = async (source: "camera" | "gallery" = "gallery") => {
        if (!(await ensurePermission(source))) return null;

        const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1, // keep raw quality from the picker; we downscale ourselves
        };

        const result =
            source === "camera"
                ? await ImagePicker.launchCameraAsync(options)
                : await ImagePicker.launchImageLibraryAsync(options);

        if (result.canceled || !result.assets[0]) return null;

        const asset = result.assets[0];
        const resizedUri = await resizeIfNeeded(asset);

        setIsUploading(true);
        try {
            const file = await uploadImage(resizedUri);
            // Capture original dimensions so the studio can compute a
            // model-friendly aspect ratio (`16:9`, `4:5`, `1:1`, …) and
            // pass it to the backend. Without this the backend falls back
            // to a per-room default that may not match the user's photo
            // — visible as letterboxing or stretched output on PRO/MAX
            // tiers where the model honors `aspect_ratio` strictly.
            return {
                uri: resizedUri,
                fileId: file.id,
                width: asset.width ?? null,
                height: asset.height ?? null,
            };
        } finally {
            setIsUploading(false);
        }
    };

    return { pickImage, isUploading };
}

/**
 * Reduce a width×height pair to the closest aspect-ratio string that
 * Replicate's FLUX models accept ("1:1", "16:9", "4:5", "3:4", "9:16").
 *
 * We snap to a small set of canonical ratios rather than emit the raw
 * `Math.round(w/h)` because:
 *   1. FLUX's `aspect_ratio` parameter is an enum on most versions —
 *      arbitrary values are silently coerced to "1:1".
 *   2. Trim/letterbox artifacts only show when the chosen ratio diverges
 *      from the source by more than ~5%. Snapping to the nearest of 5
 *      canonical bands keeps the output proportional to the input
 *      without leaking decimals into the request body.
 */
export function aspectRatioFor(
    width: number | null | undefined,
    height: number | null | undefined,
): string | undefined {
    if (!width || !height || width <= 0 || height <= 0) return undefined;
    const r = width / height;
    const candidates: Array<[number, string]> = [
        [1.0, "1:1"],
        [16 / 9, "16:9"],
        [9 / 16, "9:16"],
        [4 / 5, "4:5"],
        [3 / 4, "3:4"],
        [4 / 3, "4:3"],
    ];
    let best = candidates[0];
    let bestDelta = Math.abs(r - best[0]);
    for (let i = 1; i < candidates.length; i++) {
        const d = Math.abs(r - candidates[i][0]);
        if (d < bestDelta) {
            best = candidates[i];
            bestDelta = d;
        }
    }
    return best[1];
}

/**
 * Downscale if the asset's longest edge exceeds MAX_EDGE_PX. Camera
 * captures (especially on newer iPhones) commonly come in at 4032×3024 —
 * uploading that raw burns bandwidth and slows Replicate's image fetch.
 *
 * The manipulator is skipped entirely when the image is already within
 * limits, so small images (re-picked outputs, already-resized galleries)
 * don't take the re-encode cost.
 */
async function resizeIfNeeded(
    asset: ImagePicker.ImagePickerAsset,
): Promise<string> {
    const { width, height, uri } = asset;
    if (!width || !height) return uri;
    const longest = Math.max(width, height);
    if (longest <= MAX_EDGE_PX) return uri;

    const targetWidth =
        width >= height ? MAX_EDGE_PX : Math.round((width / height) * MAX_EDGE_PX);
    const targetHeight =
        height > width ? MAX_EDGE_PX : Math.round((height / width) * MAX_EDGE_PX);

    try {
        const manipulated = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: targetWidth, height: targetHeight } }],
            {
                compress: JPEG_QUALITY,
                format: ImageManipulator.SaveFormat.JPEG,
            },
        );
        return manipulated.uri;
    } catch {
        // If manipulator fails (rare), fall back to the original — better
        // than blocking the user's upload.
        return uri;
    }
}
