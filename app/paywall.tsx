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
import { reportPurchaseOutcome } from "@/services/purchaseOutcome";
import { track } from "@/services/analytics";
import { planTier, tierRank } from "@/utils/planTier";

const U = theme.umber;

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
 * The annual SKUs behind the billing segment. They were always purchasable
 * from the plans screen; the segment brings them onto the paywall without
 * making a year's bill the first number a stranger sees — the weekly half is
 * selected by default and the annual one is opt-in.
 */
const PLAN_PRO_ANNUAL = "PRO_ANNUAL";
const PLAN_BASE_ANNUAL = "BASE_ANNUAL";

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
/** Return visit of a free user who already met the first-result offer. */
const SOURCE_APP_OPEN = "APP_OPEN";

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

    // How long the paywall actually held someone, and whether they touched it
    // at all. The server already records SHOWN and DISMISSED — what it cannot
    // record is that 43 of the 46 people who saw the first-result paywall were
    // gone in seconds without ever picking a plan. That is the number that
    // decides whether this screen needs different copy or a different moment.
    const openedAt = useRef(Date.now());
    const touchedAPlan = useRef(false);
    const outcome = useRef<"dismissed" | "purchased">("dismissed");
    const reported = useRef(false);

    // Reported from teardown, not from leave(): restore, the hardware back
    // gesture and a swipe all exit without passing through it, and a dwell
    // number that silently drops whole exit routes is worse than none.
    useEffect(() => () => {
        if (reported.current) return;
        reported.current = true;
        track("paywall_viewed", {
            source,
            seconds: Math.round((Date.now() - openedAt.current) / 1000),
            touched_a_plan: touchedAPlan.current,
            outcome: outcome.current,
        });
    }, []);
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

    const [billing, setBilling] = useState<"weekly" | "annual">("weekly");
    const proCode = billing === "annual" ? PLAN_PRO_ANNUAL : PLAN_PRO;
    const baseCode = billing === "annual" ? PLAN_BASE_ANNUAL : PLAN_BASE;

    const pro = useMemo(() => plans?.find((p) => p.code === proCode), [plans, proCode]);
    const base = useMemo(() => plans?.find((p) => p.code === baseCode), [plans, baseCode]);

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
    // Until the catalog has loaded, both offers read false for the wrong
    // reason (no plans to offer, not a subscriber who owns them) — and the
    // no-upgrade layout would flash its "out of credits" title at everyone
    // on a slow network. Default to the upgrade view while loading; the CTA
    // is disabled until plans arrive anyway.
    const hasUpgrade = !plans || offersBase || offersPro;
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

    const priceOfPack = (pack: NonNullable<typeof exhaustedPack>) =>
        formatProductPrice(storePrices, pack.appleProductId, pack.priceCents, pack.currency);

    /**
     * Opened as the first screen, the app is behind the paywall: replace.
     * Opened from inside the app (a result, an empty wallet), the screen the
     * user was on is exactly where they should land: go back.
     */
    const exit = () => {
        // Opened as the first screen of the session (launch gate) there is
        // nothing behind this to go back to; opened from inside the app, the
        // screen the user was on is exactly where they should land.
        if (source === SOURCE_ONBOARDING || source === SOURCE_APP_OPEN) {
            router.replace("/(tabs)/studio");
        } else {
            router.back();
        }
    };

    const leave = async (event: "DISMISSED" | "PURCHASED", planCode?: string) => {
        if (event === "PURCHASED") outcome.current = "purchased";
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
            // One classifier for all four purchase entry points — see
            // services/purchaseOutcome.ts for why this is not four catch blocks.
            const { cancelled } = await reportPurchaseOutcome(e, {
                source, planCode: exhaustedPack.code,
            });
            if (!cancelled) {
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
            // Cancelling the Apple sheet is not a failure and must not be
            // reported as one — it would inflate the FAILED bucket with people
            // who simply changed their mind at the last step. The classifier
            // makes that call now, identically for every screen.
            const { cancelled } = await reportPurchaseOutcome(e, {
                source, planCode: plan.code,
            });
            if (!cancelled) {
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
     * Umber paywall (2026-09-19).
     *
     * <p><b>What it stopped saying.</b> The old screen led with a benefits
     * list, badged Base "MOST POPULAR" and Pro "BEST VALUE" — two superlatives
     * that cancel each other — and gave both rows the same "Confirm &
     * Subscribe", so the choice carried no consequence. Its benefit list had
     * also drifted from the database twice.
     *
     * <p>It now makes one claim and shows it: Style Transfer and Outdoor
     * Design are the only two capabilities a paid plan unlocks
     * (plan_features, verified in prod), so they are the headline and the
     * photographs are the description.
     *
     * <p><b>Deliberately absent:</b> any paragraph about credit counts,
     * roll-over or weekly allowances. Credits are the unit the user has no
     * feel for; the two locked capabilities are the only concrete claim
     * available.
     *
     * <p>🔴 The purchase path below this line is unchanged — handleContinue,
     * handlePack, handleRestore, the telemetry and the outcome classifier are
     * all the code that was already running. Only the presentation moved.
     */
    const proPrice = priceOf(pro);
    const basePrice = priceOf(base);
    const selectedIsPro = effectiveSelected === PLAN_PRO;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: U.ground }} edges={["top", "bottom"]}>
            <View style={{ flex: 1, paddingHorizontal: 18 }}>
                <View style={{ paddingTop: 8, paddingBottom: 10 }}>
                    <Pressable
                        onPress={() => leave("DISMISSED")}
                        accessibilityRole="button"
                        accessibilityLabel={t("common.back")}
                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        style={{
                            width: 34, height: 34, borderRadius: 17,
                            backgroundColor: U.lineNeutral,
                            alignItems: "center", justifyContent: "center",
                        }}
                    >
                        <Text style={{ color: U.ink, fontSize: 18, lineHeight: 20 }}>‹</Text>
                    </Pressable>
                </View>

                <Text style={{ ...theme.v2.displayL, color: U.ink, marginBottom: 18 }}>
                    {t("paywall.two_things_headline")}
                </Text>

                {/* No descriptions. The photograph is the description. */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                    <ProCard
                        image={require("@/assets/features/style_after.png")}
                        label={t("studio.mode_style_transfer")}
                    />
                    <ProCard
                        // outdoor_card.png is an 8 KB diagonal-stripe placeholder — the
                        // "asset missing" pattern, not a photograph, and it was
                        // being used as half the argument for a paid plan.
                        image={require("@/assets/features/outdoor_after.png")}
                        label={t("studio.mode_outdoor")}
                    />
                </View>

                <BillingSegment
                    annual={billing === "annual"}
                    onChange={setBilling}
                    t={t}
                />

                <View style={{ gap: 10, marginTop: 18 }}>
                    {offersPro && (
                        <UmberPlanRow
                            tier="PRO"
                            sub={t("paywall.pro_sub")}
                            price={proPrice}
                            period={t(billing === "annual" ? "paywall.per_year" : "paywall.per_week")}
                            selected={selectedIsPro}
                            onPress={() => {
                                setSelected(PLAN_PRO);
                                recordPaywallEvent("PLAN_SELECTED", { source, planCode: PLAN_PRO });
                            }}
                        />
                    )}
                    {offersBase && (
                        <UmberPlanRow
                            tier="BASE"
                            sub={t("paywall.base_sub")}
                            price={basePrice}
                            period={t(billing === "annual" ? "paywall.per_year" : "paywall.per_week")}
                            selected={!selectedIsPro}
                            onPress={() => {
                                setSelected(PLAN_BASE);
                                recordPaywallEvent("PLAN_SELECTED", { source, planCode: PLAN_BASE });
                            }}
                        />
                    )}
                </View>

                <View style={{ flex: 1 }} />

                {/* The out-of-credits placement keeps its low-commitment step:
                    someone who has just run dry is the one person for whom a
                    one-off pack is the right size of decision. */}
                {exhaustedPack && (
                    <Pressable
                        onPress={handlePack}
                        disabled={busy}
                        accessibilityRole="button"
                        style={{
                            borderWidth: 1, borderColor: U.lineNeutral,
                            borderRadius: 13, paddingVertical: 12, paddingHorizontal: 14,
                            marginBottom: 10, flexDirection: "row",
                            alignItems: "center", justifyContent: "space-between",
                        }}
                    >
                        <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted }}>
                            {t("paywall.pack_line", { credits: exhaustedPack.credits })}
                        </Text>
                        <Text style={{ fontFamily: "Inter-Bold", fontSize: 12.5, color: U.accentBright }}>
                            {priceOfPack(exhaustedPack)}
                        </Text>
                    </Pressable>
                )}

                <Pressable
                    onPress={handleContinue}
                    disabled={busy || !chosen}
                    accessibilityRole="button"
                    style={{
                        height: 56, borderRadius: 16, backgroundColor: U.buttonFill,
                        opacity: busy || !chosen ? 0.5 : 1,
                        flexDirection: "row", alignItems: "center",
                        justifyContent: "space-between", paddingHorizontal: 22,
                    }}
                >
                    {busy ? (
                        <ActivityIndicator color={U.buttonInk} />
                    ) : (
                        <>
                            <Text style={{ ...theme.v2.button, color: U.buttonInk }}>
                                {selectedIsPro ? t("paywall.start_pro") : t("paywall.start_base")}
                            </Text>
                            <Text style={{ color: U.buttonInk, fontSize: 18 }}>→</Text>
                        </>
                    )}
                </Pressable>

                <Pressable onPress={handleRestore} disabled={busy} hitSlop={8} accessibilityRole="button">
                    <Text style={{ ...theme.v2.caption, color: U.inkMuted, marginTop: 12, marginBottom: 4 }}>
                        {t("paywall.footnote")}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

/** A locked capability, shown rather than described. */
function ProCard({ image, label }: { image: number; label: string }) {
    return (
        <View style={{ flex: 1, height: 136, borderRadius: 16, overflow: "hidden", backgroundColor: U.surface }}>
            <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.9)"]}
                style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 30, paddingHorizontal: 12, paddingBottom: 10 }}
            >
                <Text style={{ fontFamily: "Inter-Bold", fontSize: 14, color: "#fff" }} numberOfLines={2}>
                    {label}
                </Text>
            </LinearGradient>
        </View>
    );
}

function BillingSegment({
    annual, onChange, t,
}: { annual: boolean; onChange: (v: "weekly" | "annual") => void; t: (k: string) => string }) {
    return (
        <View
            style={{
                marginTop: 22, flexDirection: "row", borderRadius: 100,
                borderWidth: 1, borderColor: U.lineNeutral, padding: 4,
            }}
        >
            {(["weekly", "annual"] as const).map((key) => {
                const active = (key === "annual") === annual;
                return (
                    <Pressable
                        key={key}
                        onPress={() => onChange(key)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        style={{
                            flex: 1, height: 38, borderRadius: 100,
                            alignItems: "center", justifyContent: "center",
                            backgroundColor: active ? U.lineAccent : "transparent",
                        }}
                    >
                        <Text style={{ ...theme.v2.tier, color: active ? U.accentBright : U.inkMuted }}>
                            {t(key === "annual" ? "paywall.annual_minus_30" : "paywall.weekly")}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

function UmberPlanRow({
    tier, sub, price, period, selected, onPress,
}: {
    tier: "PRO" | "BASE"; sub: string; price: string; period: string;
    selected: boolean; onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={{
                borderRadius: 18, paddingVertical: 15, paddingHorizontal: 16,
                borderWidth: selected ? 1.5 : 1,
                borderColor: selected ? U.accent : U.lineNeutral,
                backgroundColor: tier === "PRO" ? U.surface : "transparent",
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                gap: 12,
            }}
        >
            <View style={{ flex: 1 }}>
                <Text style={{ ...theme.v2.tier, color: tier === "PRO" ? U.accentBright : U.inkMuted }}>
                    {tier}
                </Text>
                <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted, marginTop: 3 }} numberOfLines={2}>
                    {sub}
                </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
                <Text style={{ ...theme.v2.price, color: U.ink }}>{price}</Text>
                <Text style={{ ...theme.v2.caption, color: U.inkMuted }}>{period}</Text>
            </View>
        </Pressable>
    );
}
