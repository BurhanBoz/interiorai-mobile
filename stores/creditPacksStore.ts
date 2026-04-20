import { create } from "zustand";
import * as creditPacksService from "@/services/creditPacks";
import * as iap from "@/services/iap";
import { useCreditStore } from "./creditStore";
import type { CreditPackResponse, CreditPackPurchaseResponse } from "@/types/api";

interface CreditPacksState {
    packs: CreditPackResponse[];
    loading: boolean;
    purchasing: string | null;
    lastPurchase: CreditPackPurchaseResponse | null;
    error: string | null;

    fetchPacks: () => Promise<void>;
    purchase: (packCode: string) => Promise<CreditPackPurchaseResponse>;
    clearError: () => void;
}

export const useCreditPacksStore = create<CreditPacksState>((set) => ({
    packs: [],
    loading: false,
    purchasing: null,
    lastPurchase: null,
    error: null,

    fetchPacks: async () => {
        set({ loading: true, error: null });
        try {
            const packs = await creditPacksService.listCreditPacks();
            set({ packs, loading: false });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to load credit packs";
            set({ error: message, loading: false });
        }
    },

    purchase: async (packCode) => {
        set({ purchasing: packCode, error: null });
        try {
            const result = await iap.purchasePack(packCode);
            // Sync local balance with the server-authoritative newBalance.
            useCreditStore.setState({ balance: result.newBalance });
            set({ purchasing: null, lastPurchase: result });
            return result;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Purchase failed";
            set({ purchasing: null, error: message });
            throw e;
        }
    },

    clearError: () => set({ error: null }),
}));
