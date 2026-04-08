import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useRef } from "react";

const PLACEHOLDER_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDgJCRkFcNo9XedWxDTL0tu9tqRpXyRH-WSOcsPjMtQvXYpeML9Xd3mgE0PAfiyzMkdA0hlzLNmkupDgt4pbdVGA1qhMkpBTO_Lk1BW9yDB4nE_dAoafUZjehrVwlDwzAo-MwkSN6UVXdRbU3SY0S7nxNxr6h8zQvAMx4BPaFH-woNXlMKlMlso7hKPqprIf6Za6Cfd8kBx9qNfN5cx0QJBJPwYa4oxfqz0Emo9Azh844HM17Au41RBGUvSiECrXCoAEp9xTaDtk5-C";

export default function UpscaleScreen() {
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const spinRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinRotation, {
        toValue: 360,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setComplete(true);
          return 100;
        }
        return prev + 1;
      });
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (complete) {
      const timeout = setTimeout(() => {
        router.replace("/result/latest");
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [complete]);

  const spinStyle = {
    transform: [
      {
        rotate: spinRotation.interpolate({
          inputRange: [0, 360],
          outputRange: ["0deg", "360deg"],
        }),
      },
    ],
  };

  const phaseLabel =
    progress < 40
      ? "PHASE 1: NOISE REDUCTION"
      : progress < 80
        ? "PHASE 2: TEXTURAL REFINEMENT"
        : "PHASE 3: FINAL ENHANCEMENT";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-8 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Label */}
        <Text className="text-[10px] tracking-[0.2em] text-primary mt-6 font-label">
          CURRENT WORKFLOW
        </Text>

        {/* Title */}
        <Text className="font-headline text-[2.5rem] italic text-on-surface mt-2 leading-tight">
          Upscaling to HD...
        </Text>

        {/* Phase Label */}
        <View className="flex-row items-center mt-5 gap-2">
          <Ionicons name="sparkles" size={14} color="rgba(229,226,225,0.6)" />
          <Text className="text-[11px] tracking-wider text-on-surface/60 font-label">
            {phaseLabel}
          </Text>
        </View>

        {/* Image Preview */}
        <View className="mt-6 aspect-[4/5] rounded-xl bg-surface-container-low overflow-hidden">
          <Image
            source={{ uri: PLACEHOLDER_IMAGE }}
            style={{ width: "100%", height: "100%" }}
            blurRadius={12}
            contentFit="cover"
          />

          {/* Overlay */}
          <View className="absolute inset-0 bg-surface/40 items-center justify-center">
            {/* Progress Bar */}
            <View className="w-[200px] h-[2px] bg-on-surface/10 rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${progress}%` }}
              />
            </View>

            {/* Progress Text */}
            <Text className="text-on-surface text-sm font-body mt-3">
              Enhancing Detail: {progress}%
            </Text>
            <Text className="text-on-surface/50 text-xs font-body mt-1">
              Applying AI super-resolution
            </Text>
          </View>

          {/* HD Processing Badge */}
          <View className="absolute top-3 right-3 bg-surface/80 px-3 py-1.5 rounded-lg">
            <Text className="text-[10px] tracking-wider text-on-surface font-label">
              HD PROCESSING
            </Text>
          </View>
        </View>

        {/* Process Log */}
        <View className="mt-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-on-surface text-base font-headline">
              Process Log
            </Text>
            <Text className="text-[10px] tracking-wider text-primary font-label">
              REAL-TIME
            </Text>
          </View>

          {/* Log Entry 1 — Completed */}
          <View className="flex-row items-start mt-4 gap-3">
            <Ionicons
              name="checkmark-circle"
              size={18}
              color="#E1C39B"
              style={{ marginTop: 2 }}
            />
            <View className="flex-1">
              <Text className="text-on-surface text-sm font-body">
                Standard Render Complete
              </Text>
              <Text className="text-on-surface/50 text-xs font-body mt-0.5">
                Base image generated successfully
              </Text>
            </View>
          </View>

          {/* Log Entry 2 — In Progress */}
          <View className="flex-row items-start mt-4 gap-3">
            <Animated.View style={spinStyle}>
              <Ionicons
                name="sync"
                size={18}
                color="rgba(229,226,225,0.6)"
                style={{ marginTop: 2 }}
              />
            </Animated.View>
            <View className="flex-1">
              <Text className="text-on-surface text-sm font-body">
                HD Upscaling In Progress
              </Text>
              <Text className="text-on-surface/50 text-xs font-body mt-0.5">
                Enhancing resolution and detail with AI
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View className="flex-row gap-3 px-8 pb-6">
        <Pressable
          onPress={() => router.back()}
          className="flex-1 h-14 rounded-xl bg-surface-container-high items-center justify-center"
        >
          <Text className="text-on-surface font-body text-base">Cancel</Text>
        </Pressable>

        <Pressable
          disabled
          className="flex-1 h-14 rounded-xl bg-primary/40 items-center justify-center"
        >
          <Text className="text-on-primary font-body text-base opacity-60">
            {complete ? "Done" : "Saving..."}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
