import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { theme } from "@/config/theme";

/**
 * The unified button primitive. Five variants, three sizes, one contract.
 *
 * Variants:
 *   - primary    — gradient gold, the only one allowed as the screen's main CTA
 *   - secondary  — ghost outline, for "back" / "change photo" / "cancel"
 *   - tertiary   — text link, for quiet in-card actions
 *   - destructive — quiet muted label for Sign Out / Delete
 *   - icon       — 44×44 tap area around a single glyph
 *
 * Sizes: sm (h44), md (h52, default), lg (h60 — hero upgrade CTAs)
 *
 * Every button provides haptic feedback, a press scale, a loading state,
 * and honours disabled. Don't reach past this component to build a custom
 * CTA — if the design needs a new variant, add one here.
 */

type IconName = ComponentProps<typeof Ionicons>["name"];
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "destructive"
  | "icon";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  /** When true, positions icon to the left of the label. Default is right. */
  iconLeft?: boolean;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Accessibility label — required when no title (icon-only button). */
  accessibilityLabel?: string;
  children?: ReactNode;
  style?: ViewStyle;
}

const SIZE_MAP: Record<
  ButtonSize,
  { height: number; paddingX: number; fontSize: number; iconSize: number; radius: number }
> = {
  sm: { height: 44, paddingX: 18, fontSize: 13, iconSize: 16, radius: 12 },
  md: { height: 52, paddingX: 22, fontSize: 14, iconSize: 18, radius: 14 },
  lg: { height: 60, paddingX: 28, fontSize: 15, iconSize: 20, radius: 16 },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconLeft = false,
  disabled = false,
  loading = false,
  fullWidth = true,
  accessibilityLabel,
  children,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const dims = SIZE_MAP[size];

  const handlePress = () => {
    Haptics.impactAsync(
      variant === "primary"
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
    onPress();
  };

  const labelStyle: TextStyle = {
    fontFamily: "Inter-SemiBold",
    fontSize: dims.fontSize,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  };

  const containerBase: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: dims.height,
    borderRadius: dims.radius,
    paddingHorizontal: dims.paddingX,
    gap: 10,
    ...(fullWidth ? { width: "100%" } : {}),
  };

  // ───── ICON ONLY ─────
  if (variant === "icon") {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        hitSlop={8}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        style={({ pressed }) => [
          {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed
              ? "rgba(225,195,155,0.08)"
              : "transparent",
            opacity: isDisabled ? 0.4 : 1,
          },
          style,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={dims.iconSize}
            color={theme.color.goldMidday}
          />
        ) : null}
      </Pressable>
    );
  }

  // ───── PRIMARY (gradient gold) ─────
  if (variant === "primary") {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        style={({ pressed }) => [
          {
            width: fullWidth ? "100%" : undefined,
            opacity: isDisabled ? 0.5 : 1,
            transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
          },
          style,
        ]}
      >
        <LinearGradient
          colors={theme.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            ...containerBase,
            borderWidth: 1,
            borderColor: "rgba(63,45,17,0.18)",
            ...(size === "lg" ? theme.elevation.goldGlowSoft : {}),
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.color.onGold} />
          ) : (
            <>
              {iconLeft && icon ? (
                <Ionicons
                  name={icon}
                  size={dims.iconSize}
                  color={theme.color.onGold}
                />
              ) : null}
              {title ? (
                <Text style={[labelStyle, { color: theme.color.onGold }]}>
                  {title}
                </Text>
              ) : null}
              {children}
              {!iconLeft && icon ? (
                <Ionicons
                  name={icon}
                  size={dims.iconSize}
                  color={theme.color.onGold}
                />
              ) : null}
            </>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  // ───── SECONDARY (ghost outline) ─────
  if (variant === "secondary") {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        style={({ pressed }) => [
          {
            ...containerBase,
            backgroundColor: pressed
              ? "rgba(225,195,155,0.06)"
              : "transparent",
            borderWidth: 1,
            borderColor: pressed
              ? "rgba(225,195,155,0.42)"
              : "rgba(225,195,155,0.25)",
            opacity: isDisabled ? 0.45 : 1,
            transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.color.goldMidday} />
        ) : (
          <>
            {iconLeft && icon ? (
              <Ionicons
                name={icon}
                size={dims.iconSize}
                color={theme.color.goldMidday}
              />
            ) : null}
            {title ? (
              <Text
                style={[labelStyle, { color: theme.color.onSurface }]}
              >
                {title}
              </Text>
            ) : null}
            {children}
            {!iconLeft && icon ? (
              <Ionicons
                name={icon}
                size={dims.iconSize}
                color={theme.color.goldMidday}
              />
            ) : null}
          </>
        )}
      </Pressable>
    );
  }

  // ───── DESTRUCTIVE (quiet muted) ─────
  if (variant === "destructive") {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        style={({ pressed }) => [
          {
            ...containerBase,
            backgroundColor: pressed ? "rgba(217,138,123,0.08)" : "transparent",
            borderWidth: 1,
            borderColor: "rgba(153,143,132,0.25)",
            opacity: isDisabled ? 0.45 : 1,
          },
          style,
        ]}
      >
        {iconLeft && icon ? (
          <Ionicons
            name={icon}
            size={dims.iconSize}
            color={theme.color.onSurfaceMuted}
          />
        ) : null}
        {title ? (
          <Text style={[labelStyle, { color: theme.color.onSurfaceMuted }]}>
            {title}
          </Text>
        ) : null}
        {!iconLeft && icon ? (
          <Ionicons
            name={icon}
            size={dims.iconSize}
            color={theme.color.onSurfaceMuted}
          />
        ) : null}
      </Pressable>
    );
  }

  // ───── TERTIARY (text link) ─────
  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 10,
          opacity: pressed ? 0.55 : isDisabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {iconLeft && icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={theme.color.goldMidday}
        />
      ) : null}
      {title ? (
        <Text
          style={{
            fontFamily: "Inter-Medium",
            fontSize: dims.fontSize,
            color: theme.color.goldMidday,
            letterSpacing: 0.3,
          }}
        >
          {title}
        </Text>
      ) : null}
      {children}
      {!iconLeft && icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={theme.color.goldMidday}
        />
      ) : null}
    </Pressable>
  );
}

export default Button;
