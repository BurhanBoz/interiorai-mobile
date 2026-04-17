import { View, Text, ScrollView, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function CompareScreen() {
  const { beforeUrl, afterUrl } = useLocalSearchParams<{
    beforeUrl: string;
    afterUrl: string;
  }>();
  const authHeaders = useAuthHeaders();

  const beforeSource = beforeUrl
    ? { uri: beforeUrl, headers: authHeaders }
    : undefined;
  const afterSource = afterUrl
    ? { uri: afterUrl, headers: authHeaders }
    : undefined;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-6">
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#E0C29A" />
          </Pressable>
          <Text
            className="font-headline text-primary-container"
            style={{
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Transformation
          </Text>
        </View>
        <View
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.2)",
            backgroundColor: "#2A2A2A",
          }}
        >
          <Ionicons name="person" size={14} color="#E5E2E1" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Before / After Comparison */}
        <View
          className="rounded-xl overflow-hidden bg-surface-container-low"
          style={{ aspectRatio: 4 / 5 }}
        >
          <View className="absolute inset-0 flex-row">
            {/* Before */}
            <View
              className="flex-1 overflow-hidden"
              style={{ borderRightWidth: 0 }}
            >
              {beforeSource ? (
                <Image
                  source={beforeSource}
                  style={{ width: "100%", height: "100%", opacity: 0.6 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#2A2A2A",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="image-outline" size={32} color="#998F84" />
                </View>
              )}
              {/* Before label */}
              <View
                className="absolute rounded-full"
                style={{
                  top: 24,
                  left: 24,
                  backgroundColor: "rgba(19,19,19,0.8)",
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                }}
              >
                <Text
                  className="font-label text-on-surface-variant"
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}
                >
                  Before
                </Text>
              </View>
            </View>

            {/* After */}
            <View className="flex-1 overflow-hidden">
              {afterSource ? (
                <Image
                  source={afterSource}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#1C1B1B",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="image-outline" size={32} color="#998F84" />
                </View>
              )}
              {/* After label */}
              <View
                className="absolute rounded-full"
                style={{
                  top: 24,
                  right: 24,
                  backgroundColor: "rgba(254,223,181,0.9)",
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                }}
              >
                <Text
                  className="font-label font-semibold"
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "#281801",
                  }}
                >
                  After
                </Text>
              </View>
            </View>
          </View>

          {/* Comparison Slider Handle */}
          <View
            className="absolute items-center justify-center"
            style={{ top: 0, bottom: 0, left: "50%", marginLeft: -1 }}
            pointerEvents="none"
          >
            <View
              style={{
                width: 2,
                height: "100%",
                backgroundColor: "rgba(254,223,181,0.5)",
                shadowColor: "#FEDFB5",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
              }}
            />
            <View
              className="absolute items-center justify-center bg-surface"
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                borderWidth: 2,
                borderColor: "#FEDFB5",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Ionicons name="swap-horizontal" size={20} color="#FEDFB5" />
            </View>
          </View>
        </View>

        {/* Info */}
        <View className="mt-8" style={{ gap: 16 }}>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 22, lineHeight: 28 }}
          >
            Before & After
          </Text>
          <Text
            className="font-body text-on-surface-variant"
            style={{ fontSize: 14, lineHeight: 22 }}
          >
            Compare your original space with the AI-generated redesign side by
            side.
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="mt-10" style={{ gap: 16 }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <LinearGradient
              colors={["#C4A882", "#A68A62"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-row items-center justify-between rounded-xl"
              style={{ paddingVertical: 16, paddingHorizontal: 24 }}
            >
              <Text
                className="font-label font-semibold"
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#281801",
                }}
              >
                Back to Result
              </Text>
              <Ionicons name="arrow-back" size={20} color="#281801" />
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
