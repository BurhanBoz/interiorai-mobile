import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useStudioStore } from "@/stores/studioStore";
import { resolveFeatureCode } from "@/utils/featureCode";

/**
 * Resolves the correct feature_code based on both mode AND quality tier —
 * REDESIGN + HD/ULTRA_HD maps to HD_REDESIGN (see utils/featureCode.ts for
 * the V25 schema split rationale). A previous version hardcoded the mode
 * mapping and returned the wrong cost for HD jobs because the credit rule
 * lives under a different feature_code than the one being queried.
 */
export function useCreditCost() {
    const getCreditCost = useSubscriptionStore((s) => s.getCreditCost);
    const { mode, qualityTier, numOutputs } = useStudioStore();

    const featureCode = resolveFeatureCode(mode, qualityTier);
    const cost = getCreditCost(featureCode, qualityTier, numOutputs);

    return { cost, featureCode };
}
