import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/layout/TopBar";
import { theme } from "@/config/theme";

/**
 * Privacy policy — the app's single "tone of voice" moment. Deliberately
 * more editorial than every other screen: big display serif, intentional
 * pauses, section ornaments. This is where the user decides whether we're
 * trustworthy.
 *
 * Audit fixes:
 *   - Added a 20-22px sub-headline tier between the 48px display and the
 *     14px body. The old version jumped straight from 48 → 14 which felt
 *     abrupt, like a magazine without a subhead.
 *   - Gold ornament line above each numbered section — editorial print
 *     feel instead of a plain number badge.
 *   - Body uses a more generous 22px line-height for readability.
 */

const SECTION_KEYS = [
  {
    titleKey: "settings.privacy_section1_title",
    bodyKey: "settings.privacy_section1_body",
  },
  {
    titleKey: "settings.privacy_section2_title",
    bodyKey: "settings.privacy_section2_body",
  },
  {
    titleKey: "settings.privacy_section3_title",
    bodyKey: "settings.privacy_section3_body",
  },
  {
    titleKey: "settings.privacy_section4_title",
    bodyKey: "settings.privacy_section4_body",
  },
  {
    titleKey: "settings.privacy_section5_title",
    bodyKey: "settings.privacy_section5_body",
  },
  {
    titleKey: "settings.privacy_section6_title",
    bodyKey: "settings.privacy_section6_body",
  },
];

export default function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.color.surface }}
    >
      <TopBar title={t("settings.privacy_title")} showBack />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — ONE editorial eyebrow, display serif, sub-headline bridge,
            then a quiet divider to open the sections. */}
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
            {t("settings.privacy_eyebrow")}
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
            {t("settings.privacy_headline")}
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
            {t("settings.privacy_tagline")}
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

        {/* Numbered sections — each carries a 20px gold ornament line so
            the page reads like an editorial print piece, not a TOC. */}
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

        {/* Footer */}
        <View
          style={{
            alignItems: "center",
            marginTop: 48,
            gap: 8,
          }}
        >
          <View
            style={{
              width: 32,
              height: 1,
              backgroundColor: "rgba(225,195,155,0.25)",
            }}
          />
          <Text
            style={{
              fontFamily: "Inter-SemiBold",
              fontSize: 10,
              letterSpacing: 2.2,
              textTransform: "uppercase",
              color: theme.color.onSurfaceMuted,
            }}
          >
            {t("settings.privacy_last_updated")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
