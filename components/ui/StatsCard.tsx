import { View, Text, Pressable, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { theme } from "@/config/theme";

/**
 * The "value + context" card used for the vault (Profile), balance (Manage
 * Plan), and any at-a-glance metric. Before this component existed, every
 * screen hand-rolled its own label / value / description composition and
 * the typographic proportions never quite matched.
 *
 * Contract:
 *   - Tiny UPPERCASE caption on top
 *   - Big serif number (display weight)
 *   - One quiet sentence below (e.g. "of 200 monthly · renews in 30d")
 *   - Optional right-aligned trend icon or badge
 *   - Optional pressable wrapper with subtle press feedback
 */

type IconName = ComponentProps<typeof Ionicons>["name"];

interface StatsCardProps {
  label: string;
  value: string | number;
  /** One-line quiet context, sentence case. */
  description?: string;
  /** Right-aligned custom node (badge, icon, quick action). */
  trailing?: ReactNode;
  /** Convenience: icon trailing instead of custom node. */
  trailingIcon?: IconName;
  onPress?: () => void;
  /** Visual emphasis — tinted border + glow for the hero card on a screen. */
  emphasis?: boolean;
  style?: ViewStyle;
}

export function StatsCard({
  label,
  value,
  description,
  trailing,
  trailingIcon,
  onPress,
  emphasis = false,
  style,
}: StatsCardProps) {
  const body = (
    <View
      style={[
        {
          paddingHorizontal: theme.space.gutter,
          paddingVertical: 20,
          borderRadius: theme.radius.md,
          backgroundColor: emphasis
            ? "rgba(225,195,155,0.06)"
            : theme.color.surfaceContainerLow,
          borderWidth: 1,
          borderColor: emphasis
            ? "rgba(225,195,155,0.35)"
            : "rgba(77,70,60,0.25)",
          ...(emphasis ? theme.elevation.goldGlowSoft : {}),
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            ...theme.text.caption,
            color: emphasis
              ? theme.color.goldMidday
              : "rgba(208,197,184,0.7)",
          }}
        >
          {label}
        </Text>
        {trailing ??
          (trailingIcon ? (
            <Ionicons
              name={trailingIcon}
              size={14}
              color={theme.color.goldMidday}
            />
          ) : null)}
      </View>
      <Text
        style={{
          ...theme.text.display,
          color: theme.color.onSurface,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
      {description ? (
        <Text
          style={{
            ...theme.text.caption,
            color: theme.color.onSurfaceMuted,
            marginTop: 6,
          }}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.99 : 1 }],
        opacity: pressed ? 0.95 : 1,
      })}
    >
      {body}
    </Pressable>
  );
}

export default StatsCard;
