import { View, Text, Pressable, Animated, Easing, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useJobPolling } from "@/hooks/useJobPolling";
import { useCreditStore } from "@/stores/creditStore";

const STATUS_MESSAGES = [
  "Analyzing Room Structure...",
  "Applying Design Style...",
  "Rendering Final Output...",
  "Optimizing Quality...",
];

export default function GenerationProgressScreen() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const [statusIndex, setStatusIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetchBalance = useCreditStore(s => s.fetchBalance);

  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 360,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
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

  // Poll job status until terminal
  useJobPolling(
    jobId ?? null,
    job => {
      if (job.status === "COMPLETED") {
        fetchBalance();
        router.replace(`/result/${job.id}` as any);
      } else if (job.status === "FAILED") {
        setErrorMessage(
          job.errorMessage || "Generation failed. Please try again.",
        );
      } else if (job.status === "CANCELLED") {
        setErrorMessage("Job was cancelled.");
      }
    },
    3000,
  );

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/studio" as any);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-8 py-6">
        <Text
          className="font-headline text-on-background"
          style={{
            fontSize: 13,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Architectural Lens
        </Text>
        <Pressable
          onPress={handleClose}
          className="items-center justify-center rounded-full"
          style={{
            width: 40,
            height: 40,
            backgroundColor: "#2A2A2A",
          }}
        >
          <Ionicons name="close" size={20} color="#E5E2E1" />
        </Pressable>
      </View>

      {/* Center content */}
      <View className="flex-1 items-center justify-center px-8">
        {/* Animated concentric loader */}
        <View
          className="items-center justify-center mb-12"
          style={{ width: 150, height: 150 }}
        >
          {/* Background static circle */}
          <View
            className="absolute rounded-full"
            style={{
              width: 150,
              height: 150,
              borderWidth: 1,
              borderColor: "rgba(153,143,131,0.2)",
            }}
          />

          {/* Pulsing glow ring */}
          <Animated.View
            className="absolute rounded-full"
            style={{
              width: 140,
              height: 140,
              borderWidth: 1,
              borderColor: "#C4A882",
              opacity: pulse,
            }}
          />

          {/* Spinning arc */}
          <Animated.View
            style={[
              {
                position: "absolute",
                width: 150,
                height: 150,
                borderRadius: 75,
                borderWidth: 2,
                borderColor: "transparent",
                borderTopColor: "#FEDFB5",
              },
              spinStyle,
            ]}
          />

          {/* Center icon */}
          <Ionicons
            name="time-outline"
            size={40}
            color="#FEDFB5"
            style={{
              textShadowColor: "rgba(254,223,181,0.4)",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 8,
            }}
          />
        </View>

        {/* Title */}
        <Text
          className="font-headline text-on-background text-center"
          style={{ fontSize: 28, letterSpacing: -0.3 }}
        >
          {errorMessage ? "Generation Failed" : "Creating Your Design..."}
        </Text>

        {/* Status subtitle */}
        <Text
          className="text-center mt-4"
          style={{
            fontFamily: "Inter",
            fontSize: 11,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            color: errorMessage ? "#E57373" : "#E0C29A",
          }}
        >
          {errorMessage ?? STATUS_MESSAGES[statusIndex]}
        </Text>

        {errorMessage && (
          <Pressable
            onPress={() =>
              router.replace({
                pathname: "/(tabs)/studio/review" as any,
                params: { error: errorMessage },
              })
            }
            className="mt-8 rounded-xl"
            style={{
              paddingHorizontal: 24,
              paddingVertical: 14,
              backgroundColor: "#2A2A2A",
              borderWidth: 1,
              borderColor: "rgba(196,168,130,0.3)",
            }}
          >
            <Text
              className="font-label text-secondary"
              style={{
                fontSize: 12,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: "600",
              }}
            >
              Try Again
            </Text>
          </Pressable>
        )}

        {/* Powered by badge */}
        <View
          className="items-center justify-center rounded-full mt-12"
          style={{
            paddingHorizontal: 16,
            paddingVertical: 6,
            backgroundColor: "#2A2A2A",
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.1)",
          }}
        >
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Powered by SDXL
          </Text>
        </View>
      </View>

      {/* Bottom educational card */}
      <View className="px-8 mb-12">
        <View
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "#1C1B1B", padding: 32 }}
        >
          {/* Header row */}
          <View
            className="flex-row items-center justify-between pb-4 mb-6"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "rgba(77,70,60,0.1)",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 11,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                color: "#E0C29A",
              }}
            >
              Design Principle
            </Text>
            <Ionicons name="sparkles-outline" size={16} color="#D1C5B8" />
          </View>

          {/* Blockquote */}
          <Text
            className="font-headline text-on-surface-variant"
            style={{
              fontSize: 18,
              lineHeight: 28,
              fontStyle: "italic",
            }}
          >
            "Scandinavian design is not just about minimalism; it's about
            finding the soul of a space through natural light and functional
            honesty."
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
