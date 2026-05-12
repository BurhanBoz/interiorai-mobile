import { useMemo } from "react";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore, type PlanPermissionKey } from "@/stores/subscriptionStore";
import type { PlanFeatureResponse, PlanCreditRuleResponse } from "@/types/api";

/**
 * Welcome-bonus-aware entitlement helpers.
 *
 * <h3>Why these hooks exist (V20 / Pricing Strategy V2 §2)</h3>
 *
 * <p>During the 7-day welcome bonus, the backend treats the user as a MAX
 * subscriber across FIVE override sites:
 * <ol>
 *   <li>Model routing — FLUX 1.1 Pro Ultra</li>
 *   <li>Permission enforcement — all plan flags ON</li>
 *   <li>Watermark suppression — no overlay</li>
 *   <li>Feature gating — all features enabled (STYLE_TRANSFER, INPAINT, etc.)</li>
 *   <li>Credit pricing — MAX-tier rules</li>
 * </ol>
 *
 * <p>The {@code SubscriptionEntity} row still says FREE (welcome bonus is a
 * <i>wallet</i>-level grant, not a subscription change). Mobile UI must
 * mirror the override or features will appear locked despite working
 * server-side.
 *
 * <p>These hooks are the single source of truth — any gating UI must pull
 * from here, not from {@code subscriptionStore} directly.
 */

const MAX_PLAN_CODE = "MAX" as const;
const FREE_PLAN_CODE = "FREE" as const;

type EffectiveTier = "FREE" | "BASIC" | "PRO" | "MAX";

/**
 * Effective plan code — what the user FEELS like, accounting for trial.
 *
 * <p>Single source of truth for hardcoded plan-code gating (e.g.
 * {@code if (planCode === "MAX")}). All such checks should route through
 * this hook, not {@code subscription.planCode} directly, or trial users
 * will see locked features.
 */
export function useEffectivePlanCode(): EffectiveTier {
    const planCode = useSubscriptionStore((s) => s.subscription?.planCode);
    const welcomeBonusActive = useCreditStore((s) => s.welcomeBonusActive);
    if (welcomeBonusActive) return MAX_PLAN_CODE;
    const code = (planCode ?? FREE_PLAN_CODE).toUpperCase();
    return code === "BASIC" || code === "PRO" || code === "MAX" ? (code as EffectiveTier) : FREE_PLAN_CODE;
}

/**
 * Effective credit-pricing rules. During trial, returns MAX plan's
 * {@code plan_credit_rules} so cost calculations match what backend
 * actually charges (FLUX-tier render = 1cr in MAX rules, not 3-4cr as in
 * FREE/BASIC). The result is memoised so consumers can pass it straight
 * into {@code .find}/{@code .filter} without re-rendering on every keypress.
 */
export function useEffectiveCreditRules(): PlanCreditRuleResponse[] {
    const ownRules = useSubscriptionStore((s) => s.creditRules);
    const plans = useSubscriptionStore((s) => s.plans);
    const welcomeBonusActive = useCreditStore((s) => s.welcomeBonusActive);

    return useMemo(() => {
        if (welcomeBonusActive) {
            const maxPlan = plans?.find((p) => p.code === MAX_PLAN_CODE);
            return maxPlan?.creditRules ?? ownRules;
        }
        return ownRules;
    }, [welcomeBonusActive, plans, ownRules]);
}

/**
 * Effective feature list. During trial, returns MAX plan's
 * {@code plan_features} so every gated feature
 * ({@code HD_REDESIGN}, {@code ULTRA_HD_UPSCALE}, {@code STYLE_TRANSFER},
 * {@code INPAINT}, {@code EMPTY_ROOM}) reads as enabled in the UI.
 */
export function useEffectiveFeatures(): PlanFeatureResponse[] {
    const ownFeatures = useSubscriptionStore((s) => s.features);
    const plans = useSubscriptionStore((s) => s.plans);
    const welcomeBonusActive = useCreditStore((s) => s.welcomeBonusActive);

    return useMemo(() => {
        if (welcomeBonusActive) {
            const maxPlan = plans?.find((p) => p.code === MAX_PLAN_CODE);
            return maxPlan?.features ?? ownFeatures;
        }
        return ownFeatures;
    }, [welcomeBonusActive, plans, ownFeatures]);
}

/**
 * Feature-availability check ("can the user run this feature at all?").
 * Internally uses {@link useEffectiveFeatures} so trial users always see
 * features as enabled regardless of which plan record they're attached to.
 */
export function useEntitlement(featureCode: string) {
    const features = useEffectiveFeatures();
    const planCode = useEffectivePlanCode();
    const feature = features.find((f) => f.featureCode === featureCode);
    return {
        enabled: feature?.enabled ?? false,
        planCode,
    };
}

/**
 * Plan-permission check ("does the user have this fine-grained control?").
 * All permission flags resolve to {@code true} during the welcome-bonus
 * trial — matches backend {@code PlanEntitlementServiceImpl.hasPermission}.
 */
export function usePlanPermission(key: PlanPermissionKey) {
    const permissions = useSubscriptionStore((s) => s.permissions);
    const planCode = useEffectivePlanCode();
    const welcomeBonusActive = useCreditStore((s) => s.welcomeBonusActive);
    if (welcomeBonusActive) {
        return { allowed: true, planCode };
    }
    return { allowed: permissions[key] === true, planCode };
}

/**
 * Effective AI model tier for routing-aware copy (Studio "Using FLUX 1.1 Pro").
 * Backend overrides to FLUX during trial — UI must match or the user sees
 * "ENTRY model" while actually generating with FLUX.
 */
export function useEffectiveModelTier(): "ENTRY" | "SDXL" | "FLUX" | "LITE" {
    const subscriptionTier = useSubscriptionStore((s) => s.subscription?.modelTier);
    const welcomeBonusActive = useCreditStore((s) => s.welcomeBonusActive);
    if (welcomeBonusActive) return "FLUX";
    const t = (subscriptionTier ?? "ENTRY").toUpperCase();
    return t === "SDXL" || t === "FLUX" || t === "LITE" ? (t as "SDXL" | "FLUX" | "LITE") : "ENTRY";
}

/**
 * Whether the output should be watermarked. FREE plan adds a watermark;
 * paid plans + trial users do not. Mirrors backend
 * {@code WatermarkServiceImpl.applyWatermarkIfNeeded(userId)}.
 */
export function useEffectiveWatermark(): boolean {
    const watermark = useSubscriptionStore((s) => s.subscription?.watermark);
    const welcomeBonusActive = useCreditStore((s) => s.welcomeBonusActive);
    if (welcomeBonusActive) return false;
    return watermark === true;
}
