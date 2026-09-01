import type { DesignMode, QualityTier } from "@/types/api";

/**
 * Resolve the backend feature_code for a given (mode, quality tier) pair.
 *
 * Every mode is now tier-agnostic. Redesign used to split — STANDARD under
 * `INTERIOR_REDESIGN`, HD/ULTRA_HD under `HD_REDESIGN` (the V25 rename) —
 * because HD literally meant "generate at 2 MP instead of 1". V69 made 2 MP
 * the floor for everyone, which left HD selling nothing, so 1.4.1 drops the
 * tier from the picker exactly as ULTRA_HD was dropped in 2026-07 and for
 * the same reason: sharpness sells better AFTER generation, on the render
 * the user has already decided they like, via the 4x Upscale action.
 *
 * `HD_REDESIGN` is NOT gone from the backend — 1.4.0 clients keep sending
 * HD for weeks and their jobs must keep working, so the feature, its plan
 * rows and its credit rules all stay (V70 aligned its price with STANDARD
 * so nobody in the field overpays for an identical render). This function
 * simply stops producing it.
 */
export function resolveFeatureCode(
    mode: DesignMode,
    _tier: QualityTier,
): string {
    if (mode === "REDESIGN") return "INTERIOR_REDESIGN";
    if (mode === "EMPTY_ROOM") return "EMPTY_ROOM";
    if (mode === "INPAINT") return "INPAINT";
    if (mode === "STYLE_TRANSFER") return "STYLE_TRANSFER";
    if (mode === "OUTDOOR") return "OUTDOOR_DESIGN"; // V52 — tier-agnostic like EMPTY_ROOM
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
