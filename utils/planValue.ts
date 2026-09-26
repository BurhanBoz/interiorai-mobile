import type { PlanResponse } from "@/types/api";

/**
 * What a plan's credits buy, in units a person has a feel for (2.0.0).
 *
 * <p>The 19 September paywall left credit counts out on purpose — "credits are
 * the unit the user has no feel for". True, and the answer is to translate
 * them, not to hide them: "100 credits a week ≈ 20 designs or 6 room videos"
 * is a claim someone can weigh against a price.
 *
 * <p>Every number comes from the plan the server sends — its allowance and its
 * own credit rules — so a price change on the server is a copy change here,
 * never a stale promise.
 */
export interface PlanValue {
    credits: number;
    /** WEEKLY plans grant per week; the monthly and yearly ones per month. */
    period: "week" | "month";
    designs: number | null;
    videos: number | null;
    hasVideo: boolean;
    hasStyleTransfer: boolean;
    hasOutdoor: boolean;
}

/** One design = a standard, single-output Redesign — the app's most common job. */
function costOf(plan: PlanResponse, feature: string): number | null {
    const rule = plan.creditRules?.find(
        (r) => r.featureCode === feature && (r.numOutputs === 1 || r.numOutputs == null)
            && (r.qualityTier === "STANDARD" || !r.qualityTier),
    );
    if (rule && rule.creditCost > 0) return rule.creditCost;
    const f = plan.features?.find((x) => x.featureCode === feature);
    return f?.creditsPerUse && f.creditsPerUse > 0 ? f.creditsPerUse : null;
}

function enabled(plan: PlanResponse, feature: string): boolean {
    return !!plan.features?.find((f) => f.featureCode === feature && f.enabled);
}

/** How many of each a credit balance buys under this plan's prices. */
export function creditsBuy(plan: PlanResponse | null | undefined, credits: number) {
    if (!plan || credits <= 0) return { designs: null as number | null, videos: null as number | null };
    const design = costOf(plan, "INTERIOR_REDESIGN");
    const video = enabled(plan, "ROOM_VIDEO") ? costOf(plan, "ROOM_VIDEO") : null;
    return {
        designs: design ? Math.floor(credits / design) : null,
        videos: video ? Math.floor(credits / video) : null,
    };
}

export function planValue(plan: PlanResponse | null | undefined): PlanValue | null {
    if (!plan || !(plan.monthlyCredits > 0)) return null;
    const buys = creditsBuy(plan, plan.monthlyCredits);
    return {
        credits: plan.monthlyCredits,
        period: plan.billingPeriod === "WEEKLY" ? "week" : "month",
        designs: buys.designs,
        videos: buys.videos,
        hasVideo: enabled(plan, "ROOM_VIDEO"),
        hasStyleTransfer: enabled(plan, "STYLE_TRANSFER"),
        hasOutdoor: enabled(plan, "OUTDOOR_DESIGN"),
    };
}
