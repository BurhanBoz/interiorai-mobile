import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useDrawer } from "@/components/layout/DrawerProvider";
import { useState, useEffect, useMemo } from "react";
import * as userService from "@/services/user";
import { pushWithReturn } from "@/utils/navigation";

/* ─────────────────── Credit Ring ─────────────────── */
function CreditRing({
  value,
  max = 200,
  size = 64,
}: {
  value: number;
  max?: number;
  size?: number;
}) {
  const strokeWidth = 3;
  const progress = Math.min(value / max, 1);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Track circle */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: "rgba(77,70,60,0.20)",
        }}
      />
      {/* Progress arc (approximation using border trick) */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: "#E0C29A",
          borderTopColor: progress > 0.25 ? "#E0C29A" : "transparent",
          borderRightColor: progress > 0.5 ? "#E0C29A" : "transparent",
          borderBottomColor: progress > 0.75 ? "#E0C29A" : "transparent",
          borderLeftColor: progress > 0 ? "#E0C29A" : "transparent",
          transform: [{ rotate: "-90deg" }],
          opacity: progress > 0 ? 1 : 0,
        }}
      />
      <Text className="font-headline text-on-surface" style={{ fontSize: 22 }}>
        {value}
      </Text>
    </View>
  );
}

/* ─────────────────── Menu Items ─────────────────── */
const MENU_ITEMS: {
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  hasBadge?: boolean;
}[] = [
  { labelKey: "profile.curated_favorites", icon: "heart", route: "/(tabs)/gallery" },
  { labelKey: "profile.notifications", icon: "notifications", route: "/settings/notifications", hasBadge: true },
  { labelKey: "profile.credit_packs", icon: "flash-outline", route: "/credits/packs" },
  { labelKey: "profile.billing_history", icon: "card-outline", route: "/credits" },
  { labelKey: "profile.manage_plan", icon: "ribbon-outline", route: "/plans" },
  { labelKey: "profile.privacy_data", icon: "shield-checkmark-outline", route: "/settings/privacy" },
];

/* ─────────────────── Main Screen ─────────────────── */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const balance = useCreditStore(s => s.balance);
  const monthlyLimit = useCreditStore(s => s.monthlyLimit);
  const planCode = useCreditStore(s => s.planCode);
  const subscription = useSubscriptionStore(s => s.subscription);
  const fetchSubscription = useSubscriptionStore(s => s.fetchSubscription);
  const fetchPlans = useSubscriptionStore(s => s.fetchPlans);
  const fetchBalance = useCreditStore(s => s.fetchBalance);
  const [deleting, setDeleting] = useState(false);

  // Fetch fresh data on mount
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
  const badgeLabel = planLabel?.toUpperCase() ?? null;

  // Compute renewal text from subscription period
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

  // Initials for avatar fallback
  const initials = useMemo(() => {
    if (!displayName) return null;
    return (
      displayName
        .split(" ")
        .filter(w => w.length > 0)
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || null
    );
  }, [displayName]);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

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

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* ── Top App Bar ── */}
      <View
        className="flex-row items-center justify-between px-6"
        style={{ height: 56 }}
      >
        <Pressable onPress={openDrawer} hitSlop={8}>
          <Ionicons name="menu" size={24} color="#E5E2E1" />
        </Pressable>
        <Text
          className="font-headline text-on-surface"
          style={{
            fontSize: 14,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {t("app.name")}
        </Text>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.20)",
            backgroundColor: "#2A2A2A",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {initials ? (
            <Text
              className="font-label"
              style={{ fontSize: 11, color: "#E0C29A", fontWeight: "700" }}
            >
              {initials}
            </Text>
          ) : (
            <Ionicons name="person" size={16} color="#998F84" />
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Profile Hero Section (centered) ── */}
        <View
          className="items-center"
          style={{ paddingTop: 32, marginBottom: 40 }}
        >
          {/* Avatar + PRO badge */}
          <View style={{ marginBottom: 24 }}>
            <View
              className="rounded-xl overflow-hidden items-center justify-center"
              style={{
                width: 100,
                height: 120,
                backgroundColor: "#2A2A2A",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              {initials ? (
                <Text
                  className="font-headline"
                  style={{ fontSize: 36, color: "#E0C29A" }}
                >
                  {initials}
                </Text>
              ) : (
                <Ionicons name="person" size={48} color="#998F84" />
              )}
            </View>
            {/* PRO badge – bottom-right */}
            {!isFree && (
              <View
                style={{
                  position: "absolute",
                  bottom: -8,
                  right: -8,
                }}
              >
                <LinearGradient
                  colors={["#C4A882", "#A68A62"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 9999,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Text
                    className="font-label text-on-primary"
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      letterSpacing: 2,
                      textTransform: "uppercase",
                    }}
                  >
                    {badgeLabel}
                  </Text>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Name */}
          {displayName && (
            <Text
              className="text-on-surface font-headline"
              style={{ fontSize: 22, marginBottom: 4 }}
            >
              {displayName}
            </Text>
          )}

          {/* Email */}
          {email ? (
            <Text
              className="text-on-surface-variant font-body"
              style={{ fontSize: 12, fontWeight: "300", letterSpacing: 0.5 }}
            >
              {email}
            </Text>
          ) : null}
        </View>

        {/* ── Stats Row ── */}
        <View className="flex-row px-6" style={{ gap: 12, marginBottom: 48 }}>
          {/* Credits Card */}
          <View
            className="flex-1 bg-surface-container-low rounded-xl items-center justify-center"
            style={{ padding: 20 }}
          >
            <View style={{ marginBottom: 12 }}>
              <CreditRing value={balance} max={monthlyLimit || 200} />
            </View>
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 11,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              {t("profile.credits_label")}
            </Text>
          </View>

          {/* Plan Card */}
          <View
            className="flex-1 bg-surface-container-low rounded-xl justify-center"
            style={{ padding: 20 }}
          >
            <Text
              className="font-label text-secondary"
              style={{
                fontSize: 10,
                fontWeight: "600",
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {t("plans.current_plan")}
            </Text>
            <Text
              className="font-headline text-on-surface"
              style={{ fontSize: 22, lineHeight: 26 }}
            >
              {planLabel}
            </Text>
            {renewalText && (
              <Text
                className="font-body text-on-surface-variant"
                style={{ fontSize: 11, marginTop: 4 }}
              >
                {renewalText}
              </Text>
            )}
          </View>
        </View>

        {/* ── Account Settings ── */}
        <View className="px-6">
          <Text
            className="font-label text-secondary"
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            {t("drawer.settings")}
          </Text>

          <View>
            {MENU_ITEMS.map(item => (
              <Pressable
                key={item.labelKey}
                onPress={() => {
                  if (item.route) pushWithReturn(item.route, "profile");
                }}
                className="flex-row items-center active:opacity-70"
                style={{
                  paddingVertical: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(77,70,60,0.20)",
                }}
              >
                <View style={{ position: "relative" }}>
                  <Ionicons name={item.icon} size={22} color="#D1C5B8" />
                  {item.hasBadge && (
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#E0C29A",
                        borderWidth: 2,
                        borderColor: "#131313",
                      }}
                    />
                  )}
                </View>
                <Text
                  className="text-on-surface font-body flex-1"
                  style={{ fontSize: 15, marginLeft: 16 }}
                >
                  {t(item.labelKey)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#4D463C" />
              </Pressable>
            ))}

            {/* Sign Out */}
            <Pressable
              onPress={logout}
              className="flex-row items-center active:opacity-70"
              style={{ paddingVertical: 20, marginTop: 8 }}
            >
              <Ionicons name="log-out-outline" size={22} color="#E0C29A" />
              <Text
                className="font-body flex-1"
                style={{
                  fontSize: 15,
                  marginLeft: 16,
                  color: "#E0C29A",
                  fontWeight: "500",
                }}
              >
                {t("drawer.sign_out")}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Footer Watermark ── */}
        <View className="items-center" style={{ paddingVertical: 32, gap: 8 }}>
          <Text
            className="font-label"
            style={{
              fontSize: 11,
              color: "#998F84",
              letterSpacing: 4,
              textTransform: "uppercase",
              fontWeight: "500",
            }}
          >
            {t("app.name")}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: "rgba(153,143,131,0.6)",
              fontFamily: "monospace",
            }}
          >
            v{appVersion}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
