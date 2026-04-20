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

/* ─────────────────── Ledger Row ─────────────────── */
function LedgerRow({ item }: { item: CreditLedgerEntry }) {
  const isPositive = item.amount > 0;
  return (
    <Pressable
      onPress={() => {
        if (item.jobId) router.push(`/result/${item.jobId}`);
      }}
      className="flex-row items-center"
      style={{ marginBottom: 32 }}
    >
      {/* Thumbnail */}
      <View
        className="rounded-lg overflow-hidden bg-surface-container-high items-center justify-center"
        style={{ width: 40, height: 40, marginRight: 16 }}
      >
        {item.jobId ? (
          <Image
            source={{ uri: `https://picsum.photos/seed/${item.jobId}/80` }}
            style={{ width: 40, height: 40 }}
            contentFit="cover"
          />
        ) : (
          <Ionicons
            name="wallet-outline"
            size={20}
            color="rgba(224,194,154,0.4)"
          />
        )}
      </View>

      {/* Info */}
      <View className="flex-1" style={{ marginRight: 12 }}>
        <Text
          className="font-label text-secondary"
          style={{
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          {item.reason.split(" ")[0]} • {formatDate(item.createdAt)}
        </Text>
        <Text
          className="font-body text-on-surface"
          style={{ fontSize: 14, fontWeight: "500" }}
          numberOfLines={1}
        >
          {item.reason}
        </Text>
      </View>

      {/* Amount */}
      <Text
        className="font-headline"
        style={{
          fontSize: 16,
          color: isPositive ? "#4ade80" : "#E0C29A",
        }}
      >
        {isPositive ? "+" : ""}
        {item.amount}
      </Text>
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
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* ── Top App Bar ── */}
      <View
        className="flex-row items-center justify-between px-6"
        style={{ height: 56 }}
      >
        <Pressable onPress={handleBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#C4A882" />
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
        <UserAvatar size="sm" onPress />
      </View>

      <FlatList
        data={ledger}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <LedgerRow item={item} />}
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

            {/* ── Monthly Usage Header ── */}
            <Text
              className="font-label text-secondary"
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 24,
              }}
            >
              {t("credits.monthly_usage")}
            </Text>
          </View>
        }
        ListEmptyComponent={
          !loadingLedger ? (
            <Text
              className="font-body text-on-surface-variant text-center"
              style={{ fontSize: 14, marginTop: 32 }}
            >
              {t("credits.no_transactions")}
            </Text>
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
