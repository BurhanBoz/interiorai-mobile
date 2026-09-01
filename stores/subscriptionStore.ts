import { create } from "zustand";
import { planTier, isAnnualPlan } from "@/utils/planTier";
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
    /**
     * True once the first {@link fetchSubscription} has SETTLED — succeeded or
     * failed, either way we are no longer guessing.
     *
     * <p>Without this, `subscription === null` means two different things at
     * once: "not fetched yet" and "no subscription". Any gate reading it during
     * boot would show a paywall to a paying customer for as long as the request
     * took. The flag is the difference between an absence and an answer.
     */
    subscriptionResolved: boolean;
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
    | "subscription"
    | "subscriptionResolved"
    | "plans"
    | "features"
    | "creditRules"
    | "permissions"
    | "creditPackBonusPct"
> => ({
    subscription: null,
    subscriptionResolved: false,
    plans: null,
    features: [],
    creditRules: [],
    permissions: {},
    creditPackBonusPct: 0,
});

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
    ...initialSubscriptionState(),

    fetchSubscription: async () => {
        // Marked resolved on EVERY exit, including the throwing one — a gate
        // waiting on this must not hang because the network did.
        try {
        const subscription = await plansService.getActiveSubscription();
        // Resolve the active plan from the already-fetched plan list.
        const plans = get().plans;
        // Resolve the subscriber's plan record. Exact code first; when the
        // user sits on a plan that is no longer in the ACTIVE list (e.g. a
        // *_LEGACY row after the V40 two-tier rework), fall back to the
        // active plan of the SAME normalized tier — otherwise features/
        // rules/permissions resolve empty and the UI shows 0-credit costs
        // and false locks while the backend (which reads the real plan row)
        // charges correctly. planTier maps BASIC*→BASE, PRO*/MAX*→PRO.
        const plan =
            plans?.find((p) => p.code === subscription.planCode) ??
            plans?.find(
                (p) =>
                    !isAnnualPlan(p.code) &&
                    planTier(p.code) === planTier(subscription.planCode),
            );
        set({
            subscription,
            features: plan?.features ?? [],
            creditRules: plan?.creditRules ?? [],
            permissions: plan?.permissions ?? {},
            creditPackBonusPct: plan?.creditPackBonusPct ?? 0,
        });
        } finally {
            set({ subscriptionResolved: true });
        }
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
