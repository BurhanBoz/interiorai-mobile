import { create } from "zustand";
import { fetchStorePrices } from "@/services/iap";
import type { StorePriceMap } from "@/utils/price";

/**
 * Storefront-localized prices (StoreKit via RevenueCat), keyed by Apple
 * product id. THE source every screen reads money strings from — see
 * utils/price.ts for the resolution contract (store-first, backend-USD
 * fallback while this map is empty).
 *
 * <p>Hydrated once after {@code initializeIAP} at boot (app/_layout.tsx) so
 * the paywall opens with local prices already in memory; screens also call
 * {@link hydrate} on mount as a retry path for boots that raced an offline
 * window. Idempotent: concurrent/repeat calls are collapsed, a successful
 * load is never re-fetched (App Store prices don't change mid-session).
 */
interface StorePricesState {
    prices: StorePriceMap;
    status: "idle" | "loading" | "ready" | "error";
    hydrate: () => Promise<void>;
}

export const useStorePricesStore = create<StorePricesState>((set, get) => ({
    prices: {},
    status: "idle",

    hydrate: async () => {
        const { status } = get();
        if (status === "loading" || status === "ready") return;
        set({ status: "loading" });
        try {
            const prices = await fetchStorePrices();
            set({ prices, status: "ready" });
        } catch (e) {
            // Screens keep rendering the backend-USD fallback; the next
            // paywall mount retries via this same guard.
            console.warn("[STORE-PRICES] hydrate failed, USD fallback stays active:", e);
            set({ status: "error" });
        }
    },
}));
