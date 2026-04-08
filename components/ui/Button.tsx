import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "tertiary";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  fullWidth = true,
}: ButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  if (variant === "primary") {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        className={`${fullWidth ? "w-full" : ""} ${disabled ? "opacity-50" : ""}`}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <LinearGradient
          colors={["#C4A882", "#A68E6B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="h-14 rounded-xl flex-row items-center justify-center gap-2"
        >
          <Text className="text-on-primary font-body font-semibold tracking-wide text-base">
            {title}
          </Text>
          {icon}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === "secondary") {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        className={`h-14 rounded-xl bg-surface-container-highest flex-row items-center justify-center gap-2 ${
          fullWidth ? "w-full" : "px-6"
        } ${disabled ? "opacity-50" : ""}`}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Text className="text-on-surface font-body font-semibold tracking-wide text-base">
          {title}
        </Text>
        {icon}
      </Pressable>
    );
  }

  // tertiary
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={`h-14 flex-row items-center justify-center gap-2 ${
        fullWidth ? "w-full" : ""
      } ${disabled ? "opacity-50" : ""}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Text className="text-primary font-body font-medium tracking-wide text-sm">
        {title}
      </Text>
      {icon}
    </Pressable>
  );
}
