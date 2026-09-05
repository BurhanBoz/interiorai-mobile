import { useEffect, useMemo, useRef, useState } from "react";
import {
    View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Image, Linking,
    Animated, Easing, AccessibilityInfo, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useStorePricesStore } from "@/stores/storePricesStore";
import { useCreditPacksStore } from "@/stores/creditPacksStore";
import { useCreditStore } from "@/stores/creditStore";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { formatProductPrice } from "@/utils/price";
import * as iap from "@/services/iap";
import { recordPaywallEvent } from "@/services/telemetry";
import { planTier, tierRank } from "@/utils/planTier";

/**
 * First-open paywall (2026-08-31).
 *
 * <p>Replaces the welcome bonus. Until now a new account arrived with 10
 * credits and a 7-day top-tier trial and never met a price; from here it meets
 * one immediately and, if it declines, lands on the plain FREE tier fed by the
 * daily drip.
 *
 * <p><b>Dismissible on purpose.</b> The reference designs for this pattern come
 * in two flavours and only one of them is safe: a wall the user cannot pass,
 * and a storefront they can walk past. With no ratings in most storefronts yet,
 * a wall converts poorly AND costs the install; the X keeps the downside to a
 * skipped screen. There is also no countdown here — Apple's 2026 review notes
 * call out fake urgency explicitly, and a timer that resets on relaunch is the
 * canonical example.
 *
 * <p>Every branch reports to {@code /api/telemetry/paywall}. DISMISSED matters
 * as much as PURCHASED: without it the conversion rate has no denominator.
 */

// Legal pages live on the marketing site, not in the app — same source the
// consent sheet already links to, so there is one copy to keep current.
const TERMS_URL = "https://roomframeai.com/terms";
const PRIVACY_URL = "https://roomframeai.com/privacy";

/**
 * Two weekly plans, nothing else.
 *
 * <p>The annual plan used to sit here, pre-selected, and the event log is
 * unambiguous about what that produced: PRO_ANNUAL was never once chosen by
 * hand (0 PLAN_SELECTED) while the weekly plan was chosen 12 times, yet
 * PRO_ANNUAL collected 10 PURCHASE_STARTED — people pressing the CTA over a
 * default they had not picked. Every one of those, and all 8 who reached
 * Apple's sheet, abandoned there: the sheet asked for $239.99. Nobody rejected
 * the product; they met a year's bill on a screen they had opened seconds ago.
 *
 * <p>So the choice on offer is now between two small numbers rather than
 * between small and enormous. The annual SKUs stay live and purchasable from
 * the plans screen for anyone who wants one — they are simply no longer the
 * first thing a stranger sees.
 */
const PLAN_PRO = "PRO_WEEKLY";
const PLAN_BASE = "BASE_WEEKLY";

/**
 * Where the paywall was opened from — stored as {@code paywall_events.source}
 * so each placement's SHOWN→PURCHASED can be read on its own.
 *
 * <p>Until 1.4.5 every SHOWN was ONBOARDING: the wall stood at first open. The
 * log for that placement was unambiguous — all 16 taps on "buy" came from
 * people who had generated nothing yet, a median ~10 s after the screen
 * appeared, and every one of them backed out at Apple's sheet; three then went
 * and rendered twice. The offer now waits for the first result (the user's own
 * room is the hero) and for the moment the wallet runs dry.
 */
const SOURCE_ONBOARDING = "ONBOARDING";
const SOURCE_FIRST_RESULT = "FIRST_RESULT";
const SOURCE_CREDITS_EXHAUSTED = "CREDITS_EXHAUSTED";

/** The low-commitment step, offered only to someone who has just run dry. */
const EXHAUSTED_PACK_CODE = "CREDITS_20";

export default function PaywallScreen() {
    const { t } = useTranslation();
    const plans = useSubscriptionStore((s) => s.plans);
    const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
    const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
    const subscription = useSubscriptionStore((s) => s.subscription);
    const storePrices = useStorePricesStore((s) => s.prices);
    const packs = useCreditPacksStore((s) => s.packs);
    const fetchPacks = useCreditPacksStore((s) => s.fetchPacks);
    const purchasePack = useCreditPacksStore((s) => s.purchase);
    const fetchBalance = useCreditStore((s) => s.fetchBalance);
    const authHeaders = useAuthHeaders();

    const params = useLocalSearchParams<{ source?: string; beforeUrl?: string; afterUrl?: string }>();
    const source = (typeof params.source === "string" && params.source ? params.source : SOURCE_ONBOARDING).toUpperCase();
    // The user's own room, when the caller has one to show. Presigned "after"
    // URLs must travel without headers; the "before" proxy needs the token.
    const ownAfter = typeof params.afterUrl === "string" && params.afterUrl ? params.afterUrl : null;
    const ownBefore = typeof params.beforeUrl === "string" && params.beforeUrl ? params.beforeUrl : null;

    const [selected, setSelected] = useState<string>(PLAN_PRO);
    const [busy, setBusy] = useState(false);

    // Hero reveal. Width is animated rather than a transform because the
    // "before" layer has to stay put while its window narrows — translating it
    // would slide the kitchen instead of wiping between two of them. That rules
    // out the native driver, which is fine for one 230pt view.
    const heroWidth = Dimensions.get("window").width;
    const reveal = useRef(new Animated.Value(1)).current;
    const revealWidth = reveal.interpolate({
        inputRange: [0, 1],
        outputRange: [0, heroWidth],
    });

    useEffect(() => {
        let loop: Animated.CompositeAnimation | null = null;
        AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
            if (reduced) {
                // Still show both rooms — just stop moving between them.
                reveal.setValue(0.5);
                return;
            }
            const hold = (v: number, ms: number) =>
                Animated.timing(reveal, { toValue: v, duration: ms, easing: Easing.inOut(Easing.cubic), useNativeDriver: false });
            loop = Animated.loop(Animated.sequence([
                Animated.delay(600),
                hold(0.08, 1500),   // wipe to the redesigned room
                Animated.delay(1400),
                hold(0.95, 1500),   // and back to the original
                Animated.delay(700),
            ]));
            loop.start();
        });
        return () => loop?.stop();
    }, []);

    useEffect(() => {
        if (!plans) fetchPlans().catch(() => {});
        if (source === SOURCE_CREDITS_EXHAUSTED && packs.length === 0) fetchPacks().catch(() => {});
        recordPaywallEvent("SHOWN", { source });
        // No "already seen" flag any more. It was the wrong question: a flag
        // asks "have we shown this before", and the answer we actually want is
        // "does this person pay us" — which app/index.tsx now asks on every
        // launch. Worse, that flag lived in the Keychain, so it survived app
        // deletion and silenced the paywall for reinstalls too.
    }, []);

    const pro = useMemo(() => plans?.find((p) => p.code === PLAN_PRO), [plans]);
    const base = useMemo(() => plans?.find((p) => p.code === PLAN_BASE), [plans]);

    /**
     * Never sell someone what they already own.
     *
     * <p>The out-of-credits placement can open for a PAYING subscriber — a PRO
     * week is 100 credits and they are spendable in an afternoon. Before this,
     * that user was shown "Subscribe · $8.99" for the plan they were already
     * on, and Apple answered the tap with "You're currently subscribed to
     * this": a dead end at the exact moment they wanted to keep working.
     *
     * <p>So the offer is filtered to tiers strictly ABOVE the current one. A
     * free user still sees both plans, a Base subscriber sees only the Pro
     * upgrade, and a Pro subscriber sees no subscription at all — for them the
     * honest answer is the one-time pack plus the date their weekly credits
     * come back, which is what {@link reloadNote} says.
     */
    const currentRank = tierRank(subscription?.planCode);
    const offersBase = !!base && tierRank(PLAN_BASE) > currentRank;
    const offersPro = !!pro && tierRank(PLAN_PRO) > currentRank;
    const hasUpgrade = offersBase || offersPro;
    // Keep the selection inside what is actually on offer: a Base subscriber
    // must not carry the default PRO selection into a CTA that then prices the
    // wrong plan, and vice versa.
    const effectiveSelected = offersPro && offersBase
        ? selected
        : offersPro ? PLAN_PRO : PLAN_BASE;
    const chosen = effectiveSelected === PLAN_BASE ? base : pro;

    /** When the subscriber's own weekly allocation comes back. */
    const reloadNote = useMemo(() => {
        if (hasUpgrade || !subscription?.currentPeriodEnd) return null;
        const diffMs = new Date(subscription.currentPeriodEnd).getTime() - Date.now();
        const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        if (days === 0) return t("paywall.reload_today");
        if (days === 1) return t("paywall.reload_tomorrow");
        return t("paywall.reload_in_days", { days });
    }, [hasUpgrade, subscription?.currentPeriodEnd, t]);

    /**
     * Which plan gives more credit per unit of money — computed from the live
     * pair, never asserted. Same rule the old saving badge followed: if either
     * side is missing the badge disappears rather than claiming something we
     * cannot stand behind. (Today PRO wins at $0.09/credit against BASE's
     * $0.12, but a price change in the plans table moves the badge on its own.)
     */
    const bestValueCode = useMemo(() => {
        const perCredit = (p?: typeof pro) =>
            p?.priceCents && p?.monthlyCredits ? p.priceCents / p.monthlyCredits : null;
        const proRate = perCredit(pro);
        const baseRate = perCredit(base);
        if (proRate == null || baseRate == null || proRate === baseRate) return null;
        return proRate < baseRate ? PLAN_PRO : PLAN_BASE;
    }, [pro, base]);

    const priceOf = (plan?: typeof pro) =>
        plan ? formatProductPrice(storePrices, plan.appleProductId, plan.priceCents, plan.currency) : "—";

    /**
     * Opened as the first screen, the app is behind the paywall: replace.
     * Opened from inside the app (a result, an empty wallet), the screen the
     * user was on is exactly where they should land: go back.
     */
    const exit = () => {
        if (source === SOURCE_ONBOARDING) router.replace("/(tabs)/studio");
        else router.back();
    };

    const leave = async (event: "DISMISSED" | "PURCHASED", planCode?: string) => {
        await recordPaywallEvent(event, { source, planCode });
        exit();
    };

    /** Trial the STORE reports on the PRO product — never a build-time assumption. */
    const trialDays = pro?.appleProductId ? storePrices[pro.appleProductId]?.introTrialDays ?? null : null;
    const trialApplies = !!trialDays && effectiveSelected === PLAN_PRO && offersPro;

    const exhaustedPack = source === SOURCE_CREDITS_EXHAUSTED
        ? packs.find((p) => p.code === EXHAUSTED_PACK_CODE) ?? null
        : null;

    const handlePack = async () => {
        if (!exhaustedPack || busy) return;
        setBusy(true);
        await recordPaywallEvent("PURCHASE_STARTED", { source, planCode: exhaustedPack.code });
        try {
            await purchasePack(exhaustedPack.code);
            // The wallet changed server-side; the studio's affordability gate
            // reads the store, so refresh before handing the user back to it.
            await fetchBalance().catch(() => {});
            await leave("PURCHASED", exhaustedPack.code);
        } catch (e) {
            if (iap.isUserCancelled(e)) {
                await recordPaywallEvent("DISMISSED", { source, planCode: exhaustedPack.code });
            } else {
                await recordPaywallEvent("FAILED", { source, planCode: exhaustedPack.code });
                Alert.alert(t("paywall.purchase_failed_title"), t("paywall.purchase_failed"));
            }
        } finally {
            setBusy(false);
        }
    };

    const handleContinue = async () => {
        const plan = chosen;
        if (!plan || busy) return;

        setBusy(true);
        await recordPaywallEvent("PURCHASE_STARTED", { source, planCode: plan.code });
        try {
            await iap.purchaseSubscription(plan.code, plan.appleProductId);
            await fetchSubscription().catch(() => {});
            await fetchBalance().catch(() => {});
            await leave("PURCHASED", plan.code);
        } catch (e) {
            if (iap.isUserCancelled(e)) {
                // Cancelling the Apple sheet is not a failure and must not be
                // reported as one — it would inflate the FAILED bucket with
                // people who simply changed their mind at the last step.
                await recordPaywallEvent("DISMISSED", { source, planCode: plan.code });
            } else {
                await recordPaywallEvent("FAILED", { source, planCode: plan.code });
                Alert.alert(t("paywall.purchase_failed_title"), t("paywall.purchase_failed"));
            }
        } finally {
            setBusy(false);
        }
    };

    const handleRestore = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await iap.restorePurchases();
            await fetchSubscription().catch(() => {});
            // Restoring nothing is not an error, but it is not success either.
            // The call resolves either way (in dummy mode it cannot even fail),
            // so the only honest signal is whether a paid plan actually arrived.
            // Navigating on the call alone dismissed the paywall for users who
            // had nothing to restore — they left thinking it had worked.
            const restored = useSubscriptionStore.getState().subscription?.planCode;
            if (restored && planTier(restored) !== "FREE") {
                await recordPaywallEvent("PURCHASED", { source, planCode: restored });
                await fetchBalance().catch(() => {});
                exit();
            } else {
                Alert.alert(t("paywall.restore_none_title"), t("paywall.restore_none"));
            }
        } catch {
            Alert.alert(t("paywall.restore_failed_title"), t("paywall.restore_failed"));
        } finally {
            setBusy(false);
        }
    };

    /**
     * What a paid plan actually buys, checked against plan_features in prod
     * rather than written from memory.
     *
     * <p>The previous list promised "our highest-quality AI models" and named
     * Magic Edit and 4K upscale as things to unlock. Neither survived contact
     * with the database: every active plan runs the same model tier, and
     * INPAINT and ULTRA_HD_UPSCALE are enabled on FREE too (V66). A paywall
     * charging money for what the user already has is both a lie and a 2.3.1
     * problem. What genuinely changes is the credit budget, the watermark, and
     * — on PRO only — Style Transfer and Outdoor Design.
     *
     * <p>These three hold for BOTH plans on offer, so the list does not move
     * when the selection does; the per-tier numbers live on the cards, where
     * the two are read side by side. The credit line names the contrast with
     * what a free account actually gets — one credit a day — because that, not
     * an abstract "more credits", is the thing being bought.
     */
    const benefits: { icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
        { icon: "flash", key: "paywall.benefit_credits" },
        { icon: "water-outline", key: "paywall.benefit_watermark" },
        { icon: "color-wand", key: "paywall.benefit_tools" },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surface }} edges={["top", "bottom"]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 18 }} showsVerticalScrollIndicator={false}>

                {/* ── Hero — the app's own before/after, playing itself ──
                    Not draggable. A paywall gets a few seconds of attention and
                    a control the user must discover spends them; the reveal has
                    to happen whether or not anyone touches the screen. Honours
                    reduce-motion by holding at the midpoint instead. */}
                <View style={{ height: 230, position: "relative" }}>
                    <Image source={ownAfter ? { uri: ownAfter } : require("@/assets/trial/kitchen_After.png")}
                           style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    <Animated.View style={{
                        position: "absolute", top: 0, left: 0, bottom: 0,
                        width: revealWidth, overflow: "hidden",
                    }}>
                        <Image source={ownBefore ? { uri: ownBefore, headers: authHeaders } : require("@/assets/trial/kitchen_Before.png")}
                               style={{ width: heroWidth, height: "100%" }} resizeMode="cover" />
                    </Animated.View>
                    <Animated.View style={{
                        position: "absolute", top: 0, bottom: 0, left: revealWidth,
                        width: 1.5, backgroundColor: theme.color.goldMidday, opacity: 0.9,
                    }} />
                    <LinearGradient
                        colors={["transparent", theme.color.surface]}
                        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90 }}
                    />
                    <Text style={{
                        position: "absolute", top: 12, left: 16, ...theme.text.caption,
                        color: theme.color.onSurface, backgroundColor: "rgba(19,19,19,0.7)",
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                        overflow: "hidden",
                    }}>{t("result.before")}</Text>
                    <Text style={{
                        position: "absolute", top: 12, right: 58, ...theme.text.caption,
                        color: theme.color.onGold, backgroundColor: theme.color.goldContainer,
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                        overflow: "hidden",
                    }}>{t("result.after")}</Text>

                    <Pressable
                        onPress={() => leave("DISMISSED")}
                        hitSlop={12}
                        accessibilityLabel={t("common.close")}
                        style={{
                            position: "absolute", top: 10, right: 14, width: 32, height: 32,
                            borderRadius: 16, alignItems: "center", justifyContent: "center",
                            backgroundColor: "rgba(19,19,19,0.6)",
                        }}
                    >
                        <Ionicons name="close" size={19} color={theme.color.onSurface} />
                    </Pressable>
                </View>

                <View style={{ paddingHorizontal: theme.space.gutter, marginTop: -14 }}>
                    <Text style={{
                        ...theme.text.title, color: theme.color.goldMidday,
                        textAlign: "center", marginBottom: 18,
                    }}>
                        {t(!hasUpgrade
                            ? "paywall.title_out_of_credits"
                            : source === SOURCE_FIRST_RESULT
                            ? "paywall.title_first_result"
                            : source === SOURCE_CREDITS_EXHAUSTED
                                ? "paywall.title_out_of_credits"
                                : "paywall.title")}
                    </Text>

                    {/* ── Benefits ── (only when something is on offer; a top-tier
                        subscriber already has all of them) */}
                    {hasUpgrade && (
                    <View style={{ gap: 10, marginBottom: 20 }}>
                        {benefits.map((b) => (
                            <View key={b.key} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <View style={{
                                    width: 28, height: 28, borderRadius: 14,
                                    backgroundColor: theme.color.surfaceContainerHigh,
                                    alignItems: "center", justifyContent: "center",
                                }}>
                                    <Ionicons name={b.icon} size={15} color={theme.color.goldContainer} />
                                </View>
                                <Text style={{ ...theme.text.body, color: theme.color.onSurface, flex: 1 }}>
                                    {t(b.key)}
                                </Text>
                            </View>
                        ))}
                    </View>
                    )}

                    {/* ── Plans ── */}
                    {!plans ? (
                        <ActivityIndicator color={theme.color.goldContainer} style={{ marginVertical: 30 }} />
                    ) : (
                        <View style={{ gap: 12 }}>
                            {offersBase && (
                            <PlanCard
                                label={t("paywall.plan_base")}
                                sub={t("paywall.plan_base_sub", { credits: base?.monthlyCredits ?? 0 })}
                                price={priceOf(base)}
                                badge={bestValueCode === PLAN_BASE ? t("paywall.best_value") : null}
                                selected={effectiveSelected === PLAN_BASE}
                                onPress={() => {
                                    setSelected(PLAN_BASE);
                                    recordPaywallEvent("PLAN_SELECTED", { source, planCode: PLAN_BASE });
                                }}
                            />
                            )}
                            {offersPro && (
                            <PlanCard
                                label={t("paywall.plan_pro")}
                                sub={t("paywall.plan_pro_sub", { credits: pro?.monthlyCredits ?? 0 })}
                                price={priceOf(pro)}
                                badge={trialDays ? t("paywall.trial_badge", { days: trialDays }) : bestValueCode === PLAN_PRO ? t("paywall.best_value") : null}
                                selected={effectiveSelected === PLAN_PRO}
                                onPress={() => {
                                    setSelected(PLAN_PRO);
                                    recordPaywallEvent("PLAN_SELECTED", { source, planCode: PLAN_PRO });
                                }}
                            />
                            )}
                        </View>
                    )}

                    {/* The CTA names the action AND the price.
                        It used to read "Continue", while the tap opened Apple's
                        payment sheet for the then pre-selected annual plan. The event
                        log showed exactly what that produced: three users tapped
                        it 4, 7 and 11 seconds after the screen appeared — far too
                        fast to have read an offer — and all three cancelled at
                        the sheet, then left. One of them cancelled the annual,
                        looked at the weekly, and still left.
                        Nobody was rejecting the price; they were pressing what
                        looked like "next" and meeting a bill.

                        A button that charges money must say so before the tap,
                        not after — the same rule Guideline 3.1.2 applies to the
                        terms printed beneath it. The price is interpolated live
                        from the storefront, so it always matches the sheet the
                        user is about to see. */}
                    {hasUpgrade && (
                        <View style={{ marginTop: 18 }}>
                            <PrimaryButton
                                label={trialApplies
                                    ? t("paywall.trial_cta", { days: trialDays, price: priceOf(pro) })
                                    : t("paywall.subscribe_cta", { price: priceOf(chosen) })}
                                onPress={handleContinue}
                                loading={busy}
                                disabled={!plans}
                            />
                        </View>
                    )}

                    {/* Renewal terms in plain words — Apple 3.1.2 wants the user to
                        know what recurs before they tap, not after. */}
                    <Text style={{
                        ...theme.text.caption, color: theme.color.onSurfaceMuted,
                        textAlign: "center", marginTop: 10,
                    }}>
                        {!hasUpgrade
                            ? reloadNote
                            : trialApplies
                                ? t("paywall.renewal_note_trial", { days: trialDays })
                                : t("paywall.renewal_note")}
                    </Text>

                    {/* Only for a wallet that has just run dry: one small, one-time
                        purchase beside the subscription. The store's own pack
                        screen has existed since July and sold exactly nothing,
                        because it was never in front of anyone at the moment
                        they wanted one more render. This is that moment. */}
                    {exhaustedPack && !hasUpgrade && (
                        <View style={{ marginTop: 18 }}>
                            <PrimaryButton
                                label={t("paywall.pack_cta", {
                                    credits: exhaustedPack.totalCredits,
                                    price: formatProductPrice(storePrices, exhaustedPack.appleProductId,
                                        exhaustedPack.priceCents, exhaustedPack.currency),
                                })}
                                onPress={handlePack}
                                loading={busy}
                            />
                        </View>
                    )}

                    {exhaustedPack && hasUpgrade && (
                        <Pressable
                            onPress={handlePack}
                            disabled={busy}
                            accessibilityRole="button"
                            style={({ pressed }) => ({
                                marginTop: 14,
                                paddingVertical: 14,
                                paddingHorizontal: 16,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: "rgba(225,195,155,0.38)",
                                backgroundColor: pressed
                                    ? "rgba(225,195,155,0.16)"
                                    : "rgba(225,195,155,0.07)",
                                alignItems: "center",
                                opacity: busy ? 0.6 : 1,
                            })}
                        >
                            <Text style={{ ...theme.text.body, color: theme.color.goldMidday, textAlign: "center" }}>
                                {t("paywall.pack_cta", {
                                    credits: exhaustedPack.totalCredits,
                                    price: formatProductPrice(storePrices, exhaustedPack.appleProductId,
                                        exhaustedPack.priceCents, exhaustedPack.currency),
                                })}
                            </Text>
                        </Pressable>
                    )}

                    <View style={{
                        flexDirection: "row", justifyContent: "center",
                        alignItems: "center", gap: 18, marginTop: 14,
                    }}>
                        <Pressable onPress={handleRestore} hitSlop={8}>
                            <Text style={{ ...theme.text.caption, color: theme.color.onSurfaceVariant }}>
                                {t("paywall.restore")}
                            </Text>
                        </Pressable>
                        <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
                            <Text style={{ ...theme.text.caption, color: theme.color.onSurfaceVariant }}>
                                {t("paywall.terms")}
                            </Text>
                        </Pressable>
                        <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
                            <Text style={{ ...theme.text.caption, color: theme.color.onSurfaceVariant }}>
                                {t("paywall.privacy")}
                            </Text>
                        </Pressable>
                    </View>

                    <Pressable onPress={() => leave("DISMISSED")} hitSlop={10} style={{ marginTop: 14 }}>
                        <Text style={{
                            ...theme.text.caption, color: theme.color.onSurfaceMuted, textAlign: "center",
                        }}>
                            {t("paywall.maybe_later")}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function PlanCard({ label, sub, price, badge, selected, onPress }: {
    label: string; sub: string; price: string;
    badge: string | null; selected: boolean; onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={{
                borderWidth: selected ? 1.5 : 1,
                borderColor: selected ? theme.color.goldContainer : theme.color.outlineVariant,
                backgroundColor: selected ? theme.color.surfaceContainerHigh : theme.color.surfaceContainer,
                borderRadius: theme.radius.md,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
            }}
        >
            <Ionicons
                name={selected ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={selected ? theme.color.goldContainer : theme.color.outline}
            />
            {/* Label, badge and sub share one flexible column; the price keeps
                its own. The badge used to sit in the price's row, competing
                with it for width — fine for a four-character "41%", but this
                badge is a translated phrase ("MEILLEUR CHOIX", "BESTER WERT")
                and it squeezed the label into a two-line wrap on the narrow
                screens. Inside the column it wraps under the label instead,
                so no translation can rearrange the row. */}
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Text style={{ ...theme.text.label, color: theme.color.onSurface }}>{label}</Text>
                    {badge ? (
                        <View style={{
                            backgroundColor: theme.color.goldContainer, borderRadius: 999,
                            paddingHorizontal: 8, paddingVertical: 2,
                        }}>
                            <Text style={{ ...theme.text.caption, color: theme.color.onGold, fontWeight: "700" }}>
                                {badge}
                            </Text>
                        </View>
                    ) : null}
                </View>
                <Text style={{ ...theme.text.caption, color: theme.color.onSurfaceMuted, marginTop: 2 }}>
                    {sub}
                </Text>
            </View>
            {/* Never shrinks: the amount is the one thing on this card that
                must stay legible whatever the label does. */}
            <Text style={{ ...theme.text.label, color: theme.color.onSurface, flexShrink: 0 }}>{price}</Text>
        </Pressable>
    );
}
