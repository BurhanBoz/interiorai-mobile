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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { getOutputDownloadUrl } from "@/services/files";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";

export default function UpscaleScreen() {
  const { jobId, outputId } = useLocalSearchParams<{
    jobId: string;
    outputId: string;
  }>();
  const authHeaders = useAuthHeaders();
  const imageUrl =
    jobId && outputId ? getOutputDownloadUrl(jobId, outputId) : undefined;
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const spinRotation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Spinning animation for sync icon
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

  // Pulse animation for active log entry icon
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Progress simulation
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

  // Navigate on completion
  useEffect(() => {
    if (complete) {
      const timeout = setTimeout(() => {
        if (jobId) {
          router.replace(`/result/${jobId}` as any);
        } else {
          router.back();
        }
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [complete, jobId]);

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
      ? "Enhancing Detail"
      : progress < 80
        ? "Textural Refinement"
        : "Final Enhancement";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#E1C39B" />
          </Pressable>
          <Text
            className="font-headline"
            style={{
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#E1C39B",
            }}
          >
            Architectural Lens
          </Text>
        </View>
        <View
          className="rounded-full overflow-hidden"
          style={{
            width: 32,
            height: 32,
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.3)",
            backgroundColor: "#2A2A2A",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="person" size={14} color="#E5E2E1" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Content */}
        <View className="mb-10 mt-4">
          <Text
            className="font-label text-on-surface-variant mb-2"
            style={{
              fontSize: 11,
              letterSpacing: 3.5,
              textTransform: "uppercase",
            }}
          >
            Current Workflow
          </Text>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 34, lineHeight: 42, fontStyle: "italic" }}
          >
            Upscaling to HD...
          </Text>
        </View>

        {/* Image Preview Section */}
        <View
          className="rounded-xl overflow-hidden mb-8"
          style={{
            aspectRatio: 4 / 5,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 20,
          }}
        >
          <Image
            source={
              imageUrl
                ? { uri: imageUrl, headers: authHeaders }
                : require("@/assets/icon.png")
            }
            style={{ width: "100%", height: "100%" }}
            blurRadius={16}
            contentFit="cover"
          />

          {/* Darken overlay */}
          <View
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          />

          {/* Progress Overlay */}
          <View className="absolute inset-0 items-center justify-center px-12">
            <View className="w-full items-center" style={{ maxWidth: 260 }}>
              {/* Phase Label */}
              <Text
                className="font-label text-primary mb-4"
                style={{
                  fontSize: 11,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
                  textShadowColor: "rgba(254,223,181,0.6)",
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 4,
                }}
              >
                {phaseLabel}
              </Text>

              {/* Progress Bar */}
              <View
                className="w-full rounded-full overflow-hidden mb-3"
                style={{
                  height: 2,
                  backgroundColor: "rgba(255,255,255,0.1)",
                }}
              >
                <LinearGradient
                  colors={["#C4A882", "#A68A62"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    borderRadius: 9999,
                    shadowColor: "#C4A882",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 10,
                  }}
                />
              </View>

              {/* Processing / Percentage */}
              <View className="flex-row items-center justify-between w-full">
                <Text
                  className="font-label text-on-surface-variant"
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}
                >
                  Processing
                </Text>
                <Text
                  className="font-headline text-primary"
                  style={{ fontSize: 14 }}
                >
                  {progress}%
                </Text>
              </View>
            </View>
          </View>

          {/* Lens Corner Accent */}
          <View className="absolute" style={{ top: 24, right: 24 }}>
            <Ionicons
              name="scan-outline"
              size={32}
              color="rgba(254,223,181,0.4)"
            />
          </View>
        </View>

        {/* Process Log */}
        <View style={{ gap: 12 }}>
          {/* Log Entry 1 — Completed */}
          <View
            className="flex-row items-center justify-between rounded-xl"
            style={{ padding: 20, backgroundColor: "#1C1B1B" }}
          >
            <View className="flex-row items-center" style={{ gap: 16 }}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text
                className="font-label text-on-surface"
                style={{
                  fontSize: 12,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                Standard Render Complete
              </Text>
            </View>
            <Text
              className="font-label"
              style={{
                fontSize: 10,
                color: "rgba(209,197,184,0.5)",
              }}
            >
              14:02:11
            </Text>
          </View>

          {/* Log Entry 2 — In Progress */}
          <View
            className="flex-row items-center justify-between rounded-xl"
            style={{ padding: 20, backgroundColor: "#1C1B1B" }}
          >
            <View className="flex-row items-center" style={{ gap: 16 }}>
              <Animated.View style={{ opacity: pulseAnim }}>
                <Animated.View style={spinStyle}>
                  <Ionicons name="sync" size={20} color="#FEDFB5" />
                </Animated.View>
              </Animated.View>
              <Text
                className="font-label text-primary"
                style={{
                  fontSize: 12,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                HD Upscaling In Progress
              </Text>
            </View>
            <Text
              className="font-label"
              style={{
                fontSize: 10,
                color: "rgba(209,197,184,0.5)",
              }}
            >
              Active
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Controls — Glass Nav */}
      <View
        className="absolute bottom-0 left-0 right-0"
        style={{
          padding: 24,
          backgroundColor: "rgba(19,19,19,0.7)",
        }}
      >
        <SafeAreaView edges={["bottom"]}>
          <View className="flex-row" style={{ gap: 16 }}>
            <Pressable
              onPress={() => router.back()}
              className="flex-1 rounded-xl items-center justify-center"
              style={{
                height: 52,
                backgroundColor: "#2A2A2A",
              }}
            >
              <Text
                className="font-label text-on-surface"
                style={{
                  fontSize: 11,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
                }}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={!complete}
              onPress={() => {
                if (complete && jobId) {
                  router.replace(`/result/${jobId}` as any);
                } else if (complete) {
                  router.back();
                }
              }}
              className="flex-1 rounded-xl items-center justify-center"
              style={{
                height: 52,
                backgroundColor: "rgba(254,223,181,0.2)",
                borderWidth: 1,
                borderColor: "rgba(254,223,181,0.1)",
              }}
            >
              <Text
                className="font-label"
                style={{
                  fontSize: 11,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
                  color: complete ? "#FEDFB5" : "rgba(254,223,181,0.4)",
                }}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
