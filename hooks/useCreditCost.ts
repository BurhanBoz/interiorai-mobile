import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useStudioStore } from "@/stores/studioStore";

export function useCreditCost() {
    const getCreditCost = useSubscriptionStore((s) => s.getCreditCost);
    const { mode, qualityTier, numOutputs } = useStudioStore();

    const featureCodeMap: Record<string, string> = {
        REDESIGN: "INTERIOR_REDESIGN",
        EMPTY_ROOM: "EMPTY_ROOM",
        INPAINT: "INPAINT",
        STYLE_TRANSFER: "STYLE_TRANSFER",
    };

    const featureCode = featureCodeMap[mode] ?? "INTERIOR_REDESIGN";
    const cost = getCreditCost(featureCode, qualityTier, numOutputs);

    return { cost, featureCode };
}
