import api from "./api";
import type { CatalogItemResponse, SeasonResponse } from "@/types/api";

export async function getRoomTypes(category?: string): Promise<CatalogItemResponse[]> {
    const params = category ? { category } : {};
    const { data } = await api.get<CatalogItemResponse[]>("/api/catalog/room-types", { params });
    return data;
}

export async function getDesignStyles(): Promise<CatalogItemResponse[]> {
    const { data } = await api.get<CatalogItemResponse[]>("/api/catalog/design-styles");
    return data;
}

/**
 * The seasonal mode's themes (2.5.0). Empty when no season is on — the Studio
 * then hides the "Cozy Christmas" tile, so a season ends server-side without
 * a release.
 */
export async function getSeasonalThemes(): Promise<CatalogItemResponse[]> {
    const { data } = await api.get<CatalogItemResponse[]>("/api/catalog/seasonal-themes");
    return data;
}

/**
 * The open seasons with their themes (V202, build 114): the Studio draws one
 * tile per season from this, the first as the hero. Empty = no season = no tile.
 */
export async function getSeasons(): Promise<SeasonResponse[]> {
    const { data } = await api.get<SeasonResponse[]>("/api/catalog/seasons");
    return data;
}
