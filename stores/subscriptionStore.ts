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
    creditPackBonusPct: number;
    fetchSubscription: () => Promise<void>;
    fetchPlans: () => Promise<void>;
    isFeatureEnabled: (featureCode: string) => boolean;
    hasPermission: (key: PlanPermissionKey) => boolean;
    getCreditCost: (featureCode: string, qualityTier: string, numOutputs: number) => number;
    /**
     * Wipe in-memory subscription state. Called by {@code authStore.logout}
     * so the next user signing in on the same device doesn't see the previous
     * user's plan + permissions in the UI before the API roundtrip lands.
     */
    reset: () => void;
}

// NOTE: not `as const` — Zustand's setState wants mutable arrays/objects to
// match SubscriptionState's mutable types. Using a getter-style factory keeps
// each reset call isolated (no shared array reference across resets).
const initialSubscriptionState = (): Pick<
    SubscriptionState,
    "subscription" | "plans" | "features" | "creditRules" | "permissions" | "creditPackBonusPct"
> => ({
    subscription: null,
    plans: null,
    features: [],
    creditRules: [],
    permissions: {},
    creditPackBonusPct: 0,
});

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
    ...initialSubscriptionState(),

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
            creditPackBonusPct: plan?.creditPackBonusPct ?? 0,
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

    reset: () => set(initialSubscriptionState()),
}));
