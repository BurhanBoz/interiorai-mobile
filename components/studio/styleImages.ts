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
 * <p>Returns null for an unknown code rather than a placeholder: a missing
 * thumbnail is a gap in this map, and a grey box that looks deliberate is how
 * it stays missing.
 */
export const STYLE_IMAGES: Record<string, ImageSourcePropType> = {
  MODERN: require("@/assets/styles/modern.png"),
  MINIMALIST: require("@/assets/styles/minimalist.png"),
  SCANDINAVIAN: require("@/assets/styles/scandinavian.png"),
  INDUSTRIAL: require("@/assets/styles/industrial.png"),
  BOHEMIAN: require("@/assets/styles/bohemian.png"),
  TRADITIONAL: require("@/assets/styles/traditional.png"),
  CONTEMPORARY: require("@/assets/styles/contemporary.png"),
  MID_CENTURY: require("@/assets/styles/mid_century.png"),
  RUSTIC: require("@/assets/styles/rustic.png"),
  ART_DECO: require("@/assets/styles/art_deco.png"),
  COASTAL: require("@/assets/styles/coastal.png"),
  MEDITERRANEAN: require("@/assets/styles/mediterranean.png"),
  JAPANESE: require("@/assets/styles/japanese.png"),
  TROPICAL: require("@/assets/styles/tropical.png"),
  FARMHOUSE: require("@/assets/styles/farmhouse.png"),
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
  BIOPHILIC: require("@/assets/styles/biophilic.png"),
  WABI_SABI: require("@/assets/styles/wabi_sabi.png"),
  CYBERPUNK: require("@/assets/styles/cyberpunk.png"),
  FUTURISTIC: require("@/assets/styles/futuristic.png"),
  RETRO: require("@/assets/styles/retro.png"),
  MAXIMALIST: require("@/assets/styles/maximalist.png"),
  SOUTHWESTERN: require("@/assets/styles/southwestern.png"),
  LUXURY: require("@/assets/styles/luxury_glam.png"),
};

export function getStyleImage(code: string | null | undefined): ImageSourcePropType | null {
    if (!code) return null;
    return STYLE_IMAGES[code.toUpperCase()] ?? null;
}
