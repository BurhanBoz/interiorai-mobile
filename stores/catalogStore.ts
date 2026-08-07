import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRoomTypes, getDesignStyles } from "@/services/catalog";
import type { CatalogItemResponse } from "@/types/api";

/**
 * Room types and design styles, cached across launches.
 *
 * <p>Before this store the style screen re-fetched both lists on every entry
 * and showed a spinner while it waited — for data that only changes when a
 * Flyway migration ships. Users pay that wait on the way to every single
 * generation, which is the worst possible place to put a spinner.
 *
 * <p><b>Stale-while-revalidate.</b> {@link ensureLoaded} paints from the
 * persisted copy immediately and refreshes in the background, so the screen
 * is instant on the second launch and still picks up a newly deployed room
 * type on the next open. `isLoading` is therefore true only when there is
 * genuinely nothing to show — a first run, or a wiped install.
 *
 * <p>Fetch failures are swallowed on purpose: a network blip must leave the
 * user with the catalogue they already have, not an empty picker.
 */

/** Refresh in the background once the cached copy is older than this. */
const STALE_AFTER_MS = 60 * 60 * 1000; // 1h — matches the server's Cache-Control

interface CatalogState {
    roomTypes: CatalogItemResponse[];
    designStyles: CatalogItemResponse[];
    /** Epoch ms of the last successful fetch; null when never fetched. */
    fetchedAt: number | null;
    /** True only when there is nothing cached to render. */
    isLoading: boolean;
    /** Paint from cache, refresh if stale. Safe to call on every screen focus. */
    ensureLoaded: () => Promise<void>;
    /** Force a refetch — used after a locale change, which re-labels the lists. */
    refresh: () => Promise<void>;
}

export const useCatalogStore = create<CatalogState>()(
    persist(
        (set, get) => {
            const fetchNow = async () => {
                try {
                    const [roomTypes, designStyles] = await Promise.all([
                        getRoomTypes(),
                        getDesignStyles(),
                    ]);
                    set({ roomTypes, designStyles, fetchedAt: Date.now(), isLoading: false });
                } catch {
                    // Keep whatever we already have; only stop the spinner.
                    set({ isLoading: false });
                }
            };

            return {
                roomTypes: [],
                designStyles: [],
                fetchedAt: null,
                isLoading: false,

                ensureLoaded: async () => {
                    const { roomTypes, fetchedAt } = get();
                    const hasData = roomTypes.length > 0;
                    const stale = fetchedAt == null || Date.now() - fetchedAt > STALE_AFTER_MS;
                    if (!hasData) {
                        set({ isLoading: true });
                        await fetchNow();
                        return;
                    }
                    if (stale) {
                        // Deliberately un-awaited: the screen is already
                        // painted from cache and must not wait on the network.
                        void fetchNow();
                    }
                },

                refresh: fetchNow,
            };
        },
        {
            name: "catalog-store",
            storage: createJSONStorage(() => AsyncStorage),
            version: 1,
            // Never persist the transient flag — a launch that died mid-fetch
            // would otherwise rehydrate stuck in a loading state.
            partialize: (s) => ({
                roomTypes: s.roomTypes,
                designStyles: s.designStyles,
                fetchedAt: s.fetchedAt,
            }),
        },
    ),
);
