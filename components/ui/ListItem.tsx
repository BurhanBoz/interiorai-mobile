import { View, Text, Pressable, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ComponentProps, ReactNode } from "react";
import { theme } from "@/config/theme";

/**
 * One pattern for every "row" in the app — Profile settings, Notifications
 * rows, drawer items at non-primary level. Before this existed each screen
 * had its own icon + label + chevron layout with slightly different
 * paddings and colors. The inconsistency was subtle, but the kind a
 * careful user notices.
 *
 * Contract:
 *   - Left: optional icon inside a 40×40 quiet tile
 *   - Middle: label (sentence case) + optional description
 *   - Right: optional meta value OR custom node, plus an auto chevron
 *   - Divider below unless last=true
 *   - Press: haptic + background flash
 */

type IconName = ComponentProps<typeof Ionicons>["name"];

interface ListItemProps {
  icon?: IconName;
  /** When provided, overrides the icon with a custom node. */
  leading?: ReactNode;
  label: string;
  description?: string;
  /** Right-aligned value (e.g. "EN", "On"). */
  meta?: string;
  /** Right-aligned custom node (toggle, chip). Overrides chevron + meta. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Hide the chevron — use for non-tappable rows. */
  showChevron?: boolean;
  /** Hide the bottom divider. Useful for the last item in a group. */
  last?: boolean;
  /** Quiet destructive rendering — used by Sign Out, Delete Account. */
  destructive?: boolean;
  style?: ViewStyle;
}

export function ListItem({
  icon,
  leading,
  label,
  description,
  meta,
  trailing,
  onPress,
  showChevron = true,
  last = false,
  destructive = false,
  style,
}: ListItemProps) {
  const handlePress = () => {
    if (!onPress) return;
    Haptics.selectionAsync();
    onPress();
  };

  const labelColor = destructive
    ? theme.color.onSurfaceMuted
    : theme.color.onSurface;
  const iconColor = destructive
    ? theme.color.onSurfaceMuted
    : theme.color.goldMidday;

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
      }}
    >
      {leading ? (
        <View style={{ width: 40, alignItems: "center" }}>{leading}</View>
      ) : icon ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "rgba(225,195,155,0.08)",
            borderWidth: 1,
            borderColor: "rgba(225,195,155,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "Inter-Medium",
            fontSize: 15,
            letterSpacing: 0.1,
            color: labelColor,
          }}
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 12,
              lineHeight: 16,
              color: theme.color.onSurfaceMuted,
              marginTop: 2,
            }}
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ? (
        trailing
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {meta ? (
            <Text
              style={{
                fontFamily: "Inter-Medium",
                fontSize: 13,
                color: theme.color.onSurfaceVariant,
                letterSpacing: 0.2,
              }}
            >
              {meta}
            </Text>
          ) : null}
          {showChevron && onPress ? (
            <Ionicons
              name="chevron-forward"
              size={16}
              color="rgba(153,143,132,0.55)"
            />
          ) : null}
        </View>
      )}
    </View>
  );

  const divider = !last ? (
    <View
      style={{
        height: 1,
        backgroundColor: "rgba(77,70,60,0.18)",
        marginLeft: icon || leading ? 54 : 0,
      }}
    />
  ) : null;

  if (!onPress) {
    return (
      <View style={style}>
        {content}
        {divider}
      </View>
    );
  }

  return (
    <View style={style}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          backgroundColor: pressed
            ? "rgba(225,195,155,0.04)"
            : "transparent",
          borderRadius: 8,
        })}
      >
        {content}
      </Pressable>
      {divider}
    </View>
  );
}

export default ListItem;
