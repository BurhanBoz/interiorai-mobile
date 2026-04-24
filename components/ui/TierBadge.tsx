import { View, Text, type ViewStyle, type TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/config/theme";

/**
 * The single source of truth for tier badges across the app.
 *
 * Before this component existed, the Drawer painted MAX as a yellow sticker
 * pinned to the avatar, the Profile screen painted it as a gradient pill
 * with a shadow, and Notifications rendered a plain caption. That made the
 * same concept look like three different features. Now every surface routes
 * through <TierBadge tier="max" /> and the look stays coherent.
 *
 * Tier tone map:
 *   - free  → muted neutral on dark
 *   - basic → cool silver
 *   - pro   → gold pill
 *   - max   → gradient gold with subtle glow
 */

export type TierCode = "FREE" | "BASIC" | "PRO" | "MAX";
export type TierSize = "xs" | "sm" | "md";

interface TierBadgeProps {
  tier: TierCode | string;
  size?: TierSize;
  /** Override the label — useful for localised tier names. */
  label?: string;
  style?: ViewStyle;
}

const SIZE_MAP: Record<TierSize, { px: number; py: number; font: number; gap: number; tracking: number }> = {
  xs: { px: 7, py: 2, font: 9, gap: 4, tracking: 1.5 },
  sm: { px: 9, py: 3, font: 10, gap: 5, tracking: 1.8 },
  md: { px: 12, py: 4, font: 11, gap: 6, tracking: 2 },
};

function normalise(tier: string): TierCode {
  const upper = tier.toUpperCase();
  if (upper === "FREE" || upper === "BASIC" || upper === "PRO" || upper === "MAX") {
    return upper;
  }
  return "FREE";
}

export function TierBadge({ tier, size = "sm", label, style }: TierBadgeProps) {
  const code = normalise(tier);
  const dims = SIZE_MAP[size];
  const text = (label ?? code).toUpperCase();

  const textStyle: TextStyle = {
    fontFamily: "Inter-SemiBold",
    fontSize: dims.font,
    letterSpacing: dims.tracking,
    textTransform: "uppercase",
  };

  const containerStyle: ViewStyle = {
    paddingHorizontal: dims.px,
    paddingVertical: dims.py,
    borderRadius: 999,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  };

  if (code === "MAX") {
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

  if (code === "PRO") {
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

  if (code === "BASIC") {
    return (
      <View
        style={[
          containerStyle,
          {
            backgroundColor: "rgba(200,198,197,0.12)",
            borderWidth: 1,
            borderColor: "rgba(200,198,197,0.25)",
          },
          style,
        ]}
      >
        <Text style={[textStyle, { color: theme.color.onSurfaceVariant }]}>
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
