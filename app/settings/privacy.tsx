import { View, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const SECTION_KEYS = [
  { titleKey: "settings.privacy_section1_title", bodyKey: "settings.privacy_section1_body" },
  { titleKey: "settings.privacy_section2_title", bodyKey: "settings.privacy_section2_body" },
  { titleKey: "settings.privacy_section3_title", bodyKey: "settings.privacy_section3_body" },
  { titleKey: "settings.privacy_section4_title", bodyKey: "settings.privacy_section4_body" },
  { titleKey: "settings.privacy_section5_title", bodyKey: "settings.privacy_section5_body" },
  { titleKey: "settings.privacy_section6_title", bodyKey: "settings.privacy_section6_body" },
];

export default function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* TopAppBar — back + centered title, no trailing avatar */}
      <View
        className="flex-row items-center px-6"
        style={{ height: 64, backgroundColor: "rgba(19,19,19,0.8)" }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center rounded-full"
        >
          <Ionicons name="arrow-back" size={24} color="#C4A882" />
        </Pressable>
        <Text
          className="font-headline flex-1 text-center"
          style={{
            fontSize: 17,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#C4A882",
          }}
        >
          {t("settings.privacy_title")}
        </Text>
        <View style={{ width: 40, height: 40 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-16"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
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
            {t("settings.privacy_eyebrow")}
          </Text>
          <Text
            className="font-headline text-on-background"
            style={{ fontSize: 48, lineHeight: 54 }}
          >
            {t("settings.privacy_headline")}
          </Text>
          <Text
            className="font-body text-on-surface-variant"
            style={{ fontSize: 14, lineHeight: 22, marginTop: 4 }}
          >
            {t("settings.privacy_tagline")}
          </Text>
          <View
            className="w-full mt-4"
            style={{ height: 1, backgroundColor: "rgba(224,194,154,0.3)" }}
          />
        </View>

        {/* Sections — MD-derived, 6 plain-reading blocks */}
        <View style={{ gap: 32, marginTop: 40 }}>
          {SECTION_KEYS.map((section, idx) => (
            <View
              key={section.titleKey}
              className="bg-surface-container-low rounded-xl p-6"
              style={{ gap: 14 }}
            >
              <View className="flex-row items-baseline" style={{ gap: 10 }}>
                <Text
                  className="font-label"
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    color: "#C4A882",
                    fontWeight: "700",
                  }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </Text>
                <Text
                  className="font-headline flex-1"
                  style={{ fontSize: 18, color: "#E0C29A", lineHeight: 24 }}
                >
                  {t(section.titleKey)}
                </Text>
              </View>
              <Text
                className="font-body text-on-surface-variant"
                style={{ fontSize: 14, lineHeight: 22 }}
              >
                {t(section.bodyKey)}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text
          className="font-label text-outline text-center mt-12"
          style={{
            fontSize: 10,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {t("settings.privacy_last_updated")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
