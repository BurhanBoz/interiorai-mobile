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
 * <p>Redesign and Empty Room show the owner's Prompt Lab A/B runs (2026-10-05,
 * arm C3: the photo-anchored prompt with Sonnet 5.5 on Nano Banana 2 1K +
 * thinking) — the same pipeline that is live, so the card promises what the app
 * delivers. Style Transfer, Outdoor and Keep were renewed on 12 Oct from the Magic
 * Edit lab on the live pipeline. Replace is still the founder's July run.
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

/**
 * Magic Edit is two tools on the home screen since 2.4.1 (owner, 12 Oct: the one "Magic
 * Edit" tile did not say what makes it different). Both are INPAINT; the tool decides
 * which mask modes its screen offers: Replace (CHANGE or REMOVE) or Keep (PROTECT).
 */
export type MagicTool = "replace" | "keep";

export interface StudioFeature {
    /** Unique per tile. Equal to {@link key} except for the two Magic Edit tools. */
    id: string;
    key: DesignMode;
    tool?: MagicTool;
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
        // Cozy Christmas (2.5.0). First on purpose (owner, 13 Oct: "en başa koyalım"); the
        // Studio shows it only while the server lists seasonal themes, so the tile leaves
        // with the season without a release. The pair is a real run of the mode's own
        // prompt on the lab's living room 3 (classic theme), room untouched.
        id: "SEASONAL",
        key: "SEASONAL",
        titleKey: "studio.mode_seasonal",
        descKey: "studio.feature_seasonal_desc",
        // PRO at launch (owner, 13 Oct) — the server's plan_features is the lock, this mirrors it.
        minPlan: "PRO",
        media: {
            kind: "pair",
            before: require("@/assets/features/seasonal_before.jpg"),
            after: require("@/assets/features/seasonal_after.jpg"),
        },
    },
    {
        id: "REDESIGN",
        key: "REDESIGN",
        titleKey: "studio.mode_redesign",
        descKey: "studio.feature_redesign_desc",
        media: {
            kind: "pair",
            before: require("@/assets/features/redesign_before.jpg"),
            after: require("@/assets/features/redesign_after.jpg"),
        },
    },
    {
        id: "EMPTY_ROOM",
        key: "EMPTY_ROOM",
        titleKey: "studio.mode_empty_room",
        descKey: "studio.feature_empty_room_desc",
        media: {
            kind: "pair",
            before: require("@/assets/features/empty_before.jpg"),
            after: require("@/assets/features/empty_after.jpg"),
        },
    },
    {
        id: "INPAINT_REPLACE",
        key: "INPAINT",
        tool: "replace",
        titleKey: "studio.tool_replace",
        descKey: "studio.feature_replace_desc",
        media: {
            // Authentic run (2026-07-11): brown sofa + wood coffee table →
            // grey patterned sofa + sage glass-top table. `paint` is that
            // job's actual mask tinted gold — the teaser paints the sofa
            // and table live, then the after lands (founder ask: "before'da
            // masayı ve koltuğu boyasın, sonra after gelsin").
            kind: "paint",
            before: require("@/assets/features/inpaint_before.png"),
            paint: require("@/assets/features/inpaint_paint.png"),
            after: require("@/assets/features/inpaint_after.jpg"),
        },
    },
    {
        // Keep (2.4.1). The sample is a real run of the Magic Edit lab (12 Oct): the
        // green sofa painted to stay, the room around it redesigned.
        id: "INPAINT_KEEP",
        key: "INPAINT",
        tool: "keep",
        titleKey: "studio.tool_keep",
        descKey: "studio.feature_keep_desc",
        media: {
            kind: "pair",
            before: require("@/assets/features/keep_before.jpg"),
            after: require("@/assets/features/keep_after.jpg"),
        },
    },
    {
        id: "STYLE_TRANSFER",
        key: "STYLE_TRANSFER",
        titleKey: "studio.mode_style_transfer",
        descKey: "studio.feature_style_transfer_desc",
        minPlan: "PRO",
        media: {
            kind: "transfer",
            before: require("@/assets/features/style_before.jpg"),
            reference: require("@/assets/features/style_reference.jpg"),
            after: require("@/assets/features/style_after.jpg"),
        },
    },
    {
        // V52 — Outdoor Design (1.1). Pair renewed 12 Oct (owner: the old one did not
        // sell it): a neglected back garden → Modern, a live-pipeline run (NB2) of the
        // Magic Edit lab. The old garden photo stays as a sample room (sampleRooms.ts).
        id: "OUTDOOR",
        key: "OUTDOOR",
        titleKey: "studio.mode_outdoor",
        descKey: "studio.feature_outdoor_desc",
        minPlan: "PRO",
        media: {
            kind: "pair",
            before: require("@/assets/features/outdoor_before.jpg"),
            after: require("@/assets/features/outdoor_after.jpg"),
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
