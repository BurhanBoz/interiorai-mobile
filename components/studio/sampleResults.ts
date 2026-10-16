import type { ImageSourcePropType } from "react-native";
import type { DesignMode } from "@/types/api";
import { SAMPLE_ROOMS, type SampleRoom } from "@/components/studio/sampleRooms";

/**
 * The app's own result for a sample room, bundled (17 Oct, owner: "örnek seçilince hazır
 * sonucu 1 saniyede göster, kredi harcama").
 *
 * <p>Until now "try with a sample" ran the whole real pipeline: upload, a 30-second wait and a
 * credit — for a photo we chose and have already rendered. In the 30 days to 16 Oct two of
 * three new users never produced a single design, and the sample is the one door that asks
 * nothing of them. So a sample now opens on its finished result at once, at no cost, and the
 * screen it lands on offers the camera for the user's own room. Every picture here is the
 * real output of the live prompt line for that room (14 Oct Halloween round, 13 Oct Cozy
 * Christmas round, the feature cards' own pairs); nothing is retouched.
 *
 * <p>A (sample, mode, season) with no entry here keeps the old behaviour — the real render —
 * so a mode that needs the user's hand (Magic Edit, Style Transfer) is never faked.
 */
const RESULTS: Record<string, ImageSourcePropType> = {
    // REDESIGN — the 13 Oct set round (Replicate NB2, live prompt line), all three passed review:
    // living room 3 Bohemian, kitchen 2 Scandinavian, dining room 1 Scandinavian.
    "living_room_3|REDESIGN": require("@/assets/samples/l3_redesign.jpg"),
    "kitchen_2|REDESIGN": require("@/assets/samples/k2_redesign.jpg"),
    "dining_room_1|REDESIGN": require("@/assets/samples/d1_redesign.jpg"),
    // SEASONAL — the season's leading theme (Spooky / Classic), the one the hero tile shows.
    "living_room_3|SEASONAL|HALLOWEEN": require("@/assets/samples/l3_halloween.jpg"),
    "kitchen_2|SEASONAL|HALLOWEEN": require("@/assets/samples/k2_halloween.jpg"),
    "dining_room_1|SEASONAL|HALLOWEEN": require("@/assets/samples/d1_halloween.jpg"),
    "living_room_3|SEASONAL|CHRISTMAS": require("@/assets/samples/l3_christmas.jpg"),
    "kitchen_2|SEASONAL|CHRISTMAS": require("@/assets/samples/k2_christmas.jpg"),
    "dining_room_1|SEASONAL|CHRISTMAS": require("@/assets/samples/d1_christmas.jpg"),
    // The feature cards' own before/after pairs: the sample IS that card's before.
    "empty_room|EMPTY_ROOM": require("@/assets/features/empty_after.jpg"),
    "garden|OUTDOOR": require("@/assets/features/outdoor_after.jpg"),
};

/** The bundled result for this sample in this mode, or null when it has to be rendered for real. */
export function sampleResult(sample: SampleRoom, mode: DesignMode, seasonCode?: string | null): ImageSourcePropType | null {
    const key = mode === "SEASONAL" ? `${sample.key}|${mode}|${seasonCode ?? ""}` : `${sample.key}|${mode}`;
    return RESULTS[key] ?? null;
}

/** The sample behind an analytics / route key, or null. */
export function sampleByKey(key: string | undefined): SampleRoom | null {
    return SAMPLE_ROOMS.find((s) => s.key === key) ?? null;
}
