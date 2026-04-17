import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const DECORATIVE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDU7r9__I63ld_MU2Pfj2wo4UQW6Lod_d9FztpK-PPyFScIcA-Dzu3UBr_pv75_4cYqjqDU4uNbcDz1l73QcJrsit8NhR-WBYFxOJJuoZ7ub6D5R4Hbbklqd8ZcXl6a5QnecpAFpbVlYw6Ao0philBKEn5_Lyw3TiConpiymRFfz9U28XJv5pkC21S9zUFdeCRtIP-3NqR0tYcvBzA-_6vnqFna2-ioWWxAvSos3aW25W6lXCVyKEy7AUodKT4kgNVMr8wNLOkCfcM";

export default function CreditsExhaustedScreen() {
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface">
      {/* ── Top App Bar ── */}
      <View
        className="flex-row items-center justify-between px-6"
        style={{ height: 56 }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#C4A882" />
        </Pressable>
        <Text
          className="font-headline text-on-surface"
          style={{
            fontSize: 14,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          The Architectural Lens
        </Text>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.20)",
          }}
        >
          <Image
            source={{ uri: "https://i.pravatar.cc/40?img=12" }}
            style={{ width: 32, height: 32 }}
            contentFit="cover"
          />
        </View>
      </View>

      {/* ── Main Content ── */}
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ paddingBottom: 24 }}
      >
        {/* Credit Ring */}
        <View
          className="items-center justify-center"
          style={{ width: 192, height: 192, marginBottom: 40 }}
        >
          <View
            style={{
              position: "absolute",
              width: 192,
              height: 192,
              borderRadius: 96,
              borderWidth: 8,
              borderColor: "#2A2A2A",
            }}
          />
          <View className="items-center">
            <Ionicons
              name="hourglass-outline"
              size={48}
              color="#998F84"
              style={{ opacity: 0.5, marginBottom: 8 }}
            />
            <Text
              className="font-headline text-on-surface"
              style={{ fontSize: 48, lineHeight: 52 }}
            >
              0
            </Text>
            <Text
              className="font-label text-secondary"
              style={{
                fontSize: 11,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              Credits left
            </Text>
          </View>
        </View>

        {/* Headline & Body */}
        <View className="items-center" style={{ marginBottom: 48 }}>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 28, lineHeight: 34, marginBottom: 16 }}
          >
            Out of Credits
          </Text>
          <Text
            className="font-body text-center"
            style={{
              fontSize: 14,
              lineHeight: 22,
              color: "rgba(224,194,154,0.8)",
              maxWidth: 280,
            }}
          >
            Your creative journey requires additional fuel. Credits reset in 18
            days.
          </Text>
        </View>

        {/* Pro Recommendation Card */}
        <View
          className="w-full rounded-xl bg-surface-container-low overflow-hidden"
          style={{ padding: 32 }}
        >
          {/* Decorative corner image */}
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 128,
              height: 128,
              opacity: 0.1,
            }}
          >
            <Image
              source={{ uri: DECORATIVE_IMG }}
              style={{ width: 128, height: 128 }}
              contentFit="cover"
            />
          </View>

          <View style={{ position: "relative", zIndex: 10 }}>
            <Text
              className="font-label text-secondary"
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 2.2,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Pro Recommendation
            </Text>
            <Text
              className="font-body text-on-surface-variant"
              style={{ fontSize: 14, lineHeight: 22, marginBottom: 32 }}
            >
              Upgrade your plan for more compute power and unlimited drafts.
            </Text>

            {/* Signature CTA */}
            <Pressable
              onPress={() => router.push("/plans")}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <LinearGradient
                colors={["#C4A882", "#A68A62"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: 56,
                  borderRadius: 16,
                  paddingHorizontal: 24,
                  borderWidth: 1,
                  borderColor: "rgba(196,168,130,0.3)",
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "#3F2D11",
                  }}
                >
                  View Plans
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
