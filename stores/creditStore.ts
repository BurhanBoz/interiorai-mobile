import { create } from "zustand";
import * as creditsService from "@/services/credits";

interface CreditState {
    balance: number;
    monthlyLimit: number;
    planCode: string;
    fetchBalance: () => Promise<void>;
    canAfford: (cost: number) => boolean;
}

export const useCreditStore = create<CreditState>((set, get) => ({
    balance: 0,
    monthlyLimit: 0,
    planCode: "FREE",

    fetchBalance: async () => {
        const data = await creditsService.getBalance();
        set({
            balance: data.balance,
            monthlyLimit: data.monthlyLimit,
            planCode: data.planCode,
        });
    },

    canAfford: (cost) => get().balance >= cost,
}));
