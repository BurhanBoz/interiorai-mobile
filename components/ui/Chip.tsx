import { Pressable, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ComponentProps } from "react";
import { theme } from "@/config/theme";

/**
 * The universal chip — used for filters, segmented controls, and
 * multi-select rows. Keeps a quiet selected state (tinted border, gold
 * label) instead of a loud filled pill so multiple selections don't
 * overwhelm the editorial palette.
 */

type IconName = ComponentProps<typeof Ionicons>["name"];

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Optional right-aligned count, e.g. "12". */
  count?: number | string;
  /** Renders disabled with a lock glyph — used for plan-gated options. */
  locked?: boolean;
  size?: "sm" | "md";
  style?: ViewStyle;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  count,
  locked = false,
  size = "md",
  style,
}: ChipProps) {
  const handlePress = () => {
    if (locked) return;
    Haptics.selectionAsync();
    onPress();
  };

  const height = size === "sm" ? 34 : 40;
  const paddingX = size === "sm" ? 12 : 16;
  const fontSize = size === "sm" ? 12 : 13;

  const bg = locked
    ? "transparent"
    : selected
      ? "rgba(225,195,155,0.12)"
      : "rgba(28,27,27,0.7)";
  const borderColor = locked
    ? "rgba(77,70,60,0.4)"
    : selected
      ? "rgba(225,195,155,0.55)"
      : "rgba(77,70,60,0.3)";
  const textColor = locked
    ? theme.color.onSurfaceMuted
    : selected
      ? theme.color.goldMidday
      : theme.color.onSurface;

  return (
    <Pressable
      onPress={handlePress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: locked }}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          height,
          paddingHorizontal: paddingX,
          borderRadius: 999,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor,
          opacity: pressed && !locked ? 0.85 : 1,
        },
        locked && { borderStyle: "dashed" },
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={textColor}
        />
      ) : null}
      <Text
        style={{
          fontFamily: "Inter-Medium",
          fontSize,
          letterSpacing: 0.2,
          color: textColor,
        }}
      >
        {label}
      </Text>
      {count !== undefined && !locked ? (
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: fontSize - 1,
            color: selected
              ? "rgba(225,195,155,0.7)"
              : theme.color.onSurfaceMuted,
            marginLeft: 2,
          }}
        >
          · {count}
        </Text>
      ) : null}
      {locked ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginLeft: 4,
          }}
        >
          <Ionicons
            name="lock-closed"
            size={10}
            color={theme.color.onSurfaceMuted}
          />
        </View>
      ) : null}
    </Pressable>
  );
}
