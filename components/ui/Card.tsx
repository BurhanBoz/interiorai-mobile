import { View, Pressable, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { theme } from "@/config/theme";

/**
 * The unified card primitive. Three visual variants, one press behavior.
 *
 * Variants:
 *   - flat      — base surface, quiet, used for content grouping
 *   - elevated  — lifted surface with a soft shadow (for hero cards)
 *   - bordered  — transparent with a thin gold-tinted border (upsell cards)
 *
 * Density:
 *   - compact → padding 16
 *   - regular → padding 20 (default)
 *   - relaxed → padding 24 (hero)
 */

export type CardVariant = "flat" | "elevated" | "bordered";
export type CardDensity = "compact" | "regular" | "relaxed";

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  density?: CardDensity;
  /** Makes the card press-interactive with subtle scale + haptic. */
  onPress?: () => void;
  /** Adds a soft gold glow — use for hero cards only. */
  glow?: boolean;
  style?: ViewStyle;
  className?: string;
}

const DENSITY_MAP: Record<CardDensity, number> = {
  compact: 16,
  regular: 20,
  relaxed: 24,
};

export function Card({
  children,
  variant = "flat",
  density = "regular",
  onPress,
  glow = false,
  style,
  className,
}: CardProps) {
  const padding = DENSITY_MAP[density];

  const baseStyle: ViewStyle = {
    padding,
    borderRadius: 16,
  };

  let variantStyle: ViewStyle = {};
  if (variant === "flat") {
    variantStyle = {
      backgroundColor: theme.color.surfaceContainerLow,
      borderWidth: 1,
      borderColor: "rgba(77,70,60,0.18)",
    };
  } else if (variant === "elevated") {
    variantStyle = {
      backgroundColor: theme.color.surfaceContainer,
      ...theme.elevation.md,
    };
  } else {
    // bordered
    variantStyle = {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "rgba(225,195,155,0.18)",
    };
  }

  const glowStyle = glow ? theme.elevation.goldGlowSoft : {};

  const merged: ViewStyle = {
    ...baseStyle,
    ...variantStyle,
    ...glowStyle,
    ...(style ?? {}),
  };

  if (!onPress) {
    return (
      <View style={merged} className={className}>
        {children}
      </View>
    );
  }

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className={className}
      style={({ pressed }) => [
        merged,
        pressed && {
          transform: [{ scale: 0.99 }],
          opacity: 0.95,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}
