import type { ImageSourcePropType } from "react-native";

/**
 * Design-style thumbnails, bundled.
 *
 * <p>The catalogue API returns a {@code previewUrl} for every style and it is
 * empty for all 35 of them — the images have always shipped in the binary.
 * The map used to live inside the style screen, so the composer's new style
 * strip would have needed a second copy of 35 requires; the first one to gain
 * a style would have been the only one showing it.
 *
 * <p>The 18 styles the catalogue serves (2026-10-05) are real renders: the app's own sample
 * living room redesigned in each style by the live pipeline (Sonnet 5.5 + Nano Banana 2),
 * cropped square. The rest are the original April illustrations for retired styles.
 *
 * <p>Returns null for an unknown code rather than a placeholder: a missing
 * thumbnail is a gap in this map, and a grey box that looks deliberate is how
 * it stays missing.
 */
export const STYLE_IMAGES: Record<string, ImageSourcePropType> = {
  MODERN: require("@/assets/styles/modern.jpg"),
  MINIMALIST: require("@/assets/styles/minimalist.jpg"),
  SCANDINAVIAN: require("@/assets/styles/scandinavian.jpg"),
  INDUSTRIAL: require("@/assets/styles/industrial.jpg"),
  BOHEMIAN: require("@/assets/styles/bohemian.jpg"),
  TRADITIONAL: require("@/assets/styles/traditional.jpg"),
  CONTEMPORARY: require("@/assets/styles/contemporary.jpg"),
  MID_CENTURY: require("@/assets/styles/mid_century.jpg"),
  RUSTIC: require("@/assets/styles/rustic.jpg"),
  ART_DECO: require("@/assets/styles/art_deco.jpg"),
  COASTAL: require("@/assets/styles/coastal.jpg"),
  MEDITERRANEAN: require("@/assets/styles/mediterranean.jpg"),
  JAPANESE: require("@/assets/styles/japanese.jpg"),
  TROPICAL: require("@/assets/styles/tropical.jpg"),
  FARMHOUSE: require("@/assets/styles/farmhouse.jpg"),
  VINTAGE: require("@/assets/styles/vintage.png"),
  ECLECTIC: require("@/assets/styles/eclectic.png"),
  CLASSIC: require("@/assets/styles/classic.png"),
  FRENCH_COUNTRY: require("@/assets/styles/french_country.png"),
  HOLLYWOOD_GLAM: require("@/assets/styles/hollywood_glam.png"),
  SHABBY_CHIC: require("@/assets/styles/shabby_chic.png"),
  TRANSITIONAL: require("@/assets/styles/transitional.png"),
  URBAN: require("@/assets/styles/urban.png"),
  ZEN: require("@/assets/styles/zen.png"),
  BAROQUE: require("@/assets/styles/baroque.png"),
  GOTHIC: require("@/assets/styles/gothic.png"),
  NEOCLASSICAL: require("@/assets/styles/neoclassical.png"),
  BIOPHILIC: require("@/assets/styles/biophilic.jpg"),
  WABI_SABI: require("@/assets/styles/wabi_sabi.png"),
  CYBERPUNK: require("@/assets/styles/cyberpunk.jpg"),
  FUTURISTIC: require("@/assets/styles/futuristic.png"),
  RETRO: require("@/assets/styles/retro.png"),
  MAXIMALIST: require("@/assets/styles/maximalist.png"),
  SOUTHWESTERN: require("@/assets/styles/southwestern.png"),
  LUXURY: require("@/assets/styles/luxury.jpg"),
};

/**
 * Seasonal themes (2.5.0). They are picked with the same strip as a style, so
 * they live in the same map: real results of the Christmas mode's own prompt
 * on the lab's living rooms (13 Oct), cropped square.
 */
const THEME_IMAGES: Record<string, ImageSourcePropType> = {
    XMAS_CLASSIC: require("@/assets/themes/xmas_classic.jpg"),
    XMAS_NORDIC: require("@/assets/themes/xmas_nordic.jpg"),
    XMAS_WOODLAND: require("@/assets/themes/xmas_woodland.jpg"),
    XMAS_WHITE: require("@/assets/themes/xmas_white.jpg"),
};

export function getStyleImage(code: string | null | undefined): ImageSourcePropType | null {
    if (!code) return null;
    const key = code.toUpperCase();
    return STYLE_IMAGES[key] ?? THEME_IMAGES[key] ?? null;
}
