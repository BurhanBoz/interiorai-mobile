import { Pressable, Animated } from "react-native";
import { useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { theme } from "@/config/theme";

/**
 * The switch primitive. Tuned for the dark + gold palette so the state
 * reads at a glance — before this tuning both tracks sat around the same
 * luminance value and users had to squint to tell ON from OFF.
 *
 * OFF: dark neutral track, medium-light thumb
 * ON:  gold track, dark-amber thumb (high contrast against gold)
 */

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const TRACK_WIDTH = 48;
const THUMB_SIZE = 22;
const THUMB_INSET = 3;

export function Toggle({ value, onValueChange, disabled = false }: ToggleProps) {
  const maxTranslate = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET * 2;
  const translateX = useRef(
    new Animated.Value(value ? maxTranslate : 0),
  ).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? maxTranslate : 0,
      damping: 16,
      stiffness: 320,
      useNativeDriver: true,
    }).start();
  }, [value, maxTranslate, translateX]);

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={{
        width: TRACK_WIDTH,
        height: THUMB_SIZE + THUMB_INSET * 2,
        borderRadius: 999,
        justifyContent: "center",
        paddingHorizontal: THUMB_INSET,
        backgroundColor: value
          ? theme.color.goldMidday
          : "rgba(53,53,52,0.9)",
        borderWidth: 1,
        borderColor: value
          ? "rgba(63,45,17,0.18)"
          : "rgba(77,70,60,0.35)",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Animated.View
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: value ? theme.color.onGold : "#B8AEA3",
          transform: [{ translateX }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3,
          elevation: 2,
        }}
      />
    </Pressable>
  );
}
