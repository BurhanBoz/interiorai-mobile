import type { DesignMode } from "@/types/api";

/**
 * Ready-made rooms the user can try without opening their photo library.
 *
 * <p><b>Why this exists.</b> 38% of people who register never pick a photo
 * (75 registrations → 43 photos → 33 renders, 2026-09-09). That step is the
 * multiplier on every channel — everyone we buy, everyone Pinterest sends and
 * everyone who finds us organically passes through it — and it asks for
 * commitment before the product has shown what it does: find a room, tolerate
 * an OS permission dialog, hope the result is worth it.
 *
 * <p>A sample removes all three. It reuses the entire real pipeline (consent,
 * downscale, upload, retry) rather than a preview path, so what the user sees
 * is a genuine render of that room and nothing about the flow is special-cased.
 *
 * <p><b>Choosing images.</b> A sample has to be a believable "before": a real
 * room, unstyled, with the flaws a user's own photo would have. A magazine
 * shot teaches the wrong expectation — the render looks barely different and
 * the product reads as broken.
 *
 * <p>All four are photographs the product already shows somewhere, so a sample
 * renders what the user was promised rather than something new:
 * <ul>
 *   <li>living room, kitchen — the before/after pairs in the anonymous trial
 *       carousel and the paywall hero fallback ({@code assets/trial/}).</li>
 *   <li>empty room — the same photograph as store screenshot frame 02,
 *       downscaled from {@code aso_gorseller/empty_before.JPG}.</li>
 *   <li>garden — the exact file frame 07 is cut from; {@code compose.py}
 *       reads {@code assets/features/outdoor_before.png} directly.</li>
 * </ul>
 */
export type SampleRoom = {
    /** Stable id — analytics and React keys. */
    key: string;
    /** Bundled asset. require() so Metro ships it in the binary. */
    module: number;
    /** i18n key for the caption under the thumbnail. */
    labelKey: string;
    /** Modes this room makes sense in. A furnished room cannot demo Empty Room. */
    modes: DesignMode[];
};

export const SAMPLE_ROOMS: SampleRoom[] = [
    {
        key: "living_room",
        module: require("@/assets/trial/livingRoom_Before.png"),
        labelKey: "studio.sample_living_room",
        // Dated but furnished: the redesign has something to work against, and
        // Magic Edit / Style Transfer both need existing furniture to change.
        modes: ["REDESIGN", "INPAINT", "STYLE_TRANSFER"],
    },
    {
        key: "kitchen",
        module: require("@/assets/trial/kitchen_Before.png"),
        labelKey: "studio.sample_kitchen",
        modes: ["REDESIGN", "INPAINT", "STYLE_TRANSFER"],
    },
    {
        key: "empty_room",
        module: require("@/assets/features/empty_before.png"),
        labelKey: "studio.sample_empty_room",
        // Empty Room only — offering a furnished room there would demo the
        // wrong feature and the output would look like a plain redesign.
        modes: ["EMPTY_ROOM"],
    },
    {
        key: "garden",
        module: require("@/assets/features/outdoor_before.png"),
        labelKey: "studio.sample_garden",
        modes: ["OUTDOOR"],
    },
];

/** Samples worth offering in this mode, in catalog order. */
export function samplesFor(mode: DesignMode): SampleRoom[] {
    return SAMPLE_ROOMS.filter((s) => s.modes.includes(mode));
}
