import { useState } from "react";
import { Alert, Linking } from "react-native";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Asset } from "expo-asset";
import { uploadImage } from "@/services/files";
import { useAiConsentStore } from "@/stores/aiConsentStore";

// Upload-side cap: iPhone photos can be 8-12 MB at 4032×3024; S3 PUT is
// metered and Replicate pulls the image each prediction, so downscaling
// cuts bandwidth 5-8× with no perceptible loss.
//
// 1800/0.82 measured against a real 3456×5184 photo (2026-09-08):
// 2048/0.85 → 1070 KB, 1800/0.82 → 786 KB, a 27% cut. The floor is the
// model, not the eye: STANDARD renders at 2 MP / 1680 px wide (V69), so
// an input below 1680 would hand the model less detail than it outputs.
// 1600/0.80 tested at 557 KB and was rejected for exactly that reason.
const MAX_EDGE_PX = 1800;
const JPEG_QUALITY = 0.82;

/**
 * Retry only what a retry can fix: no response at all (network drop,
 * timeout) or a server-side 5xx. A 4xx is a verdict — auth, file size,
 * media type — and the second attempt would earn the same answer.
 */
const isRetriableUploadError = (err: unknown): boolean => {
    const status = (err as { response?: { status?: number } })?.response?.status;
    return status === undefined || status >= 500;
};

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
        // App Store 5.1.2(i): before ANY photo leaves the device we must
        // disclose what is sent and to whom, and get explicit consent.
        // Every upload flow (redesign, empty room, Magic Edit, Style
        // Transfer reference) funnels through this hook, so this single
        // gate covers them all. Asked once, persisted; declining aborts.
        if (!(await useAiConsentStore.getState().request())) return null;

        if (!(await ensurePermission(source))) return null;

        const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            // No iOS crop step (2026-07-13 founder call): the frame UI made
            // users think they had to cut their photo, and the models want
            // the WHOLE room anyway — aspectRatioFor() already derives the
            // model ratio from the full image, and generation quality is
            // higher with more scene context. Camera keeps its native
            // "Use Photo" confirmation; gallery picks return immediately.
            allowsEditing: false,
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
            // A dropped upload used to vanish. uploadImage would reject,
            // not one of the five call sites had a catch, and the
            // rejection died as an unhandled promise: spinner off, no
            // message, no retry, nothing to tap. A real user on a
            // 0.76 Mbit/s link (2026-09-08) lost a 1 MB photo at 96%
            // after 10.8 s and left the app five seconds later — the
            // whole session, gone to a silent failure. Uploads fail ~1%
            // overall but far more on the slow mobile links our largest
            // ad cohort arrives on. So: one automatic retry, then a
            // visible message, and null — the value every call site
            // already handles, since consent, permission and cancel all
            // return it too.
            let file;
            try {
                file = await uploadImage(resizedUri);
            } catch (err) {
                if (!isRetriableUploadError(err)) throw err;
                file = await uploadImage(resizedUri);
            }
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
        } catch {
            Alert.alert(
                t("errors.upload_failed_title"),
                t("errors.upload_failed_body"),
            );
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    /**
     * Put a bundled sample room through the exact same pipeline a picked
     * photo goes through — consent, downscale, upload, one retry, the same
     * `{uri, fileId, width, height}` on the way out.
     *
     * <p>Deliberately NOT a preview path. The user is going to spend a credit
     * and judge the product on what comes back, so what comes back has to be a
     * real render of that room; a mocked result would be a different product
     * from the one they are being asked to trust.
     *
     * <p>What it skips is the part that costs us people: the OS photo-library
     * dialog and the hunt through their camera roll. The AI consent sheet
     * still runs — the image reaches the same third parties either way, and
     * two consent paths is exactly how a compliance gap starts.
     */
    const useSampleImage = async (module: number) => {
        if (!(await useAiConsentStore.getState().request())) return null;

        setIsUploading(true);
        try {
            // Bundled assets are module ids, not files. downloadAsync resolves
            // one to a real localUri — a no-op for an asset already inside the
            // binary, a fetch when Metro is serving it in development.
            const asset = Asset.fromModule(module);
            await asset.downloadAsync();
            const uri = asset.localUri ?? asset.uri;

            const resizedUri = await resizeIfNeeded(
                {
                    uri,
                    width: asset.width ?? 0,
                    height: asset.height ?? 0,
                } as ImagePicker.ImagePickerAsset,
                true, // samples ship as PNG — always re-encode
            );

            let file;
            try {
                file = await uploadImage(resizedUri);
            } catch (err) {
                if (!isRetriableUploadError(err)) throw err;
                file = await uploadImage(resizedUri);
            }
            return {
                uri: resizedUri,
                fileId: file.id,
                width: asset.width ?? null,
                height: asset.height ?? null,
            };
        } catch {
            Alert.alert(
                t("errors.upload_failed_title"),
                t("errors.upload_failed_body"),
            );
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    return { pickImage, useSampleImage, isUploading };
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
    /**
     * Re-encode even when the image is already small enough.
     *
     * <p>For the bundled samples: they ship as PNG, and PNG of a photograph
     * is enormous — the living room is 896×1152 and 1.7 MB, well under the
     * pixel cap and so left untouched by the size test alone. A sample exists
     * to make the first try cheap, and 1.7 MB over a slow link is the exact
     * failure we already watched cost a user their session. JPEG at the same
     * dimensions is a fraction of that.
     */
    alwaysEncode = false,
): Promise<string> {
    const { width, height, uri } = asset;
    if (!width || !height) return uri;
    const longest = Math.max(width, height);
    if (longest <= MAX_EDGE_PX && !alwaysEncode) return uri;

    // Already inside the cap and only here to be re-encoded: keep the
    // dimensions, change the container.
    const scale = longest <= MAX_EDGE_PX ? longest : MAX_EDGE_PX;
    const targetWidth =
        width >= height ? scale : Math.round((width / height) * scale);
    const targetHeight =
        height > width ? scale : Math.round((height / width) * scale);

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
