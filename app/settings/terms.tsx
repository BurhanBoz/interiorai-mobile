import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/layout/TopBar";
import { useBackHandler } from "@/utils/navigation";
import { theme } from "@/config/theme";

/**
 * Terms of Service — App Store 5.1.1(ix) + GDPR Art. 13 + KVKK §10 compliant.
 * Section-driven pattern mirroring [privacy.tsx](./privacy.tsx) so the two
 * legal screens read as a coherent pair. Canonical text lives in
 * [docs/legal/TERMS_OF_SERVICE.md](../../docs/legal/TERMS_OF_SERVICE.md);
 * this in-app version is a per-locale readable summary.
 */

const SECTION_KEYS = [
  { titleKey: "settings.terms_section1_title", bodyKey: "settings.terms_section1_body" },
  { titleKey: "settings.terms_section2_title", bodyKey: "settings.terms_section2_body" },
  { titleKey: "settings.terms_section3_title", bodyKey: "settings.terms_section3_body" },
  { titleKey: "settings.terms_section4_title", bodyKey: "settings.terms_section4_body" },
  { titleKey: "settings.terms_section5_title", bodyKey: "settings.terms_section5_body" },
  { titleKey: "settings.terms_section6_title", bodyKey: "settings.terms_section6_body" },
  { titleKey: "settings.terms_section7_title", bodyKey: "settings.terms_section7_body" },
  { titleKey: "settings.terms_section8_title", bodyKey: "settings.terms_section8_body" },
  { titleKey: "settings.terms_section9_title", bodyKey: "settings.terms_section9_body" },
  { titleKey: "settings.terms_section10_title", bodyKey: "settings.terms_section10_body" },
  { titleKey: "settings.terms_section11_title", bodyKey: "settings.terms_section11_body" },
  { titleKey: "settings.terms_section12_title", bodyKey: "settings.terms_section12_body" },
];

export default function TermsScreen() {
  const { t } = useTranslation();
  const handleBack = useBackHandler("/(tabs)/profile");
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.color.surface }}
    >
      <TopBar title={t("settings.terms_title")} showBack onBack={handleBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: 24, gap: 16 }}>
          <Text
            style={{
              fontFamily: "Inter-SemiBold",
              fontSize: 10,
              letterSpacing: 2.2,
              textTransform: "uppercase",
              color: theme.color.goldMidday,
            }}
          >
            {t("settings.terms_eyebrow")}
          </Text>
          <Text
            style={{
              fontFamily: "NotoSerif",
              fontSize: 42,
              lineHeight: 48,
              letterSpacing: -0.5,
              color: theme.color.onSurface,
            }}
          >
            {t("settings.terms_headline")}
          </Text>
          <Text
            style={{
              fontFamily: "NotoSerif",
              fontSize: 18,
              lineHeight: 26,
              letterSpacing: -0.1,
              color: theme.color.onSurfaceVariant,
              marginTop: 4,
            }}
          >
            {t("settings.terms_tagline")}
          </Text>
          <View
            style={{
              width: "100%",
              height: 1,
              backgroundColor: "rgba(225,195,155,0.25)",
              marginTop: 20,
            }}
          />
        </View>

        <View style={{ gap: 36, marginTop: 40 }}>
          {SECTION_KEYS.map((section, idx) => (
            <View key={section.titleKey}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 1.5,
                    borderRadius: 1,
                    backgroundColor: theme.color.goldMidday,
                    opacity: 0.8,
                  }}
                />
                <Text
                  style={{
                    fontFamily: "Inter-SemiBold",
                    fontSize: 10,
                    letterSpacing: 1.8,
                    textTransform: "uppercase",
                    color: theme.color.goldMidday,
                  }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "NotoSerif",
                  fontSize: 22,
                  lineHeight: 28,
                  letterSpacing: -0.1,
                  color: theme.color.onSurface,
                  marginBottom: 10,
                }}
              >
                {t(section.titleKey)}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  lineHeight: 22,
                  color: theme.color.onSurfaceVariant,
                }}
              >
                {t(section.bodyKey)}
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 12,
            lineHeight: 18,
            color: theme.color.onSurfaceVariant,
            opacity: 0.6,
            marginTop: 48,
            textAlign: "center",
          }}
        >
          {t("settings.terms_footer")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
