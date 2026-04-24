import { View, Text, type ViewStyle } from "react-native";
import { theme } from "@/config/theme";

/**
 * General-purpose small badge. For tier markers use <TierBadge/>.
 *
 * Variants:
 *   - neutral — quiet muted text on dark (default)
 *   - gold    — gold pill for "POPULAR"-style highlights
 *   - status  — colored dot + label for job statuses (completed, failed…)
 */

export type BadgeTone =
  | "neutral"
  | "gold"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Adds a leading coloured dot. Useful for status rows. */
  dot?: boolean;
  style?: ViewStyle;
}

const TONE_MAP: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
  neutral: {
    bg: "rgba(77,70,60,0.22)",
    fg: theme.color.onSurfaceVariant,
    border: "rgba(77,70,60,0.35)",
  },
  gold: {
    bg: "rgba(225,195,155,0.14)",
    fg: theme.color.goldMidday,
    border: "rgba(225,195,155,0.45)",
  },
  success: {
    bg: "rgba(123,179,138,0.14)",
    fg: theme.color.success,
    border: "rgba(123,179,138,0.4)",
  },
  warning: {
    bg: "rgba(229,181,103,0.14)",
    fg: theme.color.warning,
    border: "rgba(229,181,103,0.4)",
  },
  danger: {
    bg: "rgba(217,138,123,0.14)",
    fg: theme.color.danger,
    border: "rgba(217,138,123,0.4)",
  },
  info: {
    bg: "rgba(143,179,204,0.14)",
    fg: theme.color.info,
    border: "rgba(143,179,204,0.4)",
  },
};

export function Badge({ label, tone = "neutral", dot = false, style }: BadgeProps) {
  const palette = TONE_MAP[tone];
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      {dot ? (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: palette.fg,
          }}
        />
      ) : null}
      <Text
        style={{
          fontFamily: "Inter-SemiBold",
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: palette.fg,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
