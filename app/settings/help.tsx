import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";

const SUPPORT_EMAIL = "support@thearchitecturallens.com";

// Single source of truth for which FAQs render. Question/answer strings
// come from i18n — never hardcode English here (8 locales must stay in sync).
const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

function AccordionItem({
  questionKey,
  answerKey,
  defaultOpen = false,
}: {
  questionKey: string;
  answerKey: string;
  defaultOpen?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Pressable
      onPress={() => setOpen(!open)}
      className="bg-surface-container-high rounded-xl p-6"
      style={
        open
          ? { borderWidth: 1, borderColor: "rgba(225,195,155,0.2)" }
          : undefined
      }
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="font-body font-medium flex-1 mr-3"
          style={{ fontSize: 16, color: open ? "#E1C39B" : "#E5E2E1" }}
        >
          {t(questionKey)}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={open ? "#E1C39B" : "#998F84"}
        />
      </View>
      {open && (
        <Text
          className="font-body text-on-surface-variant mt-4"
          style={{ fontSize: 14, lineHeight: 22, fontWeight: "300" }}
        >
          {t(answerKey)}
        </Text>
      )}
    </Pressable>
  );
}

export default function HelpScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const user = useAuthStore(s => s.user);
  const subscription = useSubscriptionStore(s => s.subscription);
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  // Client-side filter over the translated q/a pair so search works in the
  // active language, not just English.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return FAQ_KEYS.filter(key => {
      if (!query) return true;
      const q = t(`settings.help_faq_${key}_q`).toLowerCase();
      const a = t(`settings.help_faq_${key}_a`).toLowerCase();
      return q.includes(query) || a.includes(query);
    });
  }, [search, t]);

  const openSupportMail = () => {
    const subject = t("settings.help_mail_subject");
    const body = t("settings.help_mail_body", {
      version: appVersion,
      userId: user?.id ?? "—",
      plan: subscription?.planCode ?? "FREE",
    });
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* TopAppBar — back + centered title. Previous layout had a wide
          uppercased brand name plus a decorative avatar placeholder, which
          overflowed on iPhone SE. Short title + spacer = symmetric flex. */}
      <View
        className="bg-surface px-6 flex-row items-center justify-between"
        style={{ height: 64 }}
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
            color: "#E1C39B",
          }}
        >
          {t("settings.help_title_header")}
        </Text>
        {/* Symmetric spacer so the title centers optically */}
        <View style={{ width: 40, height: 40 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-32"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View className="mb-12 mt-8">
          <Text
            className="font-headline text-on-background mb-4"
            style={{ fontSize: 48, lineHeight: 54 }}
          >
            {t("settings.help_title")}
          </Text>
          <View
            className="mb-6"
            style={{ width: 96, height: 4, backgroundColor: "#C4A882" }}
          />
          <Text
            className="font-body text-on-surface-variant"
            style={{ fontSize: 14, lineHeight: 22, maxWidth: 320 }}
          >
            {t("settings.help_hero_subtitle")}
          </Text>
        </View>

        {/* Search Bar */}
        <View className="mb-12">
          <Text
            className="font-label text-outline mb-3"
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            {t("settings.help_search_label")}
          </Text>
          <View className="relative">
            <View className="bg-surface-container-low rounded-xl flex-row items-center">
              <Ionicons
                name="search"
                size={20}
                color="#998F84"
                style={{ position: "absolute", left: 16, zIndex: 1 }}
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t("settings.help_search_placeholder")}
                placeholderTextColor="rgba(153,143,132,0.5)"
                className="flex-1 font-body text-on-surface"
                style={{
                  fontSize: 14,
                  paddingVertical: 16,
                  paddingLeft: 48,
                  paddingRight: 16,
                }}
              />
              {search.length > 0 && (
                <Pressable
                  onPress={() => setSearch("")}
                  hitSlop={8}
                  style={{ position: "absolute", right: 16 }}
                >
                  <Ionicons name="close-circle" size={18} color="#998F84" />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View className="mb-16">
          <Text
            className="font-headline text-on-background mb-8"
            style={{ fontSize: 20 }}
          >
            {t("settings.help_faq_title")}
          </Text>
          <View style={{ gap: 24 }}>
            {filtered.map((key, idx) => (
              <AccordionItem
                key={key}
                questionKey={`settings.help_faq_${key}_q`}
                answerKey={`settings.help_faq_${key}_a`}
                defaultOpen={idx === 0 && !search}
              />
            ))}
            {filtered.length === 0 && (
              <Text
                className="font-body text-on-surface-variant text-center py-8"
                style={{ fontSize: 14 }}
              >
                {t("settings.help_no_results", { query: search })}
              </Text>
            )}
          </View>
        </View>

        {/* Contact Section */}
        <View className="bg-surface-container-low rounded-xl p-8 mb-16 items-center">
          <Text
            className="font-headline text-on-background mb-6"
            style={{ fontSize: 20 }}
          >
            {t("settings.help_still_curious")}
          </Text>
          <View className="w-full mb-6">
            <PrimaryButton
              label={t("settings.help_contact_us")}
              leftIcon="mail-outline"
              onPress={openSupportMail}
            />
          </View>
          <View className="items-center" style={{ gap: 4 }}>
            <Text
              className="font-label text-outline"
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {t("settings.help_direct_channel")}
            </Text>
            <Pressable onPress={openSupportMail}>
              <Text
                className="font-label font-bold"
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#C4A882",
                }}
              >
                {SUPPORT_EMAIL}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Version Footer */}
        <View className="items-center pb-12">
          <Text
            className="font-label text-center"
            style={{
              fontSize: 10,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#998F84",
              opacity: 0.5,
            }}
          >
            {t("settings.help_version_label", { version: appVersion })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
