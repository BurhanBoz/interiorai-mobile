import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCatalogStore } from "@/stores/catalogStore";
import { catalogName } from "@/utils/catalogI18n";

/**
 * A job's room and style, in the user's language.
 *
 * <p>A job carries its room and style as the catalogue's English NAME only —
 * `JobResponse` has no codes — while the translations are keyed by CODE
 * (`catalog.style_<CODE>`, `catalog.room_<CODE>`). The catalogue the app already
 * caches pairs the two, so a name resolves through it. Before this, the gallery
 * chip said "Living Room" and the result header "SCANDINAVIAN" in a Turkish UI
 * that one screen earlier had said "Salon" and "İskandinav".
 *
 * <p>Falls back to the name it was given: a retired style, or a catalogue not
 * loaded yet, shows what the server sent rather than nothing. Display only —
 * anything that filters, keys or tracks by name keeps the server's name.
 */
export function useCatalogLabel() {
    const { t } = useTranslation();
    const roomTypes = useCatalogStore((s) => s.roomTypes);
    const designStyles = useCatalogStore((s) => s.designStyles);
    const ensureLoaded = useCatalogStore((s) => s.ensureLoaded);
    // The screen that labels a job can be the first one to need the
    // catalogue: an account restored on a new phone opens the gallery before
    // it ever opens the composer, and its chips read "Minimalist" / "Kids
    // Room" in a French UI until then. A cached catalogue returns at once.
    useEffect(() => {
        void ensureLoaded();
    }, [ensureLoaded]);

    return useCallback(
        (kind: "style" | "room", name: string | null | undefined): string => {
            if (!name) return "";
            const list = kind === "room" ? roomTypes : designStyles;
            const item = list.find((i) => i.name === name);
            return item ? catalogName(t, kind, item) : name;
        },
        [t, roomTypes, designStyles],
    );
}
