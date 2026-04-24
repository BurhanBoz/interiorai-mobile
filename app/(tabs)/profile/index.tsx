import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useDrawer } from "@/components/layout/DrawerProvider";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { TierBadge } from "@/components/ui/TierBadge";
import { ListItem } from "@/components/ui/ListItem";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/brand/Brand";
import { useState, useEffect, useMemo } from "react";
import type { ComponentProps } from "react";
import * as userService from "@/services/user";
import { pushWithReturn } from "@/utils/navigation";
import { theme } from "@/config/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

/* ─────────────────── Credit Ring ─────────────────── */
/**
 * The circular progress ring around the balance. When `max` is unknown
 * we draw just the track + center number — no fake-full ring that would
 * mislead a user into thinking they have unlimited credits.
 */
function CreditRing({
  value,
  max,
  size = 72,
}: {
  value: number;
  max: number | null;
  size?: number;
}) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const hasMax = !!max && max > 0;
  const progress = hasMax ? Math.min(value / max, 1) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        style={{
          position: "absolute",
          transform: [{ rotate: "-90deg" }],
        }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(77,70,60,0.3)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {hasMax ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.color.goldMidday}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      <Text
        style={{
          fontFamily: "NotoSerif",
          fontSize: 22,
          color: theme.color.onSurface,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/* ─────────────────── Menu Items ─────────────────── */

interface MenuItemConfig {
  labelKey: string;
  descriptionKey?: string;
  icon: IconName;
  route?: string;
  hasBadge?: boolean;
  extraParams?: Record<string, string>;
}

// All icons are outline-style for consistency — previously "heart" was
// filled while everything else was outline, which read as an accidental
// emphasis on one row.
const MENU_ITEMS: MenuItemConfig[] = [
  {
    labelKey: "profile.curated_favorites",
    icon: "heart-outline",
    route: "/(tabs)/gallery",
    extraParams: { filter: "favorites" },
  },
  {
    labelKey: "profile.notifications",
    icon: "notifications-outline",
    route: "/settings/notifications",
    hasBadge: true,
  },
  {
    labelKey: "profile.credit_packs",
    icon: "flash-outline",
    route: "/credits/packs",
  },
  {
    labelKey: "profile.billing_history",
    icon: "receipt-outline",
    route: "/credits",
  },
  {
    labelKey: "profile.manage_plan",
    icon: "ribbon-outline",
    route: "/plans",
  },
  {
    labelKey: "profile.privacy_data",
    icon: "shield-checkmark-outline",
    route: "/settings/privacy",
  },
];

/* ─────────────────── Main Screen ─────────────────── */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const balance = useCreditStore((s) => s.balance);
  const monthlyLimit = useCreditStore((s) => s.monthlyLimit);
  const planCode = useCreditStore((s) => s.planCode);
  const subscription = useSubscriptionStore((s) => s.subscription);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
  const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
  const fetchBalance = useCreditStore((s) => s.fetchBalance);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBalance();
    fetchPlans()
      .then(() => fetchSubscription())
      .catch(() => {});
  }, []);

  const displayName = user?.displayName ?? null;
  const email = user?.email || "";
  const isFree = !planCode || planCode === "FREE";
  const planLabel = subscription?.planName ?? (isFree ? t("profile.free") : planCode);

  // Renewal copy — "renews in 30 days" / "renews tomorrow" / "renews today"
  const renewalText = useMemo(() => {
    if (!subscription?.currentPeriodEnd) return null;
    const end = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (diffDays === 0) return t("profile.renews_today");
    if (diffDays === 1) return t("profile.renews_tomorrow");
    return t("profile.renews_in_days", { days: diffDays });
  }, [subscription?.currentPeriodEnd, t]);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const hasLimit = monthlyLimit > 0;

  const handleDeleteAccount = () => {
    Alert.alert(
      t("profile.delete_confirm_title"),
      t("profile.delete_confirm_description"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.delete_confirm_continue"),
          style: "destructive",
          onPress: () => {
            Alert.prompt(
              t("profile.delete_confirm_prompt_title"),
              t("profile.delete_confirm_prompt_description"),
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("profile.delete_my_account"),
                  style: "destructive",
                  onPress: async (value: string | undefined) => {
                    if (value !== "DELETE") {
                      Alert.alert(
                        t("common.confirm"),
                        t("profile.delete_must_type"),
                      );
                      return;
                    }
                    setDeleting(true);
                    try {
                      await userService.deleteAccount();
                      await logout();
                      router.replace("/(auth)/login");
                    } catch (e: any) {
                      Alert.alert(
                        t("errors.generic"),
                        e?.response?.data?.message ??
                          t("profile.delete_failed"),
                      );
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ],
              "plain-text",
            );
          },
        },
      ],
    );
  };

  const handleSignOut = () =>
    Alert.alert(
      t("drawer.sign_out_confirm_title"),
      t("drawer.sign_out_confirm_description"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("drawer.sign_out"),
          style: "destructive",
          onPress: logout,
        },
      ],
    );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: theme.color.surface }}>
      {/* ── Top App Bar ── */}
      <View
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
        }}
      >
        <Pressable onPress={openDrawer} hitSlop={8} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="menu" size={22} color={theme.color.onSurface} />
        </Pressable>
        <Brand variant="inline" size="sm" tone="gold" />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Identity — compact horizontal ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            paddingHorizontal: 24,
            paddingTop: 24,
            marginBottom: 32,
          }}
        >
          <UserAvatar size="hero" />
          <View style={{ flex: 1 }}>
            {displayName ? (
              <Text
                style={{
                  fontFamily: "NotoSerif",
                  fontSize: 22,
                  lineHeight: 28,
                  color: theme.color.onSurface,
                  letterSpacing: -0.1,
                }}
                numberOfLines={1}
              >
                {displayName}
              </Text>
            ) : null}
            {email ? (
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 13,
                  color: theme.color.onSurfaceVariant,
                  marginTop: 2,
                  letterSpacing: 0.2,
                }}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {email}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <TierBadge tier={planCode ?? "FREE"} size="sm" label={planLabel?.toUpperCase()} />
            </View>
          </View>
        </View>

        {/* ── Vault — unified balance card ── */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <View
            style={{
              padding: 24,
              borderRadius: 20,
              backgroundColor: "rgba(225,195,155,0.05)",
              borderWidth: 1,
              borderColor: "rgba(225,195,155,0.22)",
              ...theme.elevation.goldGlowSoft,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter-SemiBold",
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: theme.color.goldMidday,
                }}
              >
                {t("profile.available_balance") ?? "Available Balance"}
              </Text>
              <CreditRing value={balance} max={hasLimit ? monthlyLimit : null} size={44} />
            </View>

            <Text
              style={{
                fontFamily: "NotoSerif",
                fontSize: 44,
                lineHeight: 50,
                letterSpacing: -0.8,
                color: theme.color.onSurface,
                fontVariant: ["tabular-nums"],
              }}
            >
              {balance}
              {hasLimit ? (
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 18,
                    color: theme.color.onSurfaceMuted,
                  }}
                >
                  {" "}
                  / {monthlyLimit}
                </Text>
              ) : null}
            </Text>
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 13,
                lineHeight: 18,
                color: theme.color.onSurfaceVariant,
                marginTop: 6,
              }}
            >
              {hasLimit
                ? `${t("plans.monthly_credits", { defaultValue: "monthly credits" })}${renewalText ? ` · ${renewalText.toLowerCase()}` : ""}`
                : t("plans.credits_never_expire", {
                    defaultValue: "Credits never expire",
                  })}
            </Text>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 20,
              }}
            >
              <Button
                title={t("profile.buy_credits") ?? "Buy Credits"}
                variant="secondary"
                size="sm"
                onPress={() => router.push("/credits/packs")}
                fullWidth
                style={{ flex: 1 }}
              />
              {isFree ? (
                <Button
                  title={t("profile.upgrade") ?? "Upgrade"}
                  variant="primary"
                  size="sm"
                  onPress={() => router.push("/plans")}
                  fullWidth
                  style={{ flex: 1 }}
                />
              ) : (
                <Button
                  title={t("profile.manage") ?? "Manage"}
                  variant="primary"
                  size="sm"
                  onPress={() => router.push("/plans")}
                  fullWidth
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </View>
        </View>

        {/* ── Settings ── */}
        <View style={{ paddingHorizontal: 24 }}>
          <SectionHeader
            title={t("drawer.settings")}
            serif={false}
            style={{ marginBottom: 4 }}
          />
          <View
            style={{
              borderRadius: 16,
              backgroundColor: theme.color.surfaceContainerLow,
              borderWidth: 1,
              borderColor: "rgba(77,70,60,0.18)",
              paddingHorizontal: 16,
              paddingVertical: 4,
            }}
          >
            {MENU_ITEMS.map((item, idx) => (
              <ListItem
                key={item.labelKey}
                icon={item.icon}
                label={t(item.labelKey)}
                onPress={() => {
                  if (item.route)
                    pushWithReturn(item.route, "profile", item.extraParams);
                }}
                last={idx === MENU_ITEMS.length - 1}
                trailing={
                  item.hasBadge ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: theme.color.goldMidday,
                        }}
                      />
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="rgba(153,143,132,0.55)"
                      />
                    </View>
                  ) : undefined
                }
              />
            ))}
          </View>

          {/* Sign Out — quiet destructive, separated from the settings group */}
          <View style={{ marginTop: 20 }}>
            <Button
              title={t("drawer.sign_out")}
              variant="destructive"
              size="md"
              onPress={handleSignOut}
              iconLeft
              icon="log-out-outline"
            />
          </View>

          {/* Delete account — the quietest possible CTA */}
          <Pressable
            onPress={handleDeleteAccount}
            disabled={deleting}
            hitSlop={10}
            style={({ pressed }) => ({
              alignSelf: "center",
              marginTop: 16,
              opacity: pressed ? 0.6 : 0.7,
            })}
          >
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 12,
                color: theme.color.onSurfaceMuted,
                textDecorationLine: "underline",
                letterSpacing: 0.3,
              }}
            >
              {t("profile.delete_my_account")}
            </Text>
          </Pressable>
        </View>

        {/* ── Footer ── */}
        <View style={{ alignItems: "center", paddingVertical: 36, gap: 8 }}>
          <Brand variant="wordmark" size="xs" tone="muted" />
          <Text
            style={{
              fontSize: 10,
              color: "rgba(153,143,131,0.55)",
              fontFamily: "Courier",
              letterSpacing: 1,
            }}
          >
            v{appVersion}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
