import api from "./api";
import type { CatalogItemResponse } from "@/types/api";

export async function getRoomTypes(category?: string): Promise<CatalogItemResponse[]> {
    const params = category ? { category } : {};
    const { data } = await api.get<CatalogItemResponse[]>("/api/catalog/room-types", { params });
    return data;
}

export async function getDesignStyles(): Promise<CatalogItemResponse[]> {
    const { data } = await api.get<CatalogItemResponse[]>("/api/catalog/design-styles");
    return data;
}
