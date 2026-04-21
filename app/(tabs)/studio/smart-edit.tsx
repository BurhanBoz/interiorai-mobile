import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

/**
 * Smart Edit (INPAINT) — the mask-drawing UI isn't shipped yet. Until we
 * wire a real canvas (react-native-skia in a later sprint), we present a
 * branded "Coming Soon" screen so users who land here via the Options
 * chip get a clear message rather than a half-working tool.
 *
 * The INPAINT feature itself is wired end-to-end on the backend — once
 * the mask-drawing UX ships, this screen gets replaced, no backend work.
 */
export default function SmartEditComingSoonScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#131313" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingVertical: 16,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(42,42,42,0.8)",
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#E1C39B" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 32,
          paddingBottom: 120,
        }}
      >
        {/* Coming-soon mark */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <LinearGradient
            colors={["rgba(225,195,155,0.18)", "rgba(196,168,130,0.05)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "rgba(225,195,155,0.25)",
              marginBottom: 28,
            }}
          >
            <Ionicons name="brush-outline" size={40} color="#E1C39B" />
          </LinearGradient>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: "rgba(225,195,155,0.12)",
              borderWidth: 1,
              borderColor: "rgba(225,195,155,0.35)",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#E0C29A",
              }}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 2.2,
                color: "#E0C29A",
                textTransform: "uppercase",
              }}
            >
              {t("common.coming_soon")}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 32,
              lineHeight: 38,
              fontWeight: "700",
              color: "#E5E2E1",
              fontFamily: "NotoSerif",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {t("studio.mode_inpaint")}
          </Text>

          <Text
            style={{
              fontSize: 14,
              lineHeight: 22,
              color: "#998F84",
              textAlign: "center",
              maxWidth: 320,
            }}
          >
            {t("studio.smart_edit_coming_soon_body")}
          </Text>
        </View>

        {/* CTA back to studio */}
        <Pressable onPress={() => router.replace("/(tabs)/studio")}>
          <LinearGradient
            colors={["#C4A882", "#A68A62"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              height: 54,
              borderRadius: 14,
              gap: 10,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                letterSpacing: 1.8,
                textTransform: "uppercase",
                color: "#3F2D11",
              }}
            >
              {t("studio.back_to_studio")}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#3F2D11" />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
