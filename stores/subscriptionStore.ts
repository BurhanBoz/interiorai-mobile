import { create } from "zustand";
import type {
    PlanResponse,
    SubscriptionResponse,
    PlanFeatureResponse,
    PlanCreditRuleResponse,
} from "@/types/api";
import * as plansService from "@/services/plans";

interface SubscriptionState {
    subscription: SubscriptionResponse | null;
    plans: PlanResponse[] | null;
    features: PlanFeatureResponse[];
    creditRules: PlanCreditRuleResponse[];
    fetchSubscription: () => Promise<void>;
    fetchPlans: () => Promise<void>;
    isFeatureEnabled: (featureCode: string) => boolean;
    getCreditCost: (featureCode: string, qualityTier: string, numOutputs: number) => number;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
    subscription: null,
    plans: null,
    features: [],
    creditRules: [],

    fetchSubscription: async () => {
        const subscription = await plansService.getActiveSubscription();
        // Find matching plan to get features and credit rules
        const plans = get().plans;
        const plan = plans?.find((p) => p.code === subscription.planCode);
        set({
            subscription,
            features: plan?.features ?? [],
            creditRules: plan?.creditRules ?? [],
        });
    },

    fetchPlans: async () => {
        const plans = await plansService.listPlans();
        set({ plans });
    },

    isFeatureEnabled: (featureCode) => {
        const { features } = get();
        const feature = features.find((f) => f.featureCode === featureCode);
        return feature?.enabled ?? false;
    },

    getCreditCost: (featureCode, qualityTier, numOutputs) => {
        const { creditRules } = get();
        const rule = creditRules.find(
            (r) =>
                r.featureCode === featureCode &&
                r.qualityTier === qualityTier &&
                r.numOutputs === numOutputs
        );
        return rule?.creditCost ?? 0;
    },
}));
