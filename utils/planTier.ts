/**
 * Canonical plan-code → entitlement-tier normalization.
 *
 * <p>Pricing V3 (V40, 2026-07-14): the live ladder is FREE → BASE → PRO.
 * Every plan gets the same best-in-class models; tiers differ by FEATURES
 * (BASE = redesign/HD/empty · PRO = + Magic Edit, Style Transfer, Upscale).
 *
 * <p>Codes this must survive:
 *   - Live: {@code FREE}, {@code BASE}, {@code PRO} and their billing-period
 *     forms ({@code *_WEEKLY}, {@code *_ANNUAL})
 *   - Legacy (pre-V40 sandbox subscribers, renamed rows): {@code BASIC_LEGACY},
 *     {@code PRO_LEGACY}, {@code MAX_LEGACY} and their {@code *_ANNUAL_LEGACY}
 *     forms. Legacy BASIC maps to BASE; legacy PRO/MAX map to PRO (top).
 *     Cosmetic only — real gating still comes from the backend's
 *     plan_features/permissions for whatever row the subscription points at.
 *
 * <p>Every feature gate, badge and upsell MUST branch on the normalized
 * tier via {@link planTier} / {@link tierAtLeast}, never the raw code —
 * a raw {@code === "PRO"} check would silently treat {@code PRO_ANNUAL}
 * (future) or {@code PRO_LEGACY} as FREE.
 */

export type PlanTier = "FREE" | "BASE" | "PRO";

const RANK: Record<PlanTier, number> = { FREE: 0, BASE: 1, PRO: 2 };
const ANNUAL_SUFFIX = "_ANNUAL";
const LEGACY_SUFFIX = "_LEGACY";

/**
 * Billing-period suffixes appended to a tier code (`BASE` → `BASE_WEEKLY`).
 *
 * <p>These are stripped before the tier lookup because a period says nothing
 * about entitlement — a weekly PRO subscriber is a PRO subscriber. Kept as a
 * LIST rather than a chain of ifs because this is a bug factory: V59 added
 * `_WEEKLY`, nobody taught this function about it, and every weekly
 * subscriber silently normalized to FREE — which then made
 * subscriptionStore resolve their features/permissions/credit rules from the
 * FREE row, locking Magic Edit and Style Transfer for someone who had just
 * paid (founder report, 2026-08-20). Add future periods here, not inline.
 */
const PERIOD_SUFFIXES = [ANNUAL_SUFFIX, "_WEEKLY", "_MONTHLY", "_YEARLY"];

/**
 * Map any plan code (incl. {@code *_ANNUAL}, {@code *_LEGACY}, lower/mixed
 * case, null) to its base entitlement tier. Unknown codes fall back to FREE.
 */
export function planTier(code: string | null | undefined): PlanTier {
    let base = (code ?? "FREE").toUpperCase().trim();
    if (base.endsWith(LEGACY_SUFFIX)) base = base.slice(0, -LEGACY_SUFFIX.length);
    for (const suffix of PERIOD_SUFFIXES) {
        if (base.endsWith(suffix)) {
            base = base.slice(0, -suffix.length);
            break;
        }
    }
    switch (base) {
        case "BASE":
        case "BASIC": // legacy tier ≈ today's BASE
            return "BASE";
        case "PRO":
        case "MAX": // legacy top tier → today's top
            return "PRO";
        default:
            return "FREE";
    }
}

/** True when the code is an annual SKU (used for billing-period UI only). */
export function isAnnualPlan(code: string | null | undefined): boolean {
    const c = (code ?? "").toUpperCase().trim();
    return c.endsWith(ANNUAL_SUFFIX) || c.endsWith(ANNUAL_SUFFIX + LEGACY_SUFFIX);
}

/** Numeric rank of a code's tier (FREE 0 < BASE 1 < PRO 2). */
export function tierRank(code: string | null | undefined): number {
    return RANK[planTier(code)];
}

/** True when the code's tier is at least {@code min}. */
export function tierAtLeast(
    code: string | null | undefined,
    min: PlanTier,
): boolean {
    return tierRank(code) >= RANK[min];
}
