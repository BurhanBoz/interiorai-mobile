import type { ImageSourcePropType } from "react-native";
import type { DesignMode } from "@/types/api";

/**
 * Studio feature registry — the single source for the studio home screen's
 * feature cards (2026-07 IA rework: pick the flow FIRST, then upload).
 *
 * <p>Generic by design: adding a generation flow = one entry here. The
 * card component renders whatever media shape it finds:
 *   - "pair"     → live before/after crossfade teaser
 *   - "transfer" → before/after crossfade PLUS a reference chip, because
 *                  Style Transfer takes TWO inputs (your room + a reference
 *                  photo) and the card has to say "room + this = that"
 *   - "single"   → static image (also plays GIFs via expo-image, if the
 *                  marketing team ever ships animated teasers)
 *
 * <p>ASSET SWAP (pending): the founder is producing authentic pairs by
 * running plain "before" rooms through the app itself. When they land in
 * `assets/features/`, point the entries below at:
 *   redesign_before/after · empty_before/after · inpaint_before/after
 *   style_before · style_reference · style_after
 * Until then the entries reuse bundled trial/style stills as placeholders.
 *
 * <p>Titles reuse the existing studio.mode_* i18n keys (already in all 8
 * locales); only the one-line descriptions are new.
 */

export type FeatureMedia =
    | { kind: "pair"; before: ImageSourcePropType; after: ImageSourcePropType }
    | {
          kind: "transfer";
          before: ImageSourcePropType;
          reference: ImageSourcePropType;
          after: ImageSourcePropType;
      }
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
            before: require("@/assets/features/redesign_before.png"),
            after: require("@/assets/features/redesign_after.png"),
        },
    },
    {
        key: "EMPTY_ROOM",
        titleKey: "studio.mode_empty_room",
        descKey: "studio.feature_empty_room_desc",
        media: {
            kind: "pair",
            before: require("@/assets/features/empty_before.png"),
            after: require("@/assets/features/empty_after.png"),
        },
    },
    {
        key: "INPAINT",
        titleKey: "studio.mode_inpaint",
        descKey: "studio.feature_inpaint_desc",
        minPlan: "PRO",
        media: {
            // before is real; after is a PLACEHOLDER — the authentic inpaint
            // output is regenerated after the 2026-07-10 CHANGE-mask fix ships
            // (the pre-fix render painted a whole room into the masked patch).
            kind: "pair",
            before: require("@/assets/features/inpaint_before.png"),
            after: require("@/assets/styles/hollywood_glam.png"),
        },
    },
    {
        key: "STYLE_TRANSFER",
        titleKey: "studio.mode_style_transfer",
        descKey: "studio.feature_style_transfer_desc",
        minPlan: "MAX",
        media: {
            kind: "transfer",
            before: require("@/assets/features/style_before.png"),
            reference: require("@/assets/features/style_reference.png"),
            after: require("@/assets/features/style_after.png"),
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
