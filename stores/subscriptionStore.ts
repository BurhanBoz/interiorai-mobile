import { create } from "zustand";
import type {
    PlanResponse,
    PlanPermissions,
    SubscriptionResponse,
    PlanFeatureResponse,
    PlanCreditRuleResponse,
} from "@/types/api";
import * as plansService from "@/services/plans";

/** Keys exposed by `plans.permissions_json`. Add new permissions here as the backend grows. */
export type PlanPermissionKey =
    | "allow_strength"
    | "allow_seed"
    | "allow_negative_prompt"
    | "allow_custom_prompt"
    | "allow_commercial_spaces"
    | "allow_reference_image"
    | "allow_mask_editing"
    | "allow_quality_mode";

interface SubscriptionState {
    subscription: SubscriptionResponse | null;
    plans: PlanResponse[] | null;
    features: PlanFeatureResponse[];
    creditRules: PlanCreditRuleResponse[];
    permissions: PlanPermissions;
    fetchSubscription: () => Promise<void>;
    fetchPlans: () => Promise<void>;
    isFeatureEnabled: (featureCode: string) => boolean;
    hasPermission: (key: PlanPermissionKey) => boolean;
    getCreditCost: (featureCode: string, qualityTier: string, numOutputs: number) => number;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
    subscription: null,
    plans: null,
    features: [],
    creditRules: [],
    permissions: {},

    fetchSubscription: async () => {
        const subscription = await plansService.getActiveSubscription();
        // Resolve the active plan from the already-fetched plan list.
        const plans = get().plans;
        const plan = plans?.find((p) => p.code === subscription.planCode);
        set({
            subscription,
            features: plan?.features ?? [],
            creditRules: plan?.creditRules ?? [],
            permissions: plan?.permissions ?? {},
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

    /**
     * Check a plan-wide permission. Missing keys default to `false` (deny-by-default)
     * so upstream code can treat an un-fetched subscription or an older plan blob as
     * the safest possible value.
     */
    hasPermission: (key) => {
        const { permissions } = get();
        return permissions[key] === true;
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
