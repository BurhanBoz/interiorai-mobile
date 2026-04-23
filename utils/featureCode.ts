import type { DesignMode, QualityTier } from "@/types/api";

/**
 * Resolve the backend feature_code for a given (mode, quality tier) pair.
 *
 * The gotcha: V25 migration split what used to be a single `INTERIOR_REDESIGN`
 * feature into two — STANDARD stays under `INTERIOR_REDESIGN`, but HD and
 * ULTRA_HD live under `HD_REDESIGN`. `plan_credit_rules` and the model
 * routing table both use these split feature codes, so any mobile lookup
 * that ignores the tier will miss the HD/ULTRA_HD rules and make the chip
 * appear locked to Pro/Max users.
 *
 * EMPTY_ROOM, INPAINT, and STYLE_TRANSFER are tier-agnostic — their quality
 * variants live under the same feature code.
 */
export function resolveFeatureCode(
    mode: DesignMode,
    tier: QualityTier,
): string {
    if (mode === "REDESIGN") {
        return tier === "STANDARD" ? "INTERIOR_REDESIGN" : "HD_REDESIGN";
    }
    if (mode === "EMPTY_ROOM") return "EMPTY_ROOM";
    if (mode === "INPAINT") return "INPAINT";
    if (mode === "STYLE_TRANSFER") return "STYLE_TRANSFER";
    return "INTERIOR_REDESIGN";
}

/**
 * For contexts where the tier is unknown (e.g. the prompt suggestion fetch
 * before the user picks a quality tier). Returns the "simple" mapping.
 */
export function resolveModeFeatureCode(mode: DesignMode): string {
    if (mode === "REDESIGN") return "INTERIOR_REDESIGN";
    return resolveFeatureCode(mode, "STANDARD");
}
