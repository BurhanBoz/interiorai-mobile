import api from "./api";
import type { FileResponse } from "@/types/api";

export async function uploadImage(uri: string): Promise<FileResponse> {
    const formData = new FormData();
    const filename = uri.split("/").pop() ?? "photo.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
        uri,
        name: filename,
        type,
    } as any);

    const { data } = await api.post<FileResponse>("/api/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
}

export async function getFile(fileId: string): Promise<FileResponse> {
    const { data } = await api.get<FileResponse>(`/api/files/${fileId}`);
    return data;
}
