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
    flatRateApplies: boolean;
    fetchBalance: () => Promise<void>;
    canAfford: (cost: number) => boolean;
    /**
     * Wipe in-memory credit state. Called by {@code authStore.logout} so the
     * next user signing in on the same device doesn't briefly see the previous
     * user's balance. The next {@code fetchBalance} re-populates from the API.
     */
    reset: () => void;
}

const initialCreditState = (): Pick<
    CreditState,
    "balance" | "monthlyLimit" | "planCode" | "welcomeBonusExpiresAt" | "welcomeBonusActive"
    | "flatRateApplies"
> => ({
    balance: 0,
    monthlyLimit: 0,
    planCode: "FREE",
    welcomeBonusExpiresAt: null,
    welcomeBonusActive: false,
    flatRateApplies: true,
});

export const useCreditStore = create<CreditState>((set, get) => ({
    ...initialCreditState(),

    fetchBalance: async () => {
        const data = await creditsService.getBalance();
        set({
            balance: data.balance,
            monthlyLimit: data.monthlyLimit,
            planCode: data.planCode,
            welcomeBonusExpiresAt: data.welcomeBonusExpiresAt ?? null,
            welcomeBonusActive: data.welcomeBonusActive ?? false,
            // Default true: an unknown balance is safest read as FREE, which
            // shows the lower number rather than promising a discount.
            flatRateApplies: data.flatRateApplies ?? true,
        });
    },

    canAfford: (cost) => get().balance >= cost,

    reset: () => set(initialCreditState()),
}));
