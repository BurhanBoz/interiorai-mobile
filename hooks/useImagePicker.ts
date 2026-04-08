import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { uploadImage } from "@/services/files";

export function useImagePicker() {
    const [isUploading, setIsUploading] = useState(false);

    const pickImage = async (source: "camera" | "gallery" = "gallery") => {
        const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.9,
        };

        const result =
            source === "camera"
                ? await ImagePicker.launchCameraAsync(options)
                : await ImagePicker.launchImageLibraryAsync(options);

        if (result.canceled || !result.assets[0]) return null;

        const asset = result.assets[0];
        setIsUploading(true);
        try {
            const file = await uploadImage(asset.uri);
            return { uri: asset.uri, fileId: file.id };
        } finally {
            setIsUploading(false);
        }
    };

    return { pickImage, isUploading };
}
