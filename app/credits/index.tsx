import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useBackHandler } from "@/utils/navigation";
import * as creditsService from "@/services/credits";
import * as promoService from "@/services/promo";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { TopBar } from "@/components/layout/TopBar";
import { theme } from "@/config/theme";
import type { CreditLedgerEntry } from "@/types/api";

/**
 * Reference features to show pricing for. Each one resolves to a label and
 * a credit cost pulled from the subscription store's creditRules. Features
 * that the current plan does not support are filtered out at render time.
 */
const REFERENCE_FEATURES: {
  code: string;
  tier: string | null;
  labelKey: string;
}[] = [
  { code: "INTERIOR_REDESIGN", tier: "STANDARD", labelKey: "credits.ref_standard_redesign" },
  { code: "INTERIOR_REDESIGN", tier: "HD",       labelKey: "credits.ref_hd_redesign" },
  { code: "INPAINT",           tier: "STANDARD", labelKey: "credits.ref_inpaint" },
  { code: "STYLE_TRANSFER",    tier: "STANDARD", labelKey: "credits.ref_style_transfer" },
  { code: "EMPTY_ROOM",        tier: "STANDARD", labelKey: "credits.ref_empty_room" },
  { code: "ULTRA_HD_UPSCALE",  tier: null,       labelKey: "credits.ref_upscale" },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
}

/* ─────────────────── Ledger Row ───────────────────
 * Premium redesign — 48px thumb, monospace amount, kind badge pill, chevron
 * when the entry links to a job. Kind badge (RESERVE/CONSUME/RELEASE/TOPUP/
 * REFUND) comes from the ledger entry's `kind` field; fallback derives from
 * the reason string so historical rows without the field still render. */
function kindBadgeKey(kind: string | undefined, reason: string): string {
  const k = (kind ?? reason.split(" ")[0] ?? "").toUpperCase();
  if (k.startsWith("RESERVE")) return "RESERVE";
  if (k.startsWith("CONSUME")) return "CONSUME";
  if (k.startsWith("RELEASE")) return "RELEASE";
  if (k.startsWith("TOPUP")) return "TOPUP";
  if (k.startsWith("REFUND")) return "REFUND";
  if (k.startsWith("GRANT")) return "GRANT";
  return "ACTIVITY";
}

function LedgerRow({ item, t }: { item: CreditLedgerEntry; t: (k: string) => string }) {
  const isPositive = item.amount > 0;
  const kind = kindBadgeKey((item as any).kind, item.reason);
  const amountColor = isPositive ? "#8FE3A1" : "#FFB4AB";
  return (
    <Pressable
      onPress={() => {
        if (item.jobId) router.push(`/result/${item.jobId}`);
      }}
      className="flex-row items-center bg-surface-container-low rounded-xl"
      style={({ pressed }) => ({
        marginBottom: 10,
        padding: 14,
        opacity: pressed ? 0.85 : 1,
        borderWidth: 1,
        borderColor: "rgba(77,70,60,0.18)",
      })}
    >
      {/* Thumbnail — 48x48, rounded, job preview if available */}
      <View
        className="rounded-lg overflow-hidden bg-surface-container-high items-center justify-center"
        style={{ width: 48, height: 48, marginRight: 14 }}
      >
        {item.jobId ? (
          <Image
            source={{ uri: `https://picsum.photos/seed/${item.jobId}/96` }}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
          />
        ) : (
          <Ionicons
            name={isPositive ? "add-circle-outline" : "wallet-outline"}
            size={22}
            color="rgba(224,194,154,0.5)"
          />
        )}
      </View>

      {/* Info */}
      <View className="flex-1" style={{ marginRight: 10 }}>
        <View className="flex-row items-center" style={{ gap: 6, marginBottom: 4 }}>
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: "rgba(225,195,155,0.14)",
            }}
          >
            <Text
              className="font-label"
              style={{
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 1.2,
                color: "#E0C29A",
              }}
            >
              {t(`credits.kind_${kind.toLowerCase()}`)}
            </Text>
          </View>
          <Text
            className="font-label"
            style={{
              fontSize: 10,
              fontWeight: "500",
              letterSpacing: 0.8,
              color: "#998F84",
            }}
          >
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <Text
          className="font-body text-on-surface"
          style={{ fontSize: 14, fontWeight: "500" }}
          numberOfLines={1}
        >
          {item.reason}
        </Text>
      </View>

      {/* Amount + chevron */}
      <View className="items-end" style={{ gap: 2 }}>
        <Text
          className="font-headline"
          style={{
            fontSize: 17,
            color: amountColor,
            letterSpacing: 0.5,
          }}
        >
          {isPositive ? "+" : ""}
          {item.amount}
        </Text>
        {item.jobId && (
          <Ionicons
            name="chevron-forward"
            size={14}
            color="#998F84"
          />
        )}
      </View>
    </Pressable>
  );
}

/* ─────────────────── Main Screen ─────────────────── */
export default function CreditsScreen() {
  const { t } = useTranslation();
  const balance = useCreditStore(s => s.balance);
  const planCode = useCreditStore(s => s.planCode);
  const fetchBalance = useCreditStore(s => s.fetchBalance);
  const creditRules = useSubscriptionStore(s => s.creditRules);
  const features = useSubscriptionStore(s => s.features);
  const subscription = useSubscriptionStore(s => s.subscription);
  const fetchSubscription = useSubscriptionStore(s => s.fetchSubscription);
  const fetchPlans = useSubscriptionStore(s => s.fetchPlans);

  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"ALL" | "EARNED" | "SPENT">(
    "ALL",
  );

  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const handleBack = useBackHandler("/(tabs)/profile");

  // Derived: when the current period ends, how many days from now, and how
  // full the progress bar should look (balance as % of monthly allocation).
  const resetDateFormatted = useMemo(() => {
    if (!subscription?.currentPeriodEnd) return null;
    const d = new Date(subscription.currentPeriodEnd);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [subscription?.currentPeriodEnd]);

  const daysRemaining = useMemo(() => {
    if (!subscription?.currentPeriodEnd) return 0;
    const diffMs = new Date(subscription.currentPeriodEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [subscription?.currentPeriodEnd]);

  const monthlyLimit = useCreditStore((s) => s.monthlyLimit);
  const progressPct = monthlyLimit > 0 ? Math.min(1, balance / monthlyLimit) : 0;

  // Filter the ledger for the ALL/EARNED/SPENT tabs. Positive = earned
  // (grants/topups/refunds/release), negative = spent (reserve/consume).
  const filteredLedger = useMemo(() => {
    if (activityFilter === "ALL") return ledger;
    if (activityFilter === "EARNED") return ledger.filter(l => l.amount > 0);
    return ledger.filter(l => l.amount < 0);
  }, [ledger, activityFilter]);

  // "Spent this month" — sum of negative entries within the active period.
  // Gives the user a quick sense of burn rate without scrolling the list.
  const spentThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return ledger
      .filter(l => l.amount < 0 && new Date(l.createdAt).getTime() >= startOfMonth)
      .reduce((sum, l) => sum + Math.abs(l.amount), 0);
  }, [ledger]);

  // Reference guide — resolve each feature's credit cost from the plan's
  // creditRules. Skip features the plan doesn't include.
  const referenceItems = useMemo(() => {
    if (creditRules.length === 0) return [];
    return REFERENCE_FEATURES.map((ref) => {
      const feat = features.find((f) => f.featureCode === ref.code);
      if (feat && !feat.enabled) return null;
      const rule = creditRules.find(
        (r) =>
          r.featureCode === ref.code &&
          (ref.tier ? r.qualityTier === ref.tier : true) &&
          (r.numOutputs === 1 || r.numOutputs === null),
      );
      if (!rule) return null;
      return { labelKey: ref.labelKey, cost: rule.creditCost };
    }).filter((x): x is { labelKey: string; cost: number } => x !== null);
  }, [creditRules, features]);

  useEffect(() => {
    fetchBalance();
    loadLedger(0);
  }, []);

  const loadLedger = async (p: number) => {
    if (loadingLedger) return;
    setLoadingLedger(true);
    try {
      const data = await creditsService.getLedger(p, 20);
      setLedger(prev => (p === 0 ? data.content : [...prev, ...data.content]));
      setIsLast(data.last);
      setPage(p);
    } catch {
      // silently fail
    } finally {
      setLoadingLedger(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!isLast && !loadingLedger) {
      loadLedger(page + 1);
    }
  }, [isLast, loadingLedger, page]);

  const handleRedeemPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError("");
    setPromoLoading(true);
    try {
      const result = await promoService.redeemPromo(promoCode.trim());
      Alert.alert(t("credits.promo_success_title"), result.message);
      setPromoCode("");
      setPromoExpanded(false);
      fetchBalance();
      loadLedger(0);
    } catch (e: any) {
      setPromoError(
        e?.response?.data?.message ?? t("credits.promo_failed_title"),
      );
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: theme.color.surface }}>
      {/* Billing-history header — brand mark + quick-access avatar.
          Back button behavior routes through useBackHandler so the
          "profile → credits → back" loop lands on Profile, not the
          tab-bar root. */}
      <TopBar
        showBranding
        onBack={handleBack}
        showBack
        rightElement={<UserAvatar size="sm" onPress />}
      />

      <FlatList
        data={filteredLedger}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <LedgerRow item={item} t={t} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* ── Hero Balance Section ── */}
            <View
              className="items-center"
              style={{ paddingTop: 32, paddingBottom: 32 }}
            >
              <Text
                className="font-label text-secondary"
                style={{
                  fontSize: 11,
                  fontWeight: "500",
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {t("credits.available_balance")}
              </Text>
              <Text
                className="font-headline text-on-surface"
                style={{ fontSize: 72, lineHeight: 80, marginBottom: 16 }}
              >
                {balance}
              </Text>
              <Text
                className="font-body text-on-surface-variant"
                style={{ fontSize: 14, fontWeight: "300", fontStyle: "italic" }}
              >
                {t("credits.credits_in_vault")}
              </Text>
            </View>

            {/* ── Upgrade Banner ── */}
            <Pressable
              onPress={() => router.push("/plans")}
              style={{ marginBottom: 12 }}
            >
              <LinearGradient
                colors={["#C4A882", "#A68A62"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: 56,
                  borderRadius: 16,
                  paddingHorizontal: 24,
                  borderWidth: 1,
                  borderColor: "rgba(196,168,130,0.3)",
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "#3F2D11",
                  }}
                >
                  {t("credits.upgrade_banner")}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
              </LinearGradient>
            </Pressable>

            {/* ── One-time Credit Pack Banner ── */}
            <Pressable
              onPress={() => router.push("/credits/packs")}
              style={{ marginBottom: 48 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: 56,
                  borderRadius: 16,
                  paddingHorizontal: 24,
                  borderWidth: 1,
                  borderColor: "#4D463C",
                  backgroundColor: "transparent",
                }}
              >
                <Text
                  numberOfLines={1}
                  className="font-label text-secondary"
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  {t("credits.one_time_banner")}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#E0C29A" />
              </View>
            </Pressable>

            {/* ── Reference Guide ── */}
            {referenceItems.length > 0 && (
              <View
                className="bg-surface-container-low rounded-xl"
                style={{ padding: 24, marginBottom: 48 }}
              >
                <View
                  className="flex-row items-center justify-between"
                  style={{ marginBottom: 8 }}
                >
                  <Text
                    className="font-label text-secondary"
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 3,
                      textTransform: "uppercase",
                    }}
                  >
                    {t("credits.reference_guide")}
                  </Text>
                  {subscription?.planName && (
                    <Text
                      className="font-label"
                      style={{
                        fontSize: 10,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        color: "#E0C29A",
                      }}
                    >
                      {subscription.planName}
                    </Text>
                  )}
                </View>
                <Text
                  className="font-body text-on-surface-variant"
                  style={{ fontSize: 12, marginBottom: 16 }}
                >
                  {t("credits.reference_guide_subtitle")}
                </Text>
                {referenceItems.map((item, i) => (
                  <View key={item.labelKey}>
                    <View
                      className="flex-row items-center justify-between"
                      style={{ paddingVertical: 8 }}
                    >
                      <Text
                        className="font-body text-on-surface"
                        style={{ fontSize: 14, fontWeight: "500" }}
                      >
                        {t(item.labelKey)}
                      </Text>
                      <Text
                        className="font-headline text-secondary"
                        style={{ fontSize: 14 }}
                      >
                        {t("credits.credit_count", { count: item.cost })}
                      </Text>
                    </View>
                    {i < referenceItems.length - 1 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: "rgba(77,70,60,0.20)",
                          marginVertical: 8,
                        }}
                      />
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* ── Next Cycle & Progress ── */}
            {subscription?.currentPeriodEnd && (
              <View
                className="bg-surface-container-low rounded-xl"
                style={{ padding: 24, marginBottom: 48 }}
              >
                <View style={{ marginBottom: 24 }}>
                  <Text
                    className="font-label text-secondary"
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 3,
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    {t("credits.next_cycle")}
                  </Text>
                  <Text
                    className="font-body text-on-surface-variant"
                    style={{ fontSize: 14 }}
                  >
                    {t("credits.balance_reset_on", { date: resetDateFormatted })}
                  </Text>
                </View>

                {/* Progress bar */}
                <View
                  className="bg-surface-container-highest rounded-full overflow-hidden"
                  style={{ height: 8, marginBottom: 12 }}
                >
                  <LinearGradient
                    colors={["#C4A882", "#A68A62"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      width: `${Math.round(progressPct * 100)}%`,
                      height: "100%",
                      borderRadius: 9999,
                    }}
                  />
                </View>
                <View className="items-end">
                  <Text
                    className="font-label text-secondary"
                    style={{
                      fontSize: 11,
                      fontWeight: "500",
                      letterSpacing: 3,
                      textTransform: "uppercase",
                    }}
                  >
                    {t("credits.days_remaining", { count: daysRemaining })}
                  </Text>
                </View>
              </View>
            )}

            {/* ── Monthly Usage Header + Filter Chips ── */}
            <View
              className="flex-row items-center justify-between"
              style={{ marginBottom: 16 }}
            >
              <Text
                className="font-label text-secondary"
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                {t("credits.monthly_usage")}
              </Text>
              {spentThisMonth > 0 && (
                <Text
                  className="font-label"
                  style={{
                    fontSize: 11,
                    fontWeight: "500",
                    letterSpacing: 1.5,
                    color: "#998F84",
                  }}
                >
                  {t("credits.billing_spent_this_month", {
                    amount: spentThisMonth,
                  })}
                </Text>
              )}
            </View>

            {/* Filter chips */}
            <View
              className="flex-row"
              style={{ gap: 8, marginBottom: 20 }}
            >
              {(["ALL", "EARNED", "SPENT"] as const).map(f => {
                const active = activityFilter === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setActivityFilter(f)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active
                        ? "rgba(254,223,181,0.6)"
                        : "rgba(77,70,60,0.4)",
                      backgroundColor: active
                        ? "rgba(225,195,155,0.15)"
                        : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: active ? "700" : "500",
                        color: active ? "#E0C29A" : "#E5E2E1",
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                      }}
                    >
                      {t(`credits.filter_${f.toLowerCase()}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          !loadingLedger ? (
            <View className="items-center" style={{ paddingVertical: 32 }}>
              <Ionicons
                name="receipt-outline"
                size={36}
                color="#998F84"
                style={{ marginBottom: 12 }}
              />
              <Text
                className="font-headline text-on-surface text-center"
                style={{ fontSize: 16, marginBottom: 6 }}
              >
                {t(
                  activityFilter === "ALL"
                    ? "credits.empty_title"
                    : "credits.empty_filtered_title",
                )}
              </Text>
              <Text
                className="font-body text-on-surface-variant text-center"
                style={{
                  fontSize: 13,
                  maxWidth: 280,
                  lineHeight: 20,
                  marginBottom: 18,
                }}
              >
                {t(
                  activityFilter === "ALL"
                    ? "credits.empty_subtitle"
                    : "credits.empty_filtered_subtitle",
                )}
              </Text>
              {activityFilter === "ALL" && (
                <Pressable
                  onPress={() => router.push("/(tabs)/studio")}
                  style={{
                    paddingHorizontal: 22,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "#C4A882",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: "#C4A882",
                      letterSpacing: 2,
                      textTransform: "uppercase",
                    }}
                  >
                    {t("credits.empty_cta")}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null
        }
        ListFooterComponent={
          <View>
            {loadingLedger && (
              <ActivityIndicator
                color="#E0C29A"
                style={{ marginVertical: 16 }}
              />
            )}

            {/* ── Promo Code Section ── */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "rgba(77,70,60,0.20)",
                paddingTop: 32,
                marginTop: 16,
              }}
            >
              <Pressable
                onPress={() => setPromoExpanded(!promoExpanded)}
                className="flex-row items-center justify-between"
                style={{ marginBottom: promoExpanded ? 24 : 0 }}
              >
                <Text
                  className="font-label text-secondary"
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 3,
                    textTransform: "uppercase",
                  }}
                >
                  {t("credits.promo_code_label")}
                </Text>
                <Ionicons
                  name={promoExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#E0C29A"
                />
              </Pressable>

              {promoExpanded && (
                <View className="flex-row" style={{ gap: 12 }}>
                  <TextInput
                    value={promoCode}
                    onChangeText={setPromoCode}
                    placeholder={t("credits.promo_placeholder")}
                    placeholderTextColor="rgba(209,197,184,0.4)"
                    autoCapitalize="characters"
                    editable={!promoLoading}
                    className="flex-1 bg-surface-container-high rounded-lg text-on-surface"
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 14,
                      letterSpacing: 3,
                    }}
                  />
                  <Pressable
                    onPress={handleRedeemPromo}
                    disabled={promoLoading}
                    style={{
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#C4A882",
                      justifyContent: "center",
                      alignItems: "center",
                      opacity: promoLoading ? 0.5 : 1,
                    }}
                  >
                    {promoLoading ? (
                      <ActivityIndicator color="#C4A882" size="small" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#C4A882",
                          letterSpacing: 3,
                          textTransform: "uppercase",
                        }}
                      >
                        {t("credits.promo_apply")}
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}

              {promoError !== "" && (
                <Text
                  className="font-body"
                  style={{
                    fontSize: 12,
                    color: "#ffb4ab",
                    marginTop: 8,
                  }}
                >
                  {promoError}
                </Text>
              )}
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}
