import { Pressable, View, Animated } from "react-native";
import { useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function Toggle({ value, onValueChange }: ToggleProps) {
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 20 : 0,
      damping: 15,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, [value]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  };

  return (
    <Pressable
      onPress={handlePress}
      className={`w-[48px] h-[28px] rounded-full justify-center px-1 ${
        value ? "bg-primary" : "bg-surface-container-highest"
      }`}
    >
      <Animated.View
        style={{ transform: [{ translateX }] }}
        className={`w-5 h-5 rounded-full ${
          value ? "bg-on-primary" : "bg-on-surface-variant"
        }`}
      />
    </Pressable>
  );
}
