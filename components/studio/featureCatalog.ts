import type { ImageSourcePropType } from "react-native";
import type { DesignMode } from "@/types/api";

/**
 * Studio feature registry — the single source for the studio home screen's
 * feature cards (2026-07 IA rework: pick the flow FIRST, then upload).
 *
 * <p>Generic by design: adding a generation flow = one entry here. The
 * card component renders whatever media shape it finds:
 *   - "pair"   → live before/after crossfade teaser (bundled stills; the
 *                planned marketing GIFs can replace this by swapping to a
 *                "single" animated asset later — expo-image plays GIFs)
 *   - "single" → static image
 *
 * <p>Titles reuse the existing studio.mode_* i18n keys (already in all 8
 * locales); only the one-line descriptions are new.
 */

export type FeatureMedia =
    | { kind: "pair"; before: ImageSourcePropType; after: ImageSourcePropType }
    | { kind: "single"; image: ImageSourcePropType };

export interface StudioFeature {
    key: DesignMode;
    titleKey: string;
    descKey: string;
    media: FeatureMedia;
    /** Minimum plan that unlocks the flow — mirrors options.tsx hard guards. */
    minPlan?: "PRO" | "MAX";
}

export const STUDIO_FEATURES: StudioFeature[] = [
    {
        key: "REDESIGN",
        titleKey: "studio.mode_redesign",
        descKey: "studio.feature_redesign_desc",
        media: {
            kind: "pair",
            before: require("@/assets/trial/livingRoom_Before.png"),
            after: require("@/assets/trial/livingRoom_After.png"),
        },
    },
    {
        key: "EMPTY_ROOM",
        titleKey: "studio.mode_empty_room",
        descKey: "studio.feature_empty_room_desc",
        media: {
            kind: "pair",
            before: require("@/assets/trial/kitchen_Before.png"),
            after: require("@/assets/trial/kitchen_After.png"),
        },
    },
    {
        key: "INPAINT",
        titleKey: "studio.mode_inpaint",
        descKey: "studio.feature_inpaint_desc",
        minPlan: "PRO",
        media: {
            kind: "pair",
            before: require("@/assets/trial/cafe_Before.png"),
            after: require("@/assets/trial/cafe_After.png"),
        },
    },
    {
        key: "STYLE_TRANSFER",
        titleKey: "studio.mode_style_transfer",
        descKey: "studio.feature_style_transfer_desc",
        minPlan: "MAX",
        media: {
            kind: "pair",
            before: require("@/assets/styles/scandinavian.png"),
            after: require("@/assets/styles/art_deco.png"),
        },
    },
];

/**
 * Plan gate for a feature — SAME hard plan-code guards as options.tsx's
 * isModeAvailable (kept code-simple so feature-flag loading delays can't
 * briefly surface a locked mode as available). Callers pass the EFFECTIVE
 * plan code (useEffectivePlanCode → welcome-trial users read as MAX).
 * Backend remains the source of truth at job-creation time.
 */
export function isFeatureLocked(key: DesignMode, planCode: string): boolean {
    if (key === "STYLE_TRANSFER") return planCode !== "MAX";
    if (key === "INPAINT") return planCode !== "PRO" && planCode !== "MAX";
    return false;
}
