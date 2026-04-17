import api from "./api";
import type { PageResponse, GalleryItem } from "@/types/api";

export async function getGallery(page = 0, size = 20): Promise<PageResponse<GalleryItem>> {
    const { data } = await api.get<PageResponse<GalleryItem>>("/api/gallery", {
        params: { page, size },
    });
    return data;
}
