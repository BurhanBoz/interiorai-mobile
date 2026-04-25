import { View, Text, type ViewStyle } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { theme } from "@/config/theme";

/**
 * The canonical brand mark for Roomframe AI.
 *
 * Renders the wordmark together with a tiny editorial geometric glyph so
 * every header reads as the same product.
 *
 * Variants:
 *   - "inline"  — wordmark on one line, glyph left (default header use)
 *   - "stacked" — glyph centered, wordmark on two lines (splash, auth)
 *   - "compact" — glyph only, for drawer corners or narrow footers
 *   - "wordmark" — text only, no glyph (for dense headers)
 */

export type BrandVariant = "inline" | "stacked" | "compact" | "wordmark";
export type BrandTone = "gold" | "neutral" | "muted";

const TONE_COLORS: Record<BrandTone, string> = {
  gold: theme.color.goldMidday,
  neutral: "#F5F0EB",
  muted: "rgba(225, 195, 155, 0.55)",
};

interface BrandProps {
  variant?: BrandVariant;
  tone?: BrandTone;
  size?: "xs" | "sm" | "md" | "lg";
  style?: ViewStyle;
}

/**
 * The lens glyph — a pair of concentric arcs that evokes a camera iris
 * rotated 45deg, with a single ray crossing through. 24x24 viewBox.
 */
function LensGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer hexagonal aperture — editorial, not photographic */}
      <Path
        d="M12 2 L20 6.5 L20 17.5 L12 22 L4 17.5 L4 6.5 Z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {/* Inner iris */}
      <Path
        d="M12 7 L16 9.5 L16 14.5 L12 17 L8 14.5 L8 9.5 Z"
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
        opacity={0.7}
      />
      {/* Diagonal light ray */}
      <Line
        x1={6.5}
        y1={6.5}
        x2={17.5}
        y2={17.5}
        stroke={color}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.45}
      />
    </Svg>
  );
}

const WORDMARK = {
  primary: "ROOMFRAME",
  secondary: "AI",
} as const;

const SIZE_MAP = {
  xs: { glyph: 14, primary: 9, secondary: 7, tracking: 2, gap: 6 },
  sm: { glyph: 18, primary: 11, secondary: 9, tracking: 2.4, gap: 8 },
  md: { glyph: 22, primary: 12, secondary: 10, tracking: 2.8, gap: 10 },
  lg: { glyph: 32, primary: 16, secondary: 13, tracking: 3.2, gap: 12 },
} as const;

export function Brand({
  variant = "inline",
  tone = "gold",
  size = "sm",
  style,
}: BrandProps) {
  const color = TONE_COLORS[tone];
  const dims = SIZE_MAP[size];

  if (variant === "compact") {
    return (
      <View style={style}>
        <LensGlyph size={dims.glyph} color={color} />
      </View>
    );
  }

  if (variant === "wordmark") {
    return (
      <View style={style}>
        <Text
          style={{
            fontFamily: "Inter-SemiBold",
            fontSize: dims.primary,
            letterSpacing: dims.tracking,
            color,
          }}
        >
          {WORDMARK.primary} {WORDMARK.secondary}
        </Text>
      </View>
    );
  }

  if (variant === "stacked") {
    return (
      <View style={[{ alignItems: "center", gap: dims.gap }, style]}>
        <LensGlyph size={dims.glyph * 1.6} color={color} />
        <View style={{ alignItems: "center", gap: 2 }}>
          <Text
            style={{
              fontFamily: "Inter-SemiBold",
              fontSize: dims.primary,
              letterSpacing: dims.tracking,
              color,
            }}
          >
            {WORDMARK.primary}
          </Text>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: dims.secondary,
              letterSpacing: dims.tracking * 1.2,
              color,
              opacity: 0.75,
            }}
          >
            {WORDMARK.secondary}
          </Text>
        </View>
      </View>
    );
  }

  // inline (default)
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: dims.gap,
        },
        style,
      ]}
    >
      <LensGlyph size={dims.glyph} color={color} />
      <Text
        numberOfLines={1}
        style={{
          fontFamily: "Inter-SemiBold",
          fontSize: dims.primary,
          letterSpacing: dims.tracking,
          color,
        }}
      >
        {WORDMARK.primary}
        <Text style={{ opacity: 0.55 }}> · {WORDMARK.secondary}</Text>
      </Text>
    </View>
  );
}

export default Brand;
