import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
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
import { TopBar } from "@/components/layout/TopBar";
import { Toggle } from "@/components/ui/Toggle";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { theme } from "@/config/theme";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

/* ───────────── Toggle row ───────────── */

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  first?: boolean;
  last?: boolean;
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
  first = false,
  last = false,
}: ToggleRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderTopLeftRadius: first ? 14 : 0,
        borderTopRightRadius: first ? 14 : 0,
        borderBottomLeftRadius: last ? 14 : 0,
        borderBottomRightRadius: last ? 14 : 0,
        backgroundColor: theme.color.surfaceContainerLow,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: "rgba(77,70,60,0.18)",
        gap: 16,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "Inter-Medium",
            fontSize: 14,
            letterSpacing: 0.2,
            color: theme.color.onSurface,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 12,
            lineHeight: 16,
            color: theme.color.onSurfaceMuted,
            marginTop: 3,
          }}
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>
      <Toggle value={value} onValueChange={onToggle} />
    </Pressable>
  );
}

/* ───────────── Upsell feed ───────────── */

type UpsellCard = {
  key: string;
  titleKey: string;
  descKey: string;
  icon: IconName;
  showForPlans: string[]; // empty = all
};

const UPSELL_CARDS: UpsellCard[] = [
  {
    key: "style_transfer",
    titleKey: "settings.notifications_upsell_style_transfer_title",
    descKey: "settings.notifications_upsell_style_transfer_desc",
    icon: "swap-horizontal-outline",
    showForPlans: ["FREE", "BASIC", "PRO"],
  },
  {
    key: "commercial",
    titleKey: "settings.notifications_upsell_commercial_title",
    descKey: "settings.notifications_upsell_commercial_desc",
    icon: "briefcase-outline",
    showForPlans: ["FREE", "BASIC"],
  },
  {
    key: "hd",
    titleKey: "settings.notifications_upsell_hd_title",
    descKey: "settings.notifications_upsell_hd_desc",
    icon: "sparkles-outline",
    showForPlans: ["FREE"],
  },
  {
    key: "credits",
    titleKey: "settings.notifications_upsell_credits_title",
    descKey: "settings.notifications_upsell_credits_desc",
    icon: "flash-outline",
    showForPlans: [],
  },
];

function UpsellCardView({ card }: { card: UpsellCard }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => router.push("/plans")}
      style={({ pressed }) => ({
        padding: 18,
        borderRadius: 16,
        backgroundColor: "rgba(225,195,155,0.04)",
        borderWidth: 1,
        borderColor: "rgba(225,195,155,0.22)",
        transform: [{ scale: pressed ? 0.99 : 1 }],
        ...theme.elevation.goldGlowSoft,
      })}
    >
      <View style={{ flexDirection: "row", gap: 14 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "rgba(225,195,155,0.10)",
            borderWidth: 1,
            borderColor: "rgba(225,195,155,0.25)",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Ionicons
            name={card.icon}
            size={18}
            color={theme.color.goldMidday}
          />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              fontFamily: "Inter-SemiBold",
              fontSize: 15,
              color: theme.color.onSurface,
              letterSpacing: 0.1,
            }}
          >
            {t(card.titleKey)}
          </Text>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 13,
              lineHeight: 19,
              color: theme.color.onSurfaceVariant,
            }}
          >
            {t(card.descKey)}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter-SemiBold",
                fontSize: 10,
                letterSpacing: 1.8,
                textTransform: "uppercase",
                color: theme.color.goldMidday,
              }}
            >
              {t("settings.notifications_upgrade_cta")}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={12}
              color={theme.color.goldMidday}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/* ───────────── Main ───────────── */

export default function NotificationsSettingsScreen() {
  const { t } = useTranslation();
  const planCode = useCreditStore((s) => s.planCode);
  const subscription = useSubscriptionStore((s) => s.subscription);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
  const [prefs, setPrefs] = useState<Omit<
    NotificationPreferences,
    "userId"
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription().catch(() => {});
    userService
      .getNotificationPreferences()
      .then((data) => {
        const { userId, ...rest } = data;
        setPrefs(rest);
        setLoading(false);
      })
      .catch(() => {
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
    return UPSELL_CARDS.filter((c) => {
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
      /* keep optimistic value */
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.color.surface }}
    >
      <TopBar title={t("profile.notifications")} showBack />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial hero — sentence-case title, single eyebrow */}
        <View style={{ marginTop: 16, marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: "Inter-SemiBold",
              fontSize: 10,
              letterSpacing: 1.8,
              textTransform: "uppercase",
              color: "rgba(225,195,155,0.62)",
              marginBottom: 10,
            }}
          >
            {t("settings.notifications_eyebrow")}
          </Text>
          <Text
            style={{
              fontFamily: "NotoSerif",
              fontSize: 30,
              lineHeight: 36,
              letterSpacing: -0.3,
              color: theme.color.onSurface,
            }}
          >
            {t("settings.notifications_headline")}
          </Text>
          <View
            style={{
              width: 28,
              height: 1.5,
              borderRadius: 1,
              backgroundColor: theme.color.goldMidday,
              opacity: 0.8,
              marginTop: 12,
            }}
          />
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 14,
              lineHeight: 22,
              color: theme.color.onSurfaceVariant,
              maxWidth: 320,
              marginTop: 14,
            }}
          >
            {t("settings.notifications_hero_subtitle")}
          </Text>
        </View>

        {/* Announcements / upsell feed */}
        <View style={{ marginBottom: 40 }}>
          <SectionHeader
            title={t("settings.notifications_announcements_title")}
            serif={false}
            style={{ marginBottom: 12 }}
          />

          {isMaxUser ? (
            <View
              style={{
                padding: 16,
                borderRadius: 14,
                backgroundColor: "rgba(225,195,155,0.06)",
                borderWidth: 1,
                borderColor: "rgba(225,195,155,0.25)",
                marginBottom: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                ...theme.elevation.goldGlowSoft,
              }}
            >
              <Ionicons
                name="star"
                size={18}
                color={theme.color.goldMidday}
              />
              <Text
                style={{
                  flex: 1,
                  fontFamily: "Inter-Medium",
                  fontSize: 13,
                  color: theme.color.goldMidday,
                  letterSpacing: 0.2,
                }}
              >
                {t("settings.notifications_you_are_max")}
              </Text>
            </View>
          ) : null}

          <View style={{ gap: 12 }}>
            {visibleCards.map((card) => (
              <UpsellCardView key={card.key} card={card} />
            ))}
          </View>
        </View>

        {/* Preferences */}
        <View>
          <SectionHeader
            title={t("settings.notifications_preferences_title")}
            serif={false}
            style={{ marginBottom: 12 }}
          />

          {loading ? (
            <ActivityIndicator
              color={theme.color.goldMidday}
              style={{ marginTop: 32 }}
            />
          ) : prefs ? (
            <View>
              <Text
                style={{
                  fontFamily: "Inter-SemiBold",
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: theme.color.onSurfaceMuted,
                  marginBottom: 10,
                  paddingLeft: 2,
                }}
              >
                {t("settings.notifications_push_title")}
              </Text>
              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(77,70,60,0.18)",
                  marginBottom: 28,
                  overflow: "hidden",
                }}
              >
                <ToggleRow
                  label={t("settings.notifications_pref_render_title")}
                  description={t("settings.notifications_pref_render_desc")}
                  value={prefs.renderComplete}
                  onToggle={() => toggle("renderComplete")}
                  first
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
                  last
                />
              </View>

              <Text
                style={{
                  fontFamily: "Inter-SemiBold",
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: theme.color.onSurfaceMuted,
                  marginBottom: 10,
                  paddingLeft: 2,
                }}
              >
                {t("settings.notifications_email_title")}
              </Text>
              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(77,70,60,0.18)",
                  overflow: "hidden",
                }}
              >
                <ToggleRow
                  label={t("settings.notifications_pref_email_title")}
                  description={t("settings.notifications_pref_email_desc")}
                  value={prefs.emailEnabled}
                  onToggle={() => toggle("emailEnabled")}
                  first
                />
                <ToggleRow
                  label={t("settings.notifications_pref_weekly_title")}
                  description={t("settings.notifications_pref_weekly_desc")}
                  value={prefs.weeklySummary}
                  onToggle={() => toggle("weeklySummary")}
                  last
                />
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
