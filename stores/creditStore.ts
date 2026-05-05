import { create } from "zustand";
import * as creditsService from "@/services/credits";

interface CreditState {
    balance: number;
    monthlyLimit: number;
    planCode: string;
    /**
     * V20 / Pricing Strategy V2 — welcome bonus expiry (server-evaluated).
     * ISO-8601 string mirrored from the backend's `welcomeBonusExpiresAt`.
     * Drives the trial banner + countdown in studio header. Null when the
     * user is past the trial or never had one.
     */
    welcomeBonusExpiresAt: string | null;
    welcomeBonusActive: boolean;
    fetchBalance: () => Promise<void>;
    canAfford: (cost: number) => boolean;
}

export const useCreditStore = create<CreditState>((set, get) => ({
    balance: 0,
    monthlyLimit: 0,
    planCode: "FREE",
    welcomeBonusExpiresAt: null,
    welcomeBonusActive: false,

    fetchBalance: async () => {
        const data = await creditsService.getBalance();
        set({
            balance: data.balance,
            monthlyLimit: data.monthlyLimit,
            planCode: data.planCode,
            welcomeBonusExpiresAt: data.welcomeBonusExpiresAt ?? null,
            welcomeBonusActive: data.welcomeBonusActive ?? false,
        });
    },

    canAfford: (cost) => get().balance >= cost,
}));
