import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as userService from "@/services/user";
import type { NotificationPreferences } from "@/types/api";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useCreditStore } from "@/stores/creditStore";

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}

function ToggleRow({ label, description, value, onToggle }: ToggleRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      className="bg-surface-container-low flex-row items-center justify-between"
      style={{ padding: 20 }}
    >
      <View className="flex-1 mr-4">
        <Text
          className="font-body text-on-surface"
          style={{ fontSize: 14, fontWeight: "500", letterSpacing: 0.3 }}
        >
          {label}
        </Text>
        <Text
          className="font-body text-on-surface-variant"
          style={{ fontSize: 12, marginTop: 4 }}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#353534", true: "#FEDFB5" }}
        thumbColor={value ? "#281801" : "#d1c5b8"}
        ios_backgroundColor="#353534"
      />
    </Pressable>
  );
}

type UpsellCard = {
  key: string;
  titleKey: string;
  descKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  showForPlans: string[]; // empty = all
};

// Plan-aware upsell feed. Filtered at render time against the user's active
// plan so Max users don't see Max upgrades, Free users see everything.
const UPSELL_CARDS: UpsellCard[] = [
  {
    key: "style_transfer",
    titleKey: "settings.notifications_upsell_style_transfer_title",
    descKey: "settings.notifications_upsell_style_transfer_desc",
    icon: "swap-horizontal",
    showForPlans: ["FREE", "BASIC", "PRO"],
  },
  {
    key: "commercial",
    titleKey: "settings.notifications_upsell_commercial_title",
    descKey: "settings.notifications_upsell_commercial_desc",
    icon: "briefcase",
    showForPlans: ["FREE", "BASIC"],
  },
  {
    key: "hd",
    titleKey: "settings.notifications_upsell_hd_title",
    descKey: "settings.notifications_upsell_hd_desc",
    icon: "sparkles",
    showForPlans: ["FREE"],
  },
  {
    key: "credits",
    titleKey: "settings.notifications_upsell_credits_title",
    descKey: "settings.notifications_upsell_credits_desc",
    icon: "flash",
    showForPlans: [], // everyone
  },
];

function UpsellCardView({ card }: { card: UpsellCard }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => router.push("/plans")}
      className="bg-surface-container-low rounded-xl"
      style={({ pressed }) => ({
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(225,195,155,0.18)",
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View className="flex-row" style={{ gap: 16 }}>
        <View
          className="rounded-full items-center justify-center"
          style={{
            width: 44,
            height: 44,
            backgroundColor: "rgba(225,195,155,0.12)",
            flexShrink: 0,
          }}
        >
          <Ionicons name={card.icon} size={20} color="#E0C29A" />
        </View>
        <View className="flex-1" style={{ gap: 4 }}>
          <Text
            className="font-body"
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: "#E5E2E1",
              letterSpacing: 0.2,
            }}
          >
            {t(card.titleKey)}
          </Text>
          <Text
            className="font-body text-on-surface-variant"
            style={{ fontSize: 13, lineHeight: 19 }}
          >
            {t(card.descKey)}
          </Text>
          <View
            className="flex-row items-center mt-2"
            style={{ gap: 6 }}
          >
            <Text
              className="font-label"
              style={{
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                fontWeight: "700",
                color: "#E0C29A",
              }}
            >
              {t("settings.notifications_upgrade_cta")}
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#E0C29A" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function NotificationsSettingsScreen() {
  const { t } = useTranslation();
  const planCode = useCreditStore(s => s.planCode);
  const subscription = useSubscriptionStore(s => s.subscription);
  const fetchSubscription = useSubscriptionStore(s => s.fetchSubscription);
  const [prefs, setPrefs] = useState<Omit<
    NotificationPreferences,
    "userId"
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription().catch(() => {});
    userService
      .getNotificationPreferences()
      .then(data => {
        const { userId, ...rest } = data;
        setPrefs(rest);
        setLoading(false);
      })
      .catch(() => {
        // Graceful fallback — push SDK / notification APIs may not be wired
        // yet (C3 backlog). Seed local defaults so toggles still render.
        setPrefs({
          pushEnabled: false,
          emailEnabled: false,
          renderComplete: true,
          weeklySummary: false,
          promotions: false,
        });
        setLoading(false);
      });
  }, [fetchSubscription]);

  const activePlan = subscription?.planCode ?? planCode ?? "FREE";
  const isMaxUser = activePlan === "MAX";

  const visibleCards = useMemo(() => {
    return UPSELL_CARDS.filter(c => {
      if (c.showForPlans.length === 0) return true;
      return c.showForPlans.includes(activePlan);
    });
  }, [activePlan]);

  const toggle = async (key: keyof Omit<NotificationPreferences, "userId">) => {
    if (!prefs) return;
    const newValue = !prefs[key];
    setPrefs({ ...prefs, [key]: newValue });
    try {
      const updated = await userService.updateNotificationPreferences({
        [key]: newValue,
      });
      const { userId, ...rest } = updated;
      setPrefs(rest);
    } catch {
      // Silent fail — leave optimistic UI value, backend will reconcile
      // when push SDK lands.
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* Header — back + centered title */}
      <View className="flex-row items-center px-6" style={{ height: 64 }}>
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
          {t("profile.notifications")}
        </Text>
        <View style={{ width: 40, height: 40 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial header */}
        <View style={{ marginTop: 24, marginBottom: 32 }}>
          <Text
            className="font-label text-primary"
            style={{
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 2.5,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            {t("settings.notifications_eyebrow")}
          </Text>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 30, lineHeight: 36 }}
          >
            {t("settings.notifications_headline")}
          </Text>
          <View
            className="bg-secondary mt-4"
            style={{ width: 36, height: 2, borderRadius: 1 }}
          />
          <Text
            className="font-body text-on-surface-variant mt-4"
            style={{ fontSize: 14, lineHeight: 22, maxWidth: 320 }}
          >
            {t("settings.notifications_hero_subtitle")}
          </Text>
        </View>

        {/* Section A — Announcements / Upsell Feed */}
        <View style={{ marginBottom: 48 }}>
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 16,
              paddingHorizontal: 4,
            }}
          >
            {t("settings.notifications_announcements_title")}
          </Text>

          {isMaxUser && (
            <View
              className="bg-surface-container-high rounded-xl mb-4"
              style={{
                padding: 18,
                borderWidth: 1,
                borderColor: "rgba(225,195,155,0.25)",
              }}
            >
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <Ionicons name="star" size={18} color="#E0C29A" />
                <Text
                  className="font-body flex-1"
                  style={{ fontSize: 14, color: "#E0C29A", fontWeight: "600" }}
                >
                  {t("settings.notifications_you_are_max")}
                </Text>
              </View>
            </View>
          )}

          <View style={{ gap: 12 }}>
            {visibleCards.map(card => (
              <UpsellCardView key={card.key} card={card} />
            ))}
          </View>
        </View>

        {/* Section B — Preferences */}
        <View style={{ marginBottom: 32 }}>
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 16,
              paddingHorizontal: 4,
            }}
          >
            {t("settings.notifications_preferences_title")}
          </Text>

          {loading ? (
            <ActivityIndicator color="#E1C39B" className="mt-8" />
          ) : prefs ? (
            <View>
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  marginBottom: 12,
                  marginTop: 8,
                  paddingHorizontal: 4,
                  opacity: 0.7,
                }}
              >
                {t("settings.notifications_push_title")}
              </Text>
              <View style={{ gap: 1, marginBottom: 24 }}>
                <ToggleRow
                  label={t("settings.notifications_pref_render_title")}
                  description={t("settings.notifications_pref_render_desc")}
                  value={prefs.renderComplete}
                  onToggle={() => toggle("renderComplete")}
                />
                <ToggleRow
                  label={t("settings.notifications_pref_push_title")}
                  description={t("settings.notifications_pref_push_desc")}
                  value={prefs.pushEnabled}
                  onToggle={() => toggle("pushEnabled")}
                />
                <ToggleRow
                  label={t("settings.notifications_pref_promo_title")}
                  description={t("settings.notifications_pref_promo_desc")}
                  value={prefs.promotions}
                  onToggle={() => toggle("promotions")}
                />
              </View>

              <Text
                className="font-label text-on-surface-variant"
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  marginBottom: 12,
                  paddingHorizontal: 4,
                  opacity: 0.7,
                }}
              >
                {t("settings.notifications_email_title")}
              </Text>
              <View style={{ gap: 1 }}>
                <ToggleRow
                  label={t("settings.notifications_pref_email_title")}
                  description={t("settings.notifications_pref_email_desc")}
                  value={prefs.emailEnabled}
                  onToggle={() => toggle("emailEnabled")}
                />
                <ToggleRow
                  label={t("settings.notifications_pref_weekly_title")}
                  description={t("settings.notifications_pref_weekly_desc")}
                  value={prefs.weeklySummary}
                  onToggle={() => toggle("weeklySummary")}
                />
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
