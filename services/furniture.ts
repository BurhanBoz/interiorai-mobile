import api from "./api";
import type { FurnitureItem, SaveFurnitureInput } from "@/types/api";

/**
 * The furniture catalogue (V177).
 *
 * Note the path: /api/furniture, not /api/catalog. The catalog endpoints are
 * public and cached for an hour because room types and design styles are the
 * same for everyone; this list is not — it mixes in the caller's own saved
 * pieces, so it is authenticated and cached privately.
 */
export const furnitureService = {
    /** @param category optional filter — SOFA, CHAIR, TABLE, BED, LAMP, RUG, PLANT, STORAGE, DECOR */
    async browse(category?: string): Promise<FurnitureItem[]> {
        const { data } = await api.get<FurnitureItem[]>("/api/furniture", {
            params: category ? { category } : undefined,
        });
        return data;
    },

    /**
     * Save a photographed piece as a personal catalogue item (V178).
     *
     * Returns 202: the row exists but is INACTIVE until the background-removal
     * job lands, so the piece will not appear in browse() straight away. That
     * is deliberate — a piece still wearing the room it was photographed in
     * drags that room's lighting into every design it joins.
     */
    async save(input: SaveFurnitureInput): Promise<FurnitureItem> {
        const { data } = await api.post<FurnitureItem>("/api/furniture/items", input);
        return data;
    },
};
