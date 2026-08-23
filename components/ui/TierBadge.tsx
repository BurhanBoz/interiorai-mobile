import { View, Text, type ViewStyle, type TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/config/theme";
import { planTier } from "@/utils/planTier";

/**
 * The single source of truth for tier badges across the app.
 *
 * Before this component existed, the Drawer painted MAX as a yellow sticker
 * pinned to the avatar, the Profile screen painted it as a gradient pill
 * with a shadow, and Notifications rendered a plain caption. That made the
 * same concept look like three different features. Now every surface routes
 * through <TierBadge tier="max" /> and the look stays coherent.
 *
 * Tier tone map (Pricing V3):
 *   - free → muted neutral on dark
 *   - base → gold pill
 *   - pro  → gradient gold with subtle glow (the top tier)
 */

export type TierCode = "FREE" | "BASE" | "PRO";
export type TierSize = "xs" | "sm" | "md";

interface TierBadgeProps {
  tier: TierCode | string;
  size?: TierSize;
  /** Override the label — useful for localised tier names. */
  label?: string;
  style?: ViewStyle;
}

// Padding is what `size` controls; the text is always `theme.text.label`.
const SIZE_MAP: Record<TierSize, { px: number; py: number; gap: number }> = {
  xs: { px: 7, py: 2, gap: 4 },
  sm: { px: 9, py: 3, gap: 5 },
  md: { px: 12, py: 4, gap: 6 },
};

// Shared normalization — maps annual SKUs (e.g. PRO_ANNUAL) to their base
// tier so the badge shows "PRO", not a degraded "FREE".
const normalise = (tier: string): TierCode => planTier(tier);

export function TierBadge({ tier, size = "sm", label, style }: TierBadgeProps) {
  const code = normalise(tier);
  const dims = SIZE_MAP[size];
  const text = (label ?? code).toUpperCase();

  const textStyle: TextStyle = { ...theme.text.label };

  const containerStyle: ViewStyle = {
    paddingHorizontal: dims.px,
    paddingVertical: dims.py,
    borderRadius: theme.radius.pill,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  };

  if (code === "PRO") {
    return (
      <LinearGradient
        colors={[theme.color.goldDawn, theme.color.goldMidday]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          containerStyle,
          {
            borderWidth: 0.5,
            borderColor: "rgba(63,45,17,0.2)",
            ...theme.elevation.goldGlowSoft,
          },
          style,
        ]}
      >
        <Text style={[textStyle, { color: theme.color.onGold }]}>{text}</Text>
      </LinearGradient>
    );
  }

  if (code === "BASE") {
    return (
      <View
        style={[
          containerStyle,
          {
            backgroundColor: "rgba(225,195,155,0.14)",
            borderWidth: 1,
            borderColor: "rgba(225,195,155,0.45)",
          },
          style,
        ]}
      >
        <Text style={[textStyle, { color: theme.color.goldMidday }]}>
          {text}
        </Text>
      </View>
    );
  }

  // FREE
  return (
    <View
      style={[
        containerStyle,
        {
          backgroundColor: "rgba(77,70,60,0.3)",
          borderWidth: 1,
          borderColor: "rgba(77,70,60,0.35)",
        },
        style,
      ]}
    >
      <Text style={[textStyle, { color: theme.color.onSurfaceMuted }]}>
        {text}
      </Text>
    </View>
  );
}

export default TierBadge;
