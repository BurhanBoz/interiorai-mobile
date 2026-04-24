import { TextInput, View, Text, Animated, type ViewStyle } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { theme } from "@/config/theme";

/**
 * The single form-input primitive. Supports label, helper/error text, and
 * leading/trailing nodes. Focus state is communicated through a quiet
 * border-color shift — no noisy glow — which reads as "considered" rather
 * than "flashy".
 */

type IconName = ComponentProps<typeof Ionicons>["name"];
type KeyboardType = "default" | "email-address" | "numeric" | "phone-pad";
type AutoCapitalize = "none" | "sentences" | "words" | "characters";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardType;
  autoCapitalize?: AutoCapitalize;
  /** Optional helper text shown below the field — sentence case. */
  helper?: string;
  /** Error message — supersedes helper, and tints the field. */
  error?: string | null;
  /** Icon at the left of the text. */
  icon?: IconName;
  /** Custom node at the right (e.g. eye toggle, clear button). */
  trailing?: ReactNode;
  multiline?: boolean;
  numberOfLines?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
  helper,
  error,
  icon,
  trailing,
  multiline = false,
  numberOfLines = 1,
  disabled = false,
  style,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: theme.motion.duration.fast,
      easing: theme.motion.easing.standard,
      useNativeDriver: false,
    }).start();
  }, [isFocused, focusAnim]);

  const borderColor = error
    ? theme.color.danger
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
          "rgba(77,70,60,0.28)",
          "rgba(225,195,155,0.55)",
        ],
      });

  return (
    <View style={[{ gap: 8 }, style]}>
      {label ? (
        <Text
          style={{
            fontFamily: "Inter-SemiBold",
            fontSize: 11,
            letterSpacing: 1.65,
            textTransform: "uppercase",
            color: error
              ? theme.color.danger
              : "rgba(208,197,184,0.72)",
            paddingLeft: 2,
          }}
        >
          {label}
        </Text>
      ) : null}

      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 12 : 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor,
          backgroundColor: disabled
            ? "rgba(28,27,27,0.4)"
            : "rgba(28,27,27,0.7)",
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={
              error
                ? theme.color.danger
                : isFocused
                  ? theme.color.goldMidday
                  : theme.color.onSurfaceMuted
            }
          />
        ) : null}
        <TextInput
          style={{
            flex: 1,
            fontFamily: "Inter",
            fontSize: 15,
            lineHeight: 22,
            color: theme.color.onSurface,
            padding: 0,
            minHeight: multiline ? 20 * numberOfLines : undefined,
            textAlignVertical: multiline ? "top" : "center",
          }}
          placeholder={placeholder}
          placeholderTextColor="rgba(208,197,184,0.32)"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {trailing}
      </Animated.View>

      {error ? (
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 12,
            lineHeight: 16,
            color: theme.color.danger,
            paddingLeft: 2,
          }}
        >
          {error}
        </Text>
      ) : helper ? (
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 12,
            lineHeight: 16,
            color: theme.color.onSurfaceMuted,
            paddingLeft: 2,
          }}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
