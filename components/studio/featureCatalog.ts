import type { ImageSourcePropType } from "react-native";
import type { DesignMode } from "@/types/api";
import { tierAtLeast, type PlanTier } from "@/utils/planTier";

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
    | {
          /**
           * Magic Edit story: `paint` is a translucent golden overlay of the
           * job's REAL mask (same pixel frame as before/after) that gets
           * brush-wiped onto the before, then the after fades in — the card
           * performs the exact gesture the tool asks of the user.
           */
          kind: "paint";
          before: ImageSourcePropType;
          paint: ImageSourcePropType;
          after: ImageSourcePropType;
      }
    | { kind: "single"; image: ImageSourcePropType };

export interface StudioFeature {
    key: DesignMode;
    titleKey: string;
    descKey: string;
    media: FeatureMedia;
    /**
     * Minimum tier that unlocks this flow. Absent = available on every plan.
     *
     * <p>This is the ONLY place a flow's plan gate is declared;
     * {@link isFeatureLocked} derives from it. It used to be decorative — a
     * hardcoded list did the actual locking — and the two drifted: Outdoor
     * carried {@code minPlan: "PRO"} while the list never checked it (so it
     * never locked), and Magic Edit was locked to PRO by the list although the
     * backend has granted it to BASE since Pricing V4 (so paying BASE users
     * were refused a feature they owned).
     */
    minPlan?: PlanTier;
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
        media: {
            // Authentic run (2026-07-11): brown sofa + wood coffee table →
            // grey patterned sofa + sage glass-top table. `paint` is that
            // job's actual mask tinted gold — the teaser paints the sofa
            // and table live, then the after lands (founder ask: "before'da
            // masayı ve koltuğu boyasın, sonra after gelsin").
            kind: "paint",
            before: require("@/assets/features/inpaint_before.png"),
            paint: require("@/assets/features/inpaint_paint.png"),
            after: require("@/assets/features/inpaint_after.png"),
        },
    },
    {
        key: "STYLE_TRANSFER",
        titleKey: "studio.mode_style_transfer",
        descKey: "studio.feature_style_transfer_desc",
        minPlan: "PRO",
        media: {
            kind: "transfer",
            before: require("@/assets/features/style_before.png"),
            reference: require("@/assets/features/style_reference.png"),
            after: require("@/assets/features/style_after.png"),
        },
    },
    {
        // V52 — Outdoor Design (1.1). Real pair from the founder's first
        // outdoor render (2026-08-03): weathered green timber house + wild
        // garden → sage modern facade with landscaped beds. Same before→after
        // teaser animation as the redesign/empty cards (kind:"pair").
        key: "OUTDOOR",
        titleKey: "studio.mode_outdoor",
        descKey: "studio.feature_outdoor_desc",
        minPlan: "PRO",
        media: {
            kind: "pair",
            before: require("@/assets/features/outdoor_before.png"),
            after: require("@/assets/features/outdoor_after.png"),
        },
    },
];

/**
 * Plan gate for a flow, derived from the feature's own {@code minPlan}.
 *
 * <p>Reads the declaration rather than repeating it: the previous version
 * hardcoded a list of keys, which drifted from the metadata beside it in both
 * directions at once — Outdoor declared PRO and was never locked, Magic Edit
 * declared nothing here yet was locked to PRO against a backend that grants it
 * to BASE. One source now, so a tier change is a one-line metadata edit.
 *
 * <p>Callers pass the EFFECTIVE plan code (useEffectivePlanCode). {@link
 * tierAtLeast} normalises weekly/annual/legacy codes, so PRO_ANNUAL and a
 * legacy MAX subscriber both read as PRO. Deliberately independent of loaded
 * feature flags: a flag fetch in flight must not briefly show a locked flow as
 * open. The backend stays the source of truth at job-creation time.
 */
export function isFeatureLocked(
    key: DesignMode,
    planCode: string | null | undefined,
): boolean {
    const feature = STUDIO_FEATURES.find((f) => f.key === key);
    if (!feature?.minPlan) return false;
    return !tierAtLeast(planCode, feature.minPlan);
}

/** The tier a flow needs, or null when it is open to everyone. */
export function requiredTier(key: DesignMode): PlanTier | null {
    return STUDIO_FEATURES.find((f) => f.key === key)?.minPlan ?? null;
}
