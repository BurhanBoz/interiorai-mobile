import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTranslation } from "react-i18next";

const DECORATIVE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDU7r9__I63ld_MU2Pfj2wo4UQW6Lod_d9FztpK-PPyFScIcA-Dzu3UBr_pv75_4cYqjqDU4uNbcDz1l73QcJrsit8NhR-WBYFxOJJuoZ7ub6D5R4Hbbklqd8ZcXl6a5QnecpAFpbVlYw6Ao0philBKEn5_Lyw3TiConpiymRFfz9U28XJv5pkC21S9zUFdeCRtIP-3NqR0tYcvBzA-_6vnqFna2-ioWWxAvSos3aW25W6lXCVyKEy7AUodKT4kgNVMr8wNLOkCfcM";

export default function CreditsExhaustedScreen() {
  const { t } = useTranslation();
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
          {t("app.name")}
        </Text>
        <UserAvatar size="sm" onPress />
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
              {t("profile.credits_label")}
            </Text>
          </View>
        </View>

        {/* Headline & Body */}
        <View className="items-center" style={{ marginBottom: 48 }}>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 28, lineHeight: 34, marginBottom: 16 }}
          >
            {t("credits_exhausted.title")}
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
            {t("credits_exhausted.description")}
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
              {t("credits_exhausted.pro_recommendation")}
            </Text>
            <Text
              className="font-body text-on-surface-variant"
              style={{ fontSize: 14, lineHeight: 22, marginBottom: 32 }}
            >
              {t("credits_exhausted.upgrade_copy")}
            </Text>

            {/* Signature CTA */}
            <PrimaryButton label={t("credits_exhausted.view_plans")} onPress={() => router.push("/plans")} />

            {/* One-time credit pack alternative */}
            <Pressable
              onPress={() => router.push("/credits/packs")}
              style={{ marginTop: 16, alignItems: "center" }}
            >
              <Text
                className="font-body text-on-surface-variant"
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  textDecorationLine: "underline",
                  textDecorationColor: "rgba(224,194,154,0.3)",
                }}
              >
                {t("credits_bridge.or_buy_credits")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
