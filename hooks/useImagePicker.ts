import { useState } from "react";
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
    const [isUploading, setIsUploading] = useState(false);

    const pickImage = async (source: "camera" | "gallery" = "gallery") => {
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
