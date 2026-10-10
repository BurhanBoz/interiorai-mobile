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
import { useCatalogLabel } from "@/hooks/useCatalogLabel";
import { useBackHandler } from "@/utils/navigation";
import * as creditsService from "@/services/credits";
import * as promoService from "@/services/promo";
import { theme } from "@/config/theme";
import { buildLedgerRows, parseLedgerLine, type LedgerRowModel } from "@/utils/ledger";
import type { CreditLedgerEntry } from "@/types/api";

const U = theme.umber;

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
  const catalogLabel = useCatalogLabel();

  // Three states, three colours: credits back is good news, credits out is
  // neutral-negative, and an annulled pair is neither — it is a non-event.
  const amountColor = row.refunded
    ? theme.umber.inkMuted
    : positive
      ? theme.color.success
      : theme.umber.ink;

  const caption = row.refunded
    ? t("credits.ledger_refunded")
    : [catalogLabel("room", line.room), line.captionKey ? t(line.captionKey, line.captionParams) : null]
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
  const { t, i18n } = useTranslation();
  const balance = useCreditStore(s => s.balance);
  const fetchBalance = useCreditStore(s => s.fetchBalance);
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

  /*
   * Redesign v3 (2026-10-10): the same screen in the paywall's language —
   * umber tokens instead of the old hex literals and NativeWind classes, a
   * gold kicker, the serif balance, and the cycle card and each day's rows on
   * the umber surface. What it shows did not change: balance, next cycle and
   * its progress, the ledger with its three filters, the empty state, and the
   * promo code field.
   */
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
      {/* Composer-language header: 34px back, a kicker, a matching spacer.
          The brand lockup and the avatar menu came off — this is a record the
          user opened on purpose, not a place that needs to re-introduce the
          app or offer an account menu. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: theme.v2Layout.gutterNarrow,
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
            backgroundColor: U.surface,
            borderWidth: 1,
            borderColor: U.lineNeutral,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={18} color={U.ink} />
        </Pressable>
        <Text style={{ ...theme.v2.kicker, color: U.accent, flex: 1, textAlign: "center" }}>
          {t("profile.billing_history").toLocaleUpperCase(i18n.language)}
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
                color: U.inkMuted,
                marginBottom: 8,
                marginLeft: 2,
              }}
            >
              {section.label.toLocaleUpperCase(i18n.language)}
            </Text>
            <View
              style={{
                backgroundColor: U.surface,
                borderWidth: 1,
                borderColor: U.lineNeutral,
                borderRadius: theme.v2Layout.radius.card,
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
        contentContainerStyle={{ paddingHorizontal: theme.v2Layout.gutterWide, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* The balance, stated once and left-aligned like every other
                heading in the redesign. It used to be a centred three-line
                hero — a label, a 40px numeral and an italic line reading
                "credits in vault" — for a number the Settings screen already
                shows. */}
            <View style={{ paddingTop: 6, paddingBottom: 22 }}>
              <Text style={{ ...theme.v2.displayL, color: U.ink }}>
                {t("credits.headline_balance", { count: balance })}
              </Text>
            </View>

            {/* Upgrade and one-off pack banners came off (2026-09-19).
                This screen is the LEDGER — what was spent and when. Two
                buy buttons on a history page turn a record into a shop, and
                both destinations already sit one tap away on Settings as
                "Get Pro" and "Buy Credits". */}

            {/* 2.0.0: the per-action price table came off (owner, 26 Sep: no
                "this costs so many credits" lists; the price already sits
                above the Generate button). It also still listed the Ultra HD
                upscale no screen has offered since the redesign. */}

            {/* ── Next Cycle & Progress ── */}
            {subscription?.currentPeriodEnd && (
              <View
                style={{
                  backgroundColor: U.surface,
                  borderWidth: 1,
                  borderColor: U.lineNeutral,
                  borderRadius: theme.v2Layout.radius.card,
                  padding: 20,
                  marginBottom: 28,
                }}
              >
                <View style={{ marginBottom: 18 }}>
                  <Text style={{ ...theme.v2.kicker, color: U.accent, marginBottom: 8 }}>
                    {t("credits.next_cycle")}
                  </Text>
                  <Text style={{ ...theme.v2.displayXS, color: U.ink }}>
                    {resetDateFormatted}
                  </Text>
                </View>

                {/* Progress bar */}
                <View
                  style={{
                    height: 6,
                    marginBottom: 10,
                    borderRadius: theme.v2Layout.radius.pill,
                    backgroundColor: U.lineNeutral,
                    overflow: "hidden",
                  }}
                >
                  <LinearGradient
                    colors={theme.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      width: `${Math.round(progressPct * 100)}%`,
                      height: "100%",
                      borderRadius: theme.v2Layout.radius.pill,
                    }}
                  />
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ ...theme.v2.caption, color: U.inkMuted }}>
                    {t("credits.days_remaining", { count: daysRemaining })}
                  </Text>
                </View>
              </View>
            )}

            {/* ── Activity Header + Filter Chips ──
                Hairline gold rule above the section anchors the eyebrow
                label. 2.0.0: the "spent this month" chip came off — plans
                are weekly, and a calendar-month total on a weekly plan
                was a second clock nobody asked for. */}
            <View
              style={{
                height: 1,
                backgroundColor: U.lineAccent,
                marginBottom: 18,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <Text style={{ ...theme.v2.kicker, color: U.accent }}>
                {t("credits.ledger_title")}
              </Text>
            </View>

            {/* Filter chips */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {(["ALL", "EARNED", "SPENT"] as const).map(f => {
                const active = activityFilter === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setActivityFilter(f)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: theme.v2Layout.radius.pill,
                      borderWidth: 1,
                      borderColor: active ? U.accent : U.lineNeutral,
                      backgroundColor: active ? U.lineAccent : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        ...theme.v2.captionStrong,
                        fontSize: 12,
                        lineHeight: 16,
                        color: active ? U.accentBright : U.ink,
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
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Ionicons
                name="receipt-outline"
                size={36}
                color={U.inkMuted}
                style={{ marginBottom: 12 }}
              />
              <Text
                style={{
                  ...theme.v2.displayXS,
                  color: U.ink,
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                {t(
                  activityFilter === "ALL"
                    ? "credits.empty_title"
                    : "credits.empty_filtered_title",
                )}
              </Text>
              <Text
                style={{
                  ...theme.v2.rowQuiet,
                  fontSize: 14,
                  lineHeight: 20,
                  color: U.inkMuted,
                  textAlign: "center",
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
                  accessibilityRole="button"
                  style={{
                    paddingHorizontal: 22,
                    paddingVertical: 10,
                    borderRadius: theme.v2Layout.radius.pill,
                    borderWidth: 1,
                    borderColor: U.accent,
                  }}
                >
                  <Text style={{ ...theme.v2.row, color: U.accentBright }}>
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
                color={U.accent}
                style={{ marginVertical: 16 }}
              />
            )}

            {/* ── Promo Code Section ── */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: U.lineNeutral,
                paddingTop: 28,
                marginTop: 16,
              }}
            >
              <Pressable
                onPress={() => setPromoExpanded(!promoExpanded)}
                accessibilityRole="button"
                accessibilityState={{ expanded: promoExpanded }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: 32,
                  marginBottom: promoExpanded ? 16 : 0,
                }}
              >
                <Text style={{ ...theme.v2.kicker, color: U.inkMuted }}>
                  {t("credits.promo_code_label")}
                </Text>
                <Ionicons
                  name={promoExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={U.accent}
                />
              </Pressable>

              {promoExpanded && (
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TextInput
                    value={promoCode}
                    onChangeText={setPromoCode}
                    placeholder={t("credits.promo_placeholder")}
                    placeholderTextColor={U.inkMuted}
                    autoCapitalize="characters"
                    editable={!promoLoading}
                    style={{
                      ...theme.v2.body,
                      flex: 1,
                      color: U.ink,
                      backgroundColor: U.surface,
                      borderWidth: 1,
                      borderColor: U.lineNeutral,
                      borderRadius: theme.v2Layout.radius.inline,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                  />
                  <Pressable
                    onPress={handleRedeemPromo}
                    disabled={promoLoading}
                    accessibilityRole="button"
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: theme.v2Layout.radius.inline,
                      borderWidth: 1,
                      borderColor: U.accent,
                      justifyContent: "center",
                      alignItems: "center",
                      opacity: promoLoading ? 0.5 : 1,
                    }}
                  >
                    {promoLoading ? (
                      <ActivityIndicator color={U.accent} size="small" />
                    ) : (
                      <Text style={{ ...theme.v2.row, color: U.accentBright }}>
                        {t("credits.promo_apply")}
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}

              {promoError !== "" && (
                <Text
                  style={{
                    ...theme.v2.caption,
                    color: theme.color.danger,
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
