import type { TFunction } from "i18next";

/**
 * Localized display name for a backend catalog item (room type / design
 * style). The backend serves English names; locale overrides live in
 * i18n under `catalog.style_<CODE>` / `catalog.room_<CODE>` — unknown
 * codes fall back to the server-provided name, so new catalog rows keep
 * working before their translations ship (generic by design).
 */
export function catalogName(
    t: TFunction,
    kind: "style" | "room",
    item: { code: string; name: string },
): string {
    return t(`catalog.${kind}_${item.code}`, { defaultValue: item.name });
}
