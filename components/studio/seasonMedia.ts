import type { ImageSourcePropType } from "react-native";
import type { CatalogItemResponse, SeasonResponse } from "@/types/api";
import { getStyleImage } from "@/components/studio/styleImages";

/**
 * What a season looks like in the Studio (V202, build 114).
 *
 * <p>The server owns a season: its title per locale, its tile photos and its themes
 * (/api/catalog/seasons). The app keeps a bundled copy of the pictures for the seasons it was
 * built with, so the hero tile is sharp on first paint and never a grey box on a slow network;
 * a season the app has never heard of draws the server's URLs. Either way the TITLE is the
 * server's, so renaming or adding a season is data.
 */
const SEASON_MEDIA: Record<string, { before: ImageSourcePropType; after: ImageSourcePropType }> = {
    HALLOWEEN: {
        before: require("@/assets/seasons/halloween_before.jpg"),
        after: require("@/assets/seasons/halloween_after.jpg"),
    },
    CHRISTMAS: {
        before: require("@/assets/features/seasonal_before.jpg"),
        after: require("@/assets/features/seasonal_after.jpg"),
    },
};

export type SeasonMedia = { before: ImageSourcePropType | { uri: string }; after: ImageSourcePropType | { uri: string } };

/** The hero tile's pictures: bundled when the app knows the season, the server's otherwise. */
export function seasonMedia(season: SeasonResponse): SeasonMedia | null {
    const bundled = SEASON_MEDIA[season.code];
    if (bundled) return bundled;
    if (season.previewBeforeUrl && season.previewAfterUrl) {
        return { before: { uri: season.previewBeforeUrl }, after: { uri: season.previewAfterUrl } };
    }
    return null;
}

/** The season's title in the app's language, the English name when that locale is missing. */
export function seasonTitle(season: SeasonResponse, locale: string): string {
    const lang = (locale || "en").split("-")[0].toLowerCase();
    return season.names?.[lang] ?? season.names?.en ?? season.name;
}

/** A theme's strip thumbnail: bundled (both seasons the app ships with), else the server's. */
export function themeImage(theme: CatalogItemResponse): ImageSourcePropType | { uri: string } | null {
    return getStyleImage(theme.code) ?? (theme.previewUrl ? { uri: theme.previewUrl } : null);
}

/**
 * The season a theme belongs to, from the open seasons; null when it is in none. Matches the
 * theme's code or its English name — a job carries the name (designStyleName).
 */
export function seasonOfTheme(seasons: SeasonResponse[], theme: string | null | undefined): SeasonResponse | null {
    if (!theme) return null;
    return seasons.find((s) => s.themes.some((t) => t.code === theme || t.name === theme)) ?? null;
}
