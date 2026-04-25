import { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
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
import { useBackHandler } from "@/utils/navigation";
import { Toggle } from "@/components/ui/Toggle";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { type InboxItem } from "@/hooks/useInbox";
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

/* ───────────── Inbox: row renderer (inbox itself comes from useInbox) ───── */

function formatRelativeTime(ms: number, t: (k: string, p?: any) => string): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return t("settings.notifications_time_now");
  if (diff < 60 * 60_000) {
    const m = Math.floor(diff / 60_000);
    return t("settings.notifications_time_minutes", { count: m });
  }
  if (diff < 24 * 60 * 60_000) {
    const h = Math.floor(diff / (60 * 60_000));
    return t("settings.notifications_time_hours", { count: h });
  }
  const d = Math.floor(diff / (24 * 60 * 60_000));
  return t("settings.notifications_time_days", { count: d });
}

function InboxRow({
  item,
  onPress,
}: {
  item: InboxItem;
  onPress: (item: InboxItem) => void;
}) {
  const { t } = useTranslation();
  const tint = item.read
    ? theme.color.onSurfaceMuted
    : theme.color.goldMidday;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => ({
        padding: 16,
        borderRadius: 14,
        backgroundColor: item.read
          ? "rgba(32,31,31,0.55)"
          : "rgba(225,195,155,0.06)",
        borderWidth: 1,
        borderColor: item.read
          ? "rgba(77,70,60,0.18)"
          : "rgba(225,195,155,0.24)",
        flexDirection: "row",
        gap: 14,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          backgroundColor: item.read
            ? "rgba(77,70,60,0.25)"
            : "rgba(225,195,155,0.12)",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Ionicons name={item.icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{
              flex: 1,
              fontFamily: "Inter-SemiBold",
              fontSize: 14,
              color: item.read
                ? theme.color.onSurfaceVariant
                : theme.color.onSurface,
              letterSpacing: 0.1,
            }}
            numberOfLines={1}
          >
            {t(item.titleKey)}
          </Text>
          {!item.read ? (
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: theme.color.goldMidday,
              }}
            />
          ) : null}
        </View>
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 13,
            lineHeight: 18,
            color: theme.color.onSurfaceVariant,
          }}
          numberOfLines={2}
        >
          {t(item.bodyKey, item.bodyParams ?? {})}
        </Text>
        <Text
          style={{
            marginTop: 4,
            fontFamily: "Inter-Medium",
            fontSize: 11,
            letterSpacing: 0.3,
            color: theme.color.onSurfaceMuted,
          }}
        >
          {formatRelativeTime(item.createdAt, t)}
        </Text>
      </View>
    </Pressable>
  );
}

/* ───────────── Animated dismiss wrapper for InboxRow ───────────── */

function AnimatedInboxRow({
  item,
  isDismissing,
  onPress,
  onRemove,
}: {
  item: InboxItem;
  isDismissing: boolean;
  onPress: (item: InboxItem) => void;
  onRemove: (id: string) => void;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDismissing) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 32,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start(() => onRemove(item.id));
    }
  }, [isDismissing]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <InboxRow item={item} onPress={onPress} />
    </Animated.View>
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
  const handleBack = useBackHandler("/(tabs)/profile");
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

  // TODO: Re-enable inbox state once backend /api/notifications is ready.
  // const computedInbox = useComputedInbox();
  // const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
  // const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  // const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  // const inbox = useMemo<InboxItem[]>(
  //   () =>
  //     computedInbox
  //       .filter((n) => !removedIds.has(n.id))
  //       .map((n) => ({ ...n, read: readOverrides[n.id] ?? n.read })),
  //   [computedInbox, readOverrides, removedIds],
  // );
  // const unreadCount = inbox.filter((n) => !n.read).length;
  // const handleInboxPress = useCallback((item: InboxItem) => {
  //   setReadOverrides((prev) => ({ ...prev, [item.id]: true }));
  //   setDismissingIds((prev) => new Set([...prev, item.id]));
  //   if (item.route) router.push(item.route as never);
  // }, []);
  // const handleRemove = useCallback((id: string) => {
  //   setRemovedIds((prev) => new Set([...prev, id]));
  //   setDismissingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  // }, []);
  // const markAllRead = useCallback(() => {
  //   const next: Record<string, boolean> = {};
  //   for (const n of inbox) next[n.id] = true;
  //   setReadOverrides(next);
  // }, [inbox]);

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
      <TopBar title={t("profile.notifications")} showBack onBack={handleBack} />

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

        {/* TODO: Inbox feed — temporarily disabled. Re-enable once backend
            grows a real /api/notifications endpoint. The AnimatedInboxRow
            + dismiss logic is fully wired; just uncomment this block.

        <View style={{ marginBottom: 40 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text
                style={{
                  fontFamily: "Inter-SemiBold",
                  fontSize: 13,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  color: theme.color.onSurfaceVariant,
                }}
              >
                {t("settings.notifications_inbox_title")}
              </Text>
              {unreadCount > 0 ? (
                <View
                  style={{
                    minWidth: 22,
                    height: 22,
                    paddingHorizontal: 7,
                    borderRadius: 11,
                    backgroundColor: theme.color.goldMidday,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter-SemiBold",
                      fontSize: 11,
                      color: theme.color.onGold,
                      letterSpacing: 0.2,
                    }}
                  >
                    {unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
            {unreadCount > 0 ? (
              <Pressable onPress={markAllRead} hitSlop={8}>
                <Text
                  style={{
                    fontFamily: "Inter-Medium",
                    fontSize: 12,
                    letterSpacing: 0.3,
                    color: theme.color.goldMidday,
                  }}
                >
                  {t("settings.notifications_mark_all_read")}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {inbox.length > 0 ? (
            <View style={{ gap: 10 }}>
              {inbox.map((item) => (
                <AnimatedInboxRow
                  key={item.id}
                  item={item}
                  isDismissing={dismissingIds.has(item.id)}
                  onPress={handleInboxPress}
                  onRemove={handleRemove}
                />
              ))}
            </View>
          ) : (
            <View
              style={{
                paddingVertical: 40,
                paddingHorizontal: 20,
                borderRadius: 16,
                backgroundColor: "rgba(32,31,31,0.55)",
                borderWidth: 1,
                borderColor: "rgba(77,70,60,0.18)",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Ionicons name="mail-open-outline" size={28} color={theme.color.onSurfaceMuted} />
              <Text
                style={{
                  fontFamily: "Inter-SemiBold",
                  fontSize: 14,
                  color: theme.color.onSurfaceVariant,
                  textAlign: "center",
                }}
              >
                {t("settings.notifications_inbox_empty_title")}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 12,
                  lineHeight: 18,
                  color: theme.color.onSurfaceMuted,
                  textAlign: "center",
                  maxWidth: 280,
                }}
              >
                {t("settings.notifications_inbox_empty_body")}
              </Text>
            </View>
          )}
        </View>
        */}

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
