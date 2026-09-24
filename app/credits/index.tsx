import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
  LayoutAnimation,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useEffectiveCreditRules, useEffectiveFeatures } from "@/hooks/useEntitlement";
import { useBackHandler } from "@/utils/navigation";
import * as creditsService from "@/services/credits";
import * as promoService from "@/services/promo";
import { theme } from "@/config/theme";
import { buildLedgerRows, parseLedgerLine, type LedgerRowModel } from "@/utils/ledger";
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
  { code: "OUTDOOR_DESIGN",    tier: "STANDARD", labelKey: "credits.ref_outdoor" },
  { code: "ULTRA_HD_UPSCALE",  tier: null,       labelKey: "credits.ref_upscale" },
  // V183 — PRO only; the plan's feature row is disabled below that, so the
  // filter above hides the line for everyone who cannot buy it here.
  { code: "ROOM_VIDEO",        tier: null,       labelKey: "credits.ref_room_video" },
];

/**
 * "Today" / "Yesterday" / "19 September" — the heading over one day's rows.
 *
 * <p>Every row used to carry its own "Sep 19" caption, so a day with eight
 * entries repeated the same date eight times inside a column that was
 * already sorted by it. The date moves up to the group and the row gets the
 * space back.
 */
function dayLabel(dateStr: string, t: (k: string) => string): string {
  const d = new Date(dateStr);
  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((midnight(new Date()) - midnight(d)) / 86_400_000);
  if (days === 0) return t("credits.ledger_today");
  if (days === 1) return t("credits.ledger_yesterday");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

/** A day's worth of rows, rendered as one bordered group. */
interface LedgerSection {
  key: string;
  label: string;
  rows: LedgerRowModel[];
}

/* ─────────────────── Ledger Row ───────────────────
 *
 * Composer language: a group of hairline rows inside one quiet container,
 * the same shape as the account list on Settings. What came off:
 *
 *  🔴 a 48px thumbnail loading `picsum.photos/seed/<jobId>` — a STOCK PHOTO
 *     SERVICE. Every row on a paying customer's billing history showed a
 *     random beach or mountain from the internet, sitting exactly where the
 *     user would read it as the design they were charged for.
 *  🔴 a badge pill reading the entry's `kind` — a field the API does not
 *     have (it sends `type`), so the fallback fired on every row and all of
 *     them said "Activity". A column of identical badges is not information.
 *  • the per-row date, now on the group heading.
 */
function LedgerRow({
  row,
  last,
  t,
}: {
  row: LedgerRowModel;
  last: boolean;
  t: (k: string, o?: any) => string;
}) {
  const line = parseLedgerLine(row.entry);
  const positive = row.amount > 0;

  // Three states, three colours: credits back is good news, credits out is
  // neutral-negative, and an annulled pair is neither — it is a non-event.
  const amountColor = row.refunded
    ? theme.umber.inkMuted
    : positive
      ? theme.color.success
      : theme.umber.ink;

  const caption = row.refunded
    ? t("credits.ledger_refunded")
    : [line.room, line.captionKey ? t(line.captionKey, line.captionParams) : null]
        .filter(Boolean)
        .join(" · ");

  return (
    <Pressable
      onPress={() => {
        if (row.jobId) router.push(`/result/${row.jobId}`);
      }}
      disabled={!row.jobId}
      accessibilityRole={row.jobId ? "button" : "text"}
    >
      {/* Görünüm Pressable'da DEĞİL, içerideki View'da. Satırın dolgusu,
          ayıracı ve yön düzeni Pressable'a ({pressed}) => ({…}) fonksiyonu
          olarak verildiğinde uygulanmıyordu: başlık, açıklama, tutar ve
          chevron alt alta diziliyor, dolgu ve ayıraç hiç çizilmiyordu.
          Nedenini kanıtlayamadım — aynı dosyadaki başka Pressable'lar aynı
          formda sorunsuz çalışıyor. Bu yüzden neden aramak yerine
          kırılamayacak biçim kullanıldı: dokunma Pressable'da, görünüm düz
          bir nesne stiliyle içteki View'da. Uygulamadaki diğer listeler de
          (settings/language.tsx) bu şekilde. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 13,
          paddingHorizontal: 16,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: theme.umber.lineNeutral,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ ...theme.v2.row, color: theme.umber.ink }} numberOfLines={1}>
            {t(line.titleKey)}
          </Text>
          {caption !== "" && (
            <Text
              style={{ ...theme.v2.rowQuiet, color: theme.umber.inkMuted, marginTop: 2 }}
              numberOfLines={1}
            >
              {caption}
            </Text>
          )}
        </View>

        <Text
          style={{
            ...theme.v2.row,
            color: amountColor,
            fontVariant: ["tabular-nums"],
          }}
        >
          {row.refunded ? "—" : `${positive ? "+" : "−"}${Math.abs(row.amount)}`}
        </Text>
        {row.jobId && (
          <Text style={{ color: theme.umber.inkMuted, fontSize: 16 }}>›</Text>
        )}
      </View>
    </Pressable>
  );
}

/* ─────────────────── Main Screen ─────────────────── */
export default function CreditsScreen() {
  const { t } = useTranslation();
  const balance = useCreditStore(s => s.balance);
  const fetchBalance = useCreditStore(s => s.fetchBalance);
  // EFFECTIVE rules/features — welcome bonus trial users see MAX-tier
  // capabilities (what credits unlock) so the "what you can do" math
  // matches the actual server-side entitlement during the trial.
  const creditRules = useEffectiveCreditRules();
  const features = useEffectiveFeatures();
  const subscription = useSubscriptionStore(s => s.subscription);
  const fetchSubscription = useSubscriptionStore(s => s.fetchSubscription);
  const fetchPlans = useSubscriptionStore(s => s.fetchPlans);

  const [referenceOpen, setReferenceOpen] = useState(false);
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
  //
  // Zero-amount rows are *always* hidden — they correspond to the second
  // half of a reservation lifecycle (RESERVE writes the −N row, CONSUME
  // writes a 0 row that just changes status). Surfacing both confused
  // users into thinking each job appeared twice; the spend is already
  // captured in the RESERVE row, so dropping CONSUME rows leaves a
  // clean "one job = one row" reading.
  //
  // Pairing happens BEFORE filtering, so a cancelled job is one row and not
  // two — and since its net is zero it belongs to neither Earned nor Spent.
  // It shows under All, where it reads as what it is: nothing happened.
  const sections = useMemo<LedgerSection[]>(() => {
    const rows = buildLedgerRows(ledger).filter(r =>
      activityFilter === "ALL"
        ? true
        : activityFilter === "EARNED"
          ? r.amount > 0
          : r.amount < 0,
    );

    const out: LedgerSection[] = [];
    for (const row of rows) {
      const key = new Date(row.createdAt).toDateString();
      const head = out[out.length - 1];
      if (head && head.key === key) head.rows.push(row);
      else out.push({ key, label: dayLabel(row.createdAt, t), rows: [row] });
    }
    return out;
  }, [ledger, activityFilter, t]);

  // "Spent this month" — sum of negative entries within the active period.
  // Gives the user a quick sense of burn rate without scrolling the list.
  // Mirrors the filteredLedger rule (`amount !== 0`): RESERVE rows carry
  // the actual spend, CONSUME rows write 0 and would have been excluded
  // by the strict `< 0` filter anyway, but the explicit symmetry keeps
  // future changes (e.g. paired CONSUME rows with negative deltas) from
  // double-counting.
  const spentThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    // Built from the PAIRED rows: a reservation that was handed straight
    // back is not money spent, and counting it inflated the headline figure
    // by the full cost of every failed generation.
    return buildLedgerRows(ledger)
      .filter(r => r.amount < 0 && new Date(r.createdAt).getTime() >= startOfMonth)
      .reduce((sum, r) => sum + Math.abs(r.amount), 0);
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
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: theme.umber.ground }}>
      {/* Composer-language header: 34px back, a kicker, a matching spacer.
          The brand lockup and the avatar menu came off — this is a record the
          user opened on purpose, not a place that needs to re-introduce the
          app or offer an account menu. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 18,
          paddingTop: 8,
          paddingBottom: 14,
        }}
      >
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: theme.umber.lineNeutral,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: theme.umber.ink, fontSize: 18, lineHeight: 20 }}>‹</Text>
        </Pressable>
        <Text style={{ ...theme.v2.kicker, color: theme.umber.inkMuted, flex: 1, textAlign: "center" }}>
          {t("profile.billing_history").toUpperCase()}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <FlatList
        data={sections}
        keyExtractor={section => section.key}
        renderItem={({ item: section }) => (
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                ...theme.v2.kicker,
                color: theme.umber.inkMuted,
                marginBottom: 8,
                marginLeft: 2,
              }}
            >
              {section.label.toUpperCase()}
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.umber.lineNeutral,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              {section.rows.map((row, i) => (
                <LedgerRow
                  key={row.id}
                  row={row}
                  last={i === section.rows.length - 1}
                  t={t}
                />
              ))}
            </View>
          </View>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingHorizontal: theme.space.gutter, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* The balance, stated once and left-aligned like every other
                heading in the redesign. It used to be a centred three-line
                hero — a label, a 40px numeral and an italic line reading
                "credits in vault" — for a number the Settings screen already
                shows. */}
            <View style={{ paddingTop: 6, paddingBottom: 22 }}>
              <Text style={{ ...theme.v2.displayL, color: theme.umber.ink }}>
                {t("credits.headline_balance", { count: balance })}
              </Text>
            </View>

            {/* Upgrade and one-off pack banners came off (2026-09-19).
                This screen is the LEDGER — what was spent and when. Two
                buy buttons on a history page turn a record into a shop, and
                both destinations already sit one tap away on Settings as
                "Get Pro" and "Buy Credits". */}

            {/* ── Reference Guide ── */}
            {referenceItems.length > 0 && (
              <View
                className="bg-surface-container-low rounded-xl"
                style={{ padding: 24, marginBottom: 28 }}
              >
                {/* Collapsible (2026-08-07). Six priced rows is a table, and a
                    table permanently open above the Next Cycle card pushed the
                    thing users actually came for below the fold. Closed by
                    default: this is a lookup, not a headline. */}
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    LayoutAnimation.configureNext(
                      LayoutAnimation.create(
                        theme.motion.duration.base,
                        LayoutAnimation.Types.easeInEaseOut,
                        LayoutAnimation.Properties.opacity,
                      ),
                    );
                    setReferenceOpen((v) => !v);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: referenceOpen }}
                >
                  <View
                    className="flex-row items-center justify-between"
                    style={{ marginBottom: 8 }}
                  >
                    <Text
                      className="font-label text-secondary"
                      style={{
                        ...theme.text.caption,
                      }}
                    >
                      {t("credits.reference_guide")}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {subscription?.planName && (
                        <Text
                          className="font-label"
                          style={{
                            ...theme.text.caption,
                            color: "#DDB477",
                          }}
                        >
                          {subscription.planName}
                        </Text>
                      )}
                      <Ionicons
                        name={referenceOpen ? "chevron-up" : "chevron-down"}
                        size={theme.iconSize.md}
                        color={theme.color.goldMidday}
                      />
                    </View>
                  </View>
                  <Text
                    className="font-body text-on-surface-variant"
                    style={{ ...theme.text.caption, marginBottom: referenceOpen ? 16 : 0 }}
                  >
                    {t("credits.reference_guide_subtitle")}
                  </Text>
                </Pressable>
                {referenceOpen && referenceItems.map((item, i) => (
                  <View key={item.labelKey}>
                    <View
                      className="flex-row items-center justify-between"
                      style={{ paddingVertical: 8 }}
                    >
                      <Text
                        className="font-body text-on-surface"
                        style={{ ...theme.text.body }}
                      >
                        {t(item.labelKey)}
                      </Text>
                      <Text
                        className="font-headline text-secondary"
                        style={{ ...theme.text.title }}
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
                style={{ padding: 24, marginBottom: 28 }}
              >
                <View style={{ marginBottom: 24 }}>
                  <Text
                    className="font-label text-secondary"
                    style={{
                      ...theme.text.caption,
                      marginBottom: 8,
                    }}
                  >
                    {t("credits.next_cycle")}
                  </Text>
                  <Text
                    className="font-body text-on-surface-variant"
                    style={{ ...theme.text.body }}
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
                    colors={["#DDB477", "#C09B62"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      width: `${Math.round(progressPct * 100)}%`,
                      height: "100%",
                      borderRadius: theme.radius.pill,
                    }}
                  />
                </View>
                <View className="items-end">
                  <Text
                    className="font-label text-secondary"
                    style={{
                      ...theme.text.caption,
                    }}
                  >
                    {t("credits.days_remaining", { count: daysRemaining })}
                  </Text>
                </View>
              </View>
            )}

            {/* ── Monthly Usage Header + Filter Chips ──
                Premium polish: hairline gold rule above the section
                anchors the eyebrow label, and the "spent this month"
                figure renders as a soft gold chip instead of greyed-out
                helper text — it's the most important number on this
                screen for a returning subscriber. */}
            <View
              style={{
                height: 1,
                backgroundColor: "rgba(225,195,155,0.14)",
                marginBottom: 18,
              }}
            />
            <View
              className="flex-row items-center justify-between"
              style={{ marginBottom: 16 }}
            >
              <Text
                className="font-label"
                style={{
                  ...theme.text.caption,
                  color: "#DDB477",
                }}
              >
                {t("credits.monthly_usage")}
              </Text>
              {spentThisMonth > 0 && (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: theme.radius.pill,
                    backgroundColor: "rgba(225,195,155,0.10)",
                    borderWidth: 0.5,
                    borderColor: "rgba(225,195,155,0.25)",
                  }}
                >
                  <Text
                    className="font-label"
                    style={{
                      ...theme.text.caption,
                      color: "#DDB477",
                    }}
                  >
                    {t("credits.billing_spent_this_month", {
                      amount: spentThisMonth,
                    })}
                  </Text>
                </View>
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
                      borderRadius: theme.radius.pill,
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
                        ...theme.text.caption,
                        color: active ? "#DDB477" : "#F6F1E7",
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
                color="#9A8F7D"
                style={{ marginBottom: 12 }}
              />
              <Text
                className="font-headline text-on-surface text-center"
                style={{ ...theme.text.title, marginBottom: 6 }}
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
                  ...theme.text.body,
                  maxWidth: 280,
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
                    borderRadius: theme.radius.pill,
                    borderWidth: 1,
                    borderColor: "#DDB477",
                  }}
                >
                  <Text
                    style={{
                      ...theme.text.caption,
                      color: "#DDB477",
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
                color="#DDB477"
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
                    ...theme.text.caption,
                  }}
                >
                  {t("credits.promo_code_label")}
                </Text>
                <Ionicons
                  name={promoExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#DDB477"
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
                      ...theme.text.body,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                  />
                  <Pressable
                    onPress={handleRedeemPromo}
                    disabled={promoLoading}
                    style={{
                      paddingHorizontal: theme.space.gutter,
                      paddingVertical: 12,
                      borderRadius: theme.radius.sm,
                      borderWidth: 1,
                      borderColor: "#DDB477",
                      justifyContent: "center",
                      alignItems: "center",
                      opacity: promoLoading ? 0.5 : 1,
                    }}
                  >
                    {promoLoading ? (
                      <ActivityIndicator color="#DDB477" size="small" />
                    ) : (
                      <Text
                        style={{
                          ...theme.text.caption,
                          color: "#DDB477",
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
                    ...theme.text.caption,
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
