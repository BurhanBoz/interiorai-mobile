import { useStudioStore } from "@/stores/studioStore";
import { useCreditStore } from "@/stores/creditStore";
import { useEffectiveCreditRules, useEffectiveFeatures } from "@/hooks/useEntitlement";
import { resolveFeatureCode } from "@/utils/featureCode";

/**
 * What this generation is about to cost, in the credits the backend will
 * actually take.
 *
 * <p>It mirrors PlanEntitlementServiceImpl + JobServiceImpl step 5 in the
 * same order they run: a plan rule if one matches, otherwise the feature's
 * base price plus one per extra variant, then +1 per extra reference image
 * or catalogue piece, then the FREE flat rate.
 *
 * <p><b>The fallback is not a fallback.</b> plan_credit_rules is empty in
 * production, so no rule ever matches and the feature's own creditsPerUse IS
 * the price. Without it this hook returned {@code 0 + extraRefCount}: a plain
 * redesign displayed as free, and a redesign with two catalogue pieces
 * displayed as 2 when the charge was 1. The number on screen was the
 * reference count wearing a credit label.
 *
 * <p><b>Why flatRateApplies comes from the server.</b> It depends on the
 * plan, on the trial window, and on whether a bought pack is still held —
 * three facts the client would have to reassemble and keep in step. It is
 * one boolean on the balance response, evaluated by the same predicate that
 * charges (JobServiceImpl.freeFlatRateApplies). This file has drifted from
 * the backend before; that is the drift being designed out.
 *
 * <p>Resolves the feature code from mode AND quality tier — REDESIGN with
 * HD/ULTRA_HD maps to HD_REDESIGN, which is priced under a different code
 * (V25 schema split, see utils/featureCode.ts).
 */
export function useCreditCost() {
    const rules = useEffectiveCreditRules();
    const features = useEffectiveFeatures();
    const flatRateApplies = useCreditStore((s) => s.flatRateApplies);
    const { mode, qualityTier, numOutputs, extraStyleRefs, objectRefs } = useStudioStore();

    const featureCode = resolveFeatureCode(mode, qualityTier);

    const rule = rules.find(
        (r) =>
            r.featureCode === featureCode &&
            r.qualityTier === qualityTier &&
            r.numOutputs === numOutputs,
    );

    // orElse(1) matches the backend's own default for an unknown feature:
    // fail expensive, never free.
    const perUse = features.find((f) => f.featureCode === featureCode)?.creditsPerUse ?? 1;
    const base = rule?.creditCost ?? perUse + Math.max(numOutputs - 1, 0);

    const extraRefCount = extraStyleRefs.length + objectRefs.length;
    const raw = base + extraRefCount;

    return { cost: flatRateApplies && raw > 1 ? 1 : raw, featureCode };
}
