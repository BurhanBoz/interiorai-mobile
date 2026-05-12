import { useStudioStore } from "@/stores/studioStore";
import { useEffectiveCreditRules } from "@/hooks/useEntitlement";
import { resolveFeatureCode } from "@/utils/featureCode";

/**
 * Resolves the correct feature_code based on both mode AND quality tier —
 * REDESIGN + HD/ULTRA_HD maps to HD_REDESIGN (see utils/featureCode.ts for
 * the V25 schema split rationale). A previous version hardcoded the mode
 * mapping and returned the wrong cost for HD jobs because the credit rule
 * lives under a different feature_code than the one being queried.
 *
 * <p><b>Welcome bonus override:</b> uses {@link useEffectiveCreditRules}
 * so during the 7-day trial the cost is calculated against MAX plan's
 * {@code plan_credit_rules}, matching what the backend actually charges.
 * Without this, trial users would see FREE plan's pricing (1cr/render)
 * while backend bills against the MAX tier rule (3-4cr).
 */
export function useCreditCost() {
    const rules = useEffectiveCreditRules();
    const { mode, qualityTier, numOutputs } = useStudioStore();

    const featureCode = resolveFeatureCode(mode, qualityTier);
    const rule = rules.find(
        (r) =>
            r.featureCode === featureCode &&
            r.qualityTier === qualityTier &&
            r.numOutputs === numOutputs,
    );
    return { cost: rule?.creditCost ?? 0, featureCode };
}
