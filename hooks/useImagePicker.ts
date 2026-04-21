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
            return { uri: resizedUri, fileId: file.id };
        } finally {
            setIsUploading(false);
        }
    };

    return { pickImage, isUploading };
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
