import { View, Text, Pressable, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";

const STATUS_MESSAGES = [
  "Analyzing room structure...",
  "Applying design style...",
  "Rendering final output...",
  "Optimizing quality...",
];

export default function GenerationProgressScreen() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const [statusIndex, setStatusIndex] = useState(0);

  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 360,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const spinStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [0, 360],
          outputRange: ["0deg", "360deg"],
        }),
      },
    ],
  };

  // Cycle status messages every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex(prev => (prev + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Simulate completion — navigate after 10s
  useEffect(() => {
    const timeout = setTimeout(() => {
      const target = jobId ? `/result/${jobId}` : "/result/demo";
      router.replace(target as any);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [jobId]);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/studio" as any);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface">
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <Text className="font-headline text-sm tracking-[3px] uppercase text-on-surface">
            THE ARCHITECTURAL LENS
          </Text>
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 items-center justify-center rounded-full bg-surface-container-high"
          >
            <Ionicons name="close" size={20} color="#E5E2E1" />
          </Pressable>
        </View>

        {/* Center content */}
        <View className="flex-1 items-center justify-center -mt-10">
          {/* Spinner area */}
          <View className="items-center justify-center w-[140px] h-[140px] mb-10">
            {/* Outer decorative ring */}
            <View className="absolute w-[140px] h-[140px] rounded-full border border-primary/10" />

            {/* Spinning ring */}
            <Animated.View
              style={spinStyle}
              className="absolute w-[120px] h-[120px] rounded-full border-[3px] border-transparent border-t-primary border-r-primary/40"
            />

            {/* Pulsing glow placeholder — static subtle ring */}
            <View className="absolute w-[130px] h-[130px] rounded-full border border-primary/5" />

            {/* Center icon */}
            <View className="w-14 h-14 items-center justify-center rounded-full bg-surface-container">
              <Ionicons name="cube-outline" size={28} color="#E1C39B" />
            </View>
          </View>

          {/* Title */}
          <Text className="font-headline text-3xl tracking-tight text-on-surface text-center mb-3">
            Creating Your Design...
          </Text>

          {/* Status text */}
          <Text className="text-on-surface-variant text-sm uppercase tracking-[2px] opacity-80 text-center">
            {STATUS_MESSAGES[statusIndex]}
          </Text>
        </View>

        {/* Design principle card */}
        <View className="bg-surface-container-low p-6 rounded-xl mb-6">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="bulb-outline" size={16} color="#E1C39B" />
            <Text className="text-primary text-xs font-label tracking-[2px] uppercase">
              Design Principle
            </Text>
          </View>
          <Text className="text-on-surface-variant text-sm leading-6 italic mb-4">
            "Scandinavian design prioritizes 'Hygge'—creating a warm atmosphere
            and a feeling of coziness, contentment, and well-being through
            thoughtful simplicity."
          </Text>
          <View className="w-12 h-[2px] bg-primary/30 rounded-full" />
        </View>

        {/* Powered by badge */}
        <View className="items-center mb-6">
          <View className="flex-row items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full">
            <Ionicons name="flash" size={14} color="#E1C39B" />
            <Text className="text-on-surface-variant text-xs font-label tracking-[1px] uppercase">
              Powered by SDXL
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
