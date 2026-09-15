import api from "./api";
import type { FurnitureItem } from "@/types/api";

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
};
