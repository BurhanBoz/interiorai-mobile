import { View, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTranslation } from "react-i18next";

const IMG_PRIVACY =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBK4B8PnJI8QhWEUJB6nh2LZD_fvabBsAcLvseRcQc5QkoQ2V3TXcuWHGijSrVyvCznR2VukIjkHkkmYNYYMLZJP1dBm9LY32DKNPPuGZVdv2x4ed0ZATVBwdw1lUjN0WdcoMgAqHq0ql6tXDIJWJ5w1sv2ss8CZ60I9liyJYfPpsDuHRu98Bg8W9rCu_ZYpj6uibr9ul7cVNzm3lax5SG-T9UrZd7KHI3nrYyR9RHtfW97GpG7ncwCQmTc-MbEcM8p1yv-u54Nfrk";

const IMG_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCJ_xIdI1R2xlEvnwvhsr9Vc0jRmK0r0woVkuJOEYUzjKTNf9QorCldzZfZUWpZ-g6zB32fY9hm-RzEOLXtnxs9STCHvDYTJ8H1fhrdl7Ymzh3XpKuTeaCFh-7KuKUVs9ZCWsNol1eNttFhg6f1rfBmtTu_IMHHdfyhKAZvBUSvYMaSdSQzbHE6yfEF95nKYl-LLLcNu-LxnDb5Hycu7LvurnQmVRHWM_iCouintNSKkk4VT0uo9I9UuKyUj67NuHsVjTGgfyqQr6Q";

const BULLET_ITEMS = [
  "Photogrammetric room data and volumetric captures of private environments.",
  "Stylistic preferences and curation history within the visual lens interface.",
  "Technical metadata regarding architectural lighting and texture synthesis.",
];

export default function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* TopAppBar */}
      <View
        className="flex-row items-center justify-between px-6"
        style={{ height: 64, backgroundColor: "rgba(19,19,19,0.8)" }}
      >
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="w-10 h-10 items-center justify-center rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color="#C4A882" />
          </Pressable>
          <Text
            className="font-headline"
            style={{ fontSize: 18, color: "#C4A882" }}
          >
            {t("settings.privacy_title")}
          </Text>
        </View>
        <View
          className="rounded-full overflow-hidden bg-surface-container-high"
          style={{ width: 40, height: 40 }}
        >
          <Image
            source={{ uri: IMG_AVATAR }}
            style={{ width: 40, height: 40 }}
            contentFit="cover"
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-32"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View className="mt-8" style={{ gap: 16 }}>
          <Text
            className="font-label"
            style={{
              fontSize: 11,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#E0C29A",
            }}
          >
            THE ARCHITECTURAL LENS
          </Text>
          <Text
            className="font-headline text-on-background"
            style={{ fontSize: 56, lineHeight: 62 }}
          >
            Data{"\n"}Integrity.
          </Text>
          <View
            className="w-full mt-4"
            style={{ height: 1, backgroundColor: "rgba(224,194,154,0.3)" }}
          />
        </View>

        {/* Content Sections */}
        <View style={{ gap: 48, marginTop: 48 }}>
          {/* Section 1 — Information We Curate */}
          <View
            className="bg-surface-container-low rounded-xl p-8"
            style={{ gap: 24 }}
          >
            <Text
              className="font-headline"
              style={{ fontSize: 20, color: "#E0C29A" }}
            >
              1. Information We Curate
            </Text>
            <View style={{ gap: 16 }}>
              {BULLET_ITEMS.map((item, idx) => (
                <View
                  key={idx}
                  className="flex-row items-start"
                  style={{ gap: 16 }}
                >
                  <View
                    className="rounded-full mt-2"
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: "#E0C29A",
                      flexShrink: 0,
                    }}
                  />
                  <Text
                    className="font-body text-on-surface-variant flex-1"
                    style={{ fontSize: 14, lineHeight: 22 }}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Section 2 — Purpose of Processing */}
          <View style={{ gap: 24 }}>
            <Text
              className="font-headline"
              style={{ fontSize: 20, color: "#E0C29A" }}
            >
              2. Purpose of Processing
            </Text>
            <View
              className="w-full rounded-xl overflow-hidden"
              style={{ aspectRatio: 16 / 9 }}
            >
              <Image
                source={{ uri: IMG_PRIVACY }}
                style={{ width: "100%", height: "100%", opacity: 0.4 }}
                contentFit="cover"
              />
              <LinearGradient
                colors={["transparent", "transparent", "#131313"]}
                locations={[0, 0.4, 1]}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
            </View>
            <Text
              className="font-body text-on-surface-variant"
              style={{ fontSize: 14, lineHeight: 22 }}
            >
              We utilize your data to refine our generative algorithms, ensuring
              that every spatial suggestion adheres to the highest standards of
              architectural integrity and personal aesthetic resonance.
            </Text>
          </View>

          {/* Section 3 — Third-Party Collaboration */}
          <View
            className="bg-surface-container-high rounded-xl p-8"
            style={{ gap: 16 }}
          >
            <Text
              className="font-headline"
              style={{ fontSize: 20, color: "#E0C29A" }}
            >
              3. Third-Party Collaboration
            </Text>
            <Text
              className="font-body text-on-surface-variant"
              style={{ fontSize: 14, lineHeight: 22 }}
            >
              Selected design partners may receive anonymized stylistic data to
              facilitate the physical procurement of curated pieces. Your primary
              architectural lens data remains encrypted and sovereign to your
              device.
            </Text>
          </View>

          {/* Section 4 — Rights & Retention */}
          <View style={{ gap: 16 }}>
            <Text
              className="font-headline"
              style={{ fontSize: 20, color: "#E0C29A" }}
            >
              4. Rights & Retention
            </Text>
            <Text
              className="font-body text-on-surface-variant"
              style={{ fontSize: 14, lineHeight: 22 }}
            >
              You maintain the absolute right to purge all captured spatial data
              at any time. We retain design iterations for a maximum of 365 days
              unless explicitly archived for long-term project curation.
            </Text>
          </View>

          {/* CTA & Footer */}
          <View className="mt-8" style={{ gap: 24 }}>
            <PrimaryButton
              label={t("settings.privacy_acknowledge")}
              icon="checkmark-circle"
              onPress={() => router.back()}
            />
            <Text
              className="font-label text-outline text-center"
              style={{
                fontSize: 10,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              {t("settings.privacy_last_updated")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
