/**
 * Canonical plan-code → entitlement-tier normalization.
 *
 * <p>Backend ships both monthly and annual SKUs as distinct plan codes:
 * {@code BASIC / BASIC_ANNUAL}, {@code PRO / PRO_ANNUAL},
 * {@code MAX / MAX_ANNUAL}. Annual variants carry the SAME entitlements,
 * model tier, permissions and credit allocation as their monthly tier
 * (verified in the {@code plans} table) — the only differences are price
 * and billing period.
 *
 * <p>Every feature gate, credit-rule lookup, badge and upsell MUST branch on
 * the <b>base tier</b>, never the raw code. Comparing {@code planCode ===
 * "PRO"} silently treats a {@code PRO_ANNUAL} subscriber as FREE (locked
 * features, FREE drip text). This module is the single source of truth so
 * that bug class cannot recur: route all plan-code branching through
 * {@link planTier} / {@link tierAtLeast}.
 */

export type PlanTier = "FREE" | "BASIC" | "PRO" | "MAX";

const RANK: Record<PlanTier, number> = { FREE: 0, BASIC: 1, PRO: 2, MAX: 3 };
const ANNUAL_SUFFIX = "_ANNUAL";

/**
 * Map any plan code (incl. {@code *_ANNUAL}, lower/mixed case, null) to its
 * base entitlement tier. Unknown codes fall back to {@code "FREE"}.
 */
export function planTier(code: string | null | undefined): PlanTier {
    const upper = (code ?? "FREE").toUpperCase().trim();
    const base = upper.endsWith(ANNUAL_SUFFIX)
        ? upper.slice(0, -ANNUAL_SUFFIX.length)
        : upper;
    return base === "BASIC" || base === "PRO" || base === "MAX"
        ? (base as PlanTier)
        : "FREE";
}

/** True when the code is an annual SKU (used for billing-period UI only). */
export function isAnnualPlan(code: string | null | undefined): boolean {
    return (code ?? "").toUpperCase().trim().endsWith(ANNUAL_SUFFIX);
}

/** Numeric rank of a code's tier (FREE 0 < BASIC 1 < PRO 2 < MAX 3). */
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
