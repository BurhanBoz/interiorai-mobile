import { router } from "expo-router";
import { useStudioStore } from "@/stores/studioStore";
import type { MagicTool } from "@/components/studio/featureCatalog";
import type { DesignMode } from "@/types/api";

/**
 * Where the flow goes once a room photo is in the store — the composer, or the tool's own
 * screen for Magic Edit and Style Transfer. One place, because two screens now hand a photo
 * over (add-room and the sample's result screen) and they must land in the same spot.
 */
export function continueWithPhoto(
    photo: { uri: string; fileId: string; width?: number | null; height?: number | null },
    mode: DesignMode,
    tool: MagicTool | undefined,
    seasonCode: string | null,
) {
    const s = useStudioStore.getState();
    s.setPhoto(photo);
    s.setMode(mode);
    s.setSeasonCode(seasonCode);
    if (mode === "INPAINT") {
        router.replace((tool ? `/studio/smart-edit?tool=${tool}` : "/studio/smart-edit") as never);
        return;
    }
    if (mode === "STYLE_TRANSFER") {
        router.replace("/studio/style-transfer" as never);
        return;
    }
    router.replace("/studio/composer" as never);
}
