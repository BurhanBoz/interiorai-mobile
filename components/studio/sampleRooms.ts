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
 *   <li>empty room — the "before" of the Empty Room card and store frame 02
 *       (Prompt Lab A/B, 2026-10-05).</li>
 *   <li>garden — since 12 Oct the neglected back garden of the Outdoor card
 *       (outdoor_before.jpg). Store frame 07 is still cut from the old garden,
 *       {@code assets/features/outdoor_before.png}, which {@code compose.py}
 *       reads directly and the app no longer bundles.</li>
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
    /**
     * What the tile SHOWS when it is not the room itself (build 118, owner 14 Oct): the room
     * decorated for Halloween by the app — the tap still sends {@link module}, the plain room.
     */
    thumb?: number;
};

export const SAMPLE_ROOMS: SampleRoom[] = [
    // Build 118 (owner, 14 Oct): three rooms the app itself decorated in the 14 Oct lab round —
    // living room 3, kitchen 2, dining room 1. The tile shows the Halloween result, the tap sends
    // the room as photographed. The three older samples are retired (they stay in assets/trial
    // for the anonymous-trial carousel).
    {
        key: "living_room_3",
        module: require("@/assets/samples/l3_room.jpg"),
        thumb: require("@/assets/samples/l3_thumb.jpg"),
        labelKey: "studio.sample_living_room",
        modes: ["REDESIGN", "INPAINT", "STYLE_TRANSFER", "SEASONAL"],
    },
    {
        key: "kitchen_2",
        module: require("@/assets/samples/k2_room.jpg"),
        thumb: require("@/assets/samples/k2_thumb.jpg"),
        labelKey: "studio.sample_kitchen",
        modes: ["REDESIGN", "INPAINT", "STYLE_TRANSFER", "SEASONAL"],
    },
    {
        key: "dining_room_1",
        module: require("@/assets/samples/d1_room.jpg"),
        thumb: require("@/assets/samples/d1_thumb.jpg"),
        labelKey: "studio.sample_dining_room",
        modes: ["REDESIGN", "INPAINT", "STYLE_TRANSFER", "SEASONAL"],
    },
    {
        key: "empty_room",
        module: require("@/assets/features/empty_before.jpg"),
        labelKey: "studio.sample_empty_room",
        // Empty Room only — offering a furnished room there would demo the
        // wrong feature and the output would look like a plain redesign.
        modes: ["EMPTY_ROOM"],
    },
    {
        key: "garden",
        module: require("@/assets/features/outdoor_before.jpg"),
        labelKey: "studio.sample_garden",
        modes: ["OUTDOOR"],
    },
];

/** Samples worth offering in this mode, in catalog order. */
export function samplesFor(mode: DesignMode): SampleRoom[] {
    return SAMPLE_ROOMS.filter((s) => s.modes.includes(mode));
}
