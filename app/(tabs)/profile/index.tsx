import { View, Text, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
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
import { Brand } from "@/components/brand/Brand";
import { useState, useEffect, useMemo } from "react";
import type { ComponentProps } from "react";
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

  // Generic fit: the inner diameter must hold the full number. Pick the
  // font size so the label width stays inside the ring regardless of how
  // many digits the balance has (1 → bold, 9999 → still clean).
  const label = value >= 10000 ? `${Math.floor(value / 1000)}k` : String(value);
  const innerDiameter = size - strokeWidth * 2 - 4;
  const baseFont = size * 0.46;
  // Each digit is ≈ 0.58× the font size in tabular-nums; cap the width.
  const digitWidth = 0.58;
  const widthBudget = innerDiameter / (label.length * digitWidth);
  const fontSize = Math.min(baseFont, widthBudget);

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
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={{
          fontFamily: "NotoSerif",
          fontSize,
          lineHeight: fontSize * 1.1,
          color: theme.color.onSurface,
          fontVariant: ["tabular-nums"],
          maxWidth: innerDiameter,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/* ─────────────────── Gold Action Button ─────────────────── */
/**
 * Compact gold-gradient CTA used inside the balance card. Both buttons on
 * that row share this component so they match exactly and split the row
 * cleanly (flex:1, no width:"100%"). Label auto-shrinks for longer copy so
 * "UPGRADE NOW" doesn't push the card edge off-screen.
 */
function GoldActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <LinearGradient
        colors={theme.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: 42,
          borderRadius: 12,
          paddingHorizontal: 14,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(63,45,17,0.18)",
        }}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{
            fontFamily: "Inter-SemiBold",
            fontSize: 12,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: theme.color.onGold,
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

/* ─────────────────── Menu Items ─────────────────── */

interface MenuItemConfig {
  labelKey: string;
  descriptionKey?: string;
  icon: IconName;
  route?: string;
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
  {
    labelKey: "profile.terms",
    icon: "document-text-outline",
    route: "/settings/terms",
  },
  // GDPR Art. 15/20 export endpoint stays live (backend), but the in-app UI
  // entry is hidden for v1 — Apple 5.1.1(ix) is satisfied via support email.
  // Re-add this row when self-service export becomes a priority.
];

/* ─────────────────── Main Screen ─────────────────── */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();
  const user = useAuthStore((s) => s.user);
  const balance = useCreditStore((s) => s.balance);
  const monthlyLimit = useCreditStore((s) => s.monthlyLimit);
  const planCode = useCreditStore((s) => s.planCode);
  const welcomeBonusActive = useCreditStore((s) => s.welcomeBonusActive);
  const welcomeBonusExpiresAt = useCreditStore((s) => s.welcomeBonusExpiresAt);
  const subscription = useSubscriptionStore((s) => s.subscription);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
  const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
  const fetchBalance = useCreditStore((s) => s.fetchBalance);
  // Real unread-notification count, sourced from the same hook the
  // Notifications screen uses. 0 → no dot; > 0 → the gold pill shows.

  useEffect(() => {
    fetchBalance();
    fetchPlans()
      .then(() => fetchSubscription())
      .catch(() => {});
  }, []);

  const displayName = user?.displayName ?? null;
  const email = user?.email || "";

  // Effective tier — what the user FEELS like, not what the backend record
  // says. Welcome bonus grants 7-day MAX-tier access on top of the FREE plan,
  // so the badge + label should read "MAX" during the trial window even
  // though `planCode === "FREE"` server-side.
  const isOnTrial = welcomeBonusActive === true;
  const effectiveTier: "FREE" | "BASIC" | "PRO" | "MAX" = isOnTrial
    ? "MAX"
    : (planCode === "BASIC" || planCode === "PRO" || planCode === "MAX")
      ? planCode
      : "FREE";
  const isFree = effectiveTier === "FREE";
  const planLabel = isOnTrial
    ? t("profile.max_trial", { defaultValue: "MAX TRIAL" })
    : (subscription?.planName ?? (isFree ? t("profile.free") : planCode));

  // Trial countdown — "7d left", "1d left", "ends today". Replaces the
  // misleading "renews in 30 days" copy during the welcome bonus window
  // (FREE plan doesn't renew, drip resumes after trial expires).
  const trialDaysLeft = useMemo(() => {
    if (!isOnTrial || !welcomeBonusExpiresAt) return null;
    const end = new Date(welcomeBonusExpiresAt);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return 0;
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [isOnTrial, welcomeBonusExpiresAt]);

  // Renewal copy — paid plans only. FREE uses daily drip (no renewal cycle).
  // Trial uses the dedicated trial countdown above.
  const renewalText = useMemo(() => {
    if (isOnTrial) {
      if (trialDaysLeft == null) return null;
      if (trialDaysLeft === 0) return t("profile.trial_ends_today", { defaultValue: "Trial ends today" });
      if (trialDaysLeft === 1) return t("profile.trial_ends_tomorrow", { defaultValue: "Trial ends tomorrow" });
      return t("profile.trial_ends_in_days", { days: trialDaysLeft, defaultValue: `Trial ends in ${trialDaysLeft} days` });
    }
    // Hide renewal copy for FREE — FREE replenishes via daily drip, no monthly renewal.
    if (isFree) return null;
    if (!subscription?.currentPeriodEnd) return null;
    const end = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (diffDays === 0) return t("profile.renews_today");
    if (diffDays === 1) return t("profile.renews_tomorrow");
    return t("profile.renews_in_days", { days: diffDays });
  }, [isOnTrial, trialDaysLeft, isFree, subscription?.currentPeriodEnd, t]);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  // The "X / Y" divisor only makes sense for paid plans where Y is the
  // monthly allocation. FREE uses daily drip (cap=7/10) — showing "X / 10"
  // implies a monthly ceiling that doesn't match the actual mechanic, so we
  // suppress the divisor for FREE + trial. Paid users still see "150 / 150".
  const showCreditDivisor = !isFree && !isOnTrial && monthlyLimit > 0;

  const handleDeleteAccount = () => {
    router.push("/settings/delete-account");
  };

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
              <TierBadge tier={effectiveTier} size="sm" label={planLabel?.toUpperCase()} />
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
              <CreditRing value={balance} max={showCreditDivisor ? monthlyLimit : null} size={44} />
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
              {showCreditDivisor ? (
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
              {isOnTrial
                ? renewalText /* "Trial ends in 7 days" */
                : isFree
                  ? t("profile.free_drip_caption", {
                      defaultValue: "1 credit/day + 3 every Monday",
                    })
                  : showCreditDivisor
                    ? `${t("plans.monthly_credits", { defaultValue: "monthly credits" })}${renewalText ? ` · ${renewalText.toLowerCase()}` : ""}`
                    : t("plans.credits_never_expire", {
                        defaultValue: "Credits never expire",
                      })}
            </Text>

            {/* Two gold CTAs, flex:1 each — no fullWidth prop because the
                Button primitive's width:100% fights with the flex share and
                pushes the right button outside the card. Custom Pressable +
                LinearGradient guarantees they split the row evenly and sit
                inside the card bounds. */}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 20,
              }}
            >
              <GoldActionButton
                label={t("profile.buy_credits") ?? "Buy Credits"}
                onPress={() => router.push("/credits/packs")}
              />
              <GoldActionButton
                label={
                  isFree
                    ? (t("profile.upgrade") ?? "Upgrade")
                    : (t("profile.manage") ?? "Manage")
                }
                onPress={() => router.push("/plans")}
              />
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
              />
            ))}
          </View>

          {/* Sign Out — red, icon + label side-by-side. Reimplemented as a
              Pressable to guarantee a single horizontal row (the shared
              destructive Button variant was rendering inconsistently across
              devices). */}
          {/* Sign Out intentionally lives only in the side drawer now —
              Profile already has the identity + plan + settings surface, and
              a second sign-out affordance duplicated the drawer's. Delete
              account stays here because it's profile-lifecycle, not session. */}
          <Pressable
            onPress={handleDeleteAccount}
            hitSlop={10}
            style={({ pressed }) => ({
              alignSelf: "center",
              marginTop: 28,
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: theme.color.danger,
              borderRadius: 10,
              opacity: pressed ? 0.6 : 0.9,
            })}
          >
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 12,
                color: theme.color.danger,
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
