import { useEffect, useMemo, useRef, useState } from "react";
import {
    View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Linking, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { PaywallHero, type PaywallHeroSpec } from "@/components/paywall/PaywallHero";
import { PaywallPlanRow, FadeSwapText } from "@/components/paywall/PaywallPlanRow";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useStorePricesStore } from "@/stores/storePricesStore";
import { useCreditPacksStore } from "@/stores/creditPacksStore";
import { useCreditStore } from "@/stores/creditStore";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { formatProductPrice } from "@/utils/price";
import * as iap from "@/services/iap";
import { recordPaywallEvent } from "@/services/telemetry";
import {
    purchaseAlertKeys,
    reportPurchaseOutcome,
    reportPurchaseSuccess,
} from "@/services/purchaseOutcome";
import { track } from "@/services/analytics";
import { planTier, tierRank } from "@/utils/planTier";
import type { PlanResponse } from "@/types/api";
import { usePostPurchaseStore } from "@/stores/postPurchaseStore";
import { useStudioStore } from "@/stores/studioStore";

const U = theme.umber;

/**
 * v3 — "plan rows with the charge" (5B, owner's pick, 2026-10-10).
 *
 * <p>Only the visual layer moved. The picture now runs full-bleed under the
 * status bar (the user's own after on FIRST_RESULT, their before as an inset
 * thumbnail) with the headline sitting on it; each plan row says what Apple
 * will charge TODAY and, under an offer, the regular price it renews at; the
 * gold button repeats today's charge. Purchase, restore, telemetry, intro
 * eligibility and the credits-exhausted pack are the code that was already
 * running. The X is pinned over the screen so it never scrolls away.
 */

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
 * Pro only — weekly or monthly (V196, 2.3.0; owner, 2026-10-05).
 *
 * <p>Base and the annual plans are gone from sale: from launch to 5 October the
 * paying users were all on weekly plans (4 Base, 6 Pro), nobody bought a year,
 * and the annual row's only effect was a $239.99 sheet people backed out of.
 * The two rows are the same Pro, two billing periods, each with its own first-
 * period price from the store. New App Store products, so new plan codes —
 * the old PRO_WEEKLY stays live for 2.2.0 and its subscribers.
 */
const PLAN_WEEKLY = "PRO_V2_WEEKLY";
const PLAN_MONTHLY = "PRO_V2_MONTHLY";

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
/** The locked "Bring it to life" button on a result (1.7.1: Base or Pro). */
const SOURCE_RESULT_VIDEO = "RESULT_VIDEO";
/** A Pro-only tool the user reached for: Style Transfer or Outdoor Design. */
const PRO_TOOL_SOURCES = new Set(["RESULT_STYLE", "FEATURE_TILE"]);

/** The low-commitment step, offered only to someone who has just run dry. */
const EXHAUSTED_PACK_CODE = "CREDITS_20";

/** The app's own sample room — the hero when the moment has no photo of its own. */
// The owner's own Empty Room render from the phone (2026-10-05, Sonnet 5.5 + Nano Banana 2): the empty
// room is the Empty Room card's "before", the after is that job's output.
const SAMPLE_BEFORE = require("@/assets/features/empty_before.jpg");
const SAMPLE_AFTER = require("@/assets/features/paywall_after.jpg");

/** How long a pending eligibility answer may hold the Pro price back. */
const INTRO_WAIT_MS = 1200;

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
    const storeStatus = useStorePricesStore((s) => s.status);
    // The photo the user was about to redesign when the wallet ran dry — the
    // out-of-credits hero shows it, so the screen is about THEIR room.
    const pendingPhoto = useStudioStore((s) => s.photo?.uri ?? null);

    const params = useLocalSearchParams<{ source?: string; beforeUrl?: string; afterUrl?: string; resume?: string }>();
    const source = (typeof params.source === "string" && params.source ? params.source : SOURCE_ONBOARDING).toUpperCase();
    // The task a purchase should hand back to. Usually the placement itself;
    // the video button opens the credits placement but wants its video back.
    const resumeKey = (typeof params.resume === "string" && params.resume ? params.resume : source).toUpperCase();
    // The user's own room, when the caller has one to show. Presigned "after"
    // URLs must travel without headers; the "before" proxy needs the token.
    const ownAfter = typeof params.afterUrl === "string" && params.afterUrl ? params.afterUrl : null;
    const ownBefore = typeof params.beforeUrl === "string" && params.beforeUrl ? params.beforeUrl : null;

    const [selected, setSelected] = useState<string>(PLAN_WEEKLY);

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

    // The hero takes what the screen can spare. The rule for redesigned
    // screens is "fits 393x852 without scrolling"; v3's full-bleed picture
    // includes the status bar, so ~39% of the height is 330pt on a 390x844
    // phone and leaves both plan rows, the button and the terms in view. Never
    // below 220pt — an SE scrolls the picture, never the button.
    const insets = useSafeAreaInsets();
    const heroHeight = Math.round(Math.min(350, Math.max(220, Dimensions.get("window").height * 0.39)));
    const reduceMotion = useReduceMotion();

    useEffect(() => {
        if (!plans) fetchPlans().catch(() => {});
        if (source === SOURCE_CREDITS_EXHAUSTED && packs.length === 0) fetchPacks().catch(() => {});
        // Idempotent. A boot that raced an offline window left the map empty,
        // and this screen is the one place a missing local price costs a sale.
        useStorePricesStore.getState().hydrate().catch(() => {});
        recordPaywallEvent("SHOWN", { source });
        // No "already seen" flag any more. It was the wrong question: a flag
        // asks "have we shown this before", and the answer we actually want is
        // "does this person pay us" — which app/index.tsx now asks on every
        // launch. Worse, that flag lived in the Keychain, so it survived app
        // deletion and silenced the paywall for reinstalls too.
    }, []);

    const weekly = useMemo(() => plans?.find((p) => p.code === PLAN_WEEKLY), [plans]);
    const monthly = useMemo(() => plans?.find((p) => p.code === PLAN_MONTHLY), [plans]);

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
    const currentCode = subscription?.planCode ?? null;
    const subscribed = currentRank > 0;

    /**
     * Bir plan satın ALINABİLİR mi.
     *
     * <p>İki şey satılamaz: zaten üstünde olunan tam SKU, ve daha alt bir
     * kademe. Aradaki üçüncü hâl kasten satılabilir bırakıldı — aynı kademede
     * haftalıktan yıllığa geçmek gerçek bir satın alma ve %30 ucuz; onu
     * kapatmak aboneye kendi yükseltme yolunu gizlemek olurdu.
     */
    const buyable = (code: string) =>
        code !== currentCode && tierRank(code) >= currentRank;

    const offersWeekly = !!weekly && buyable(PLAN_WEEKLY);
    const offersMonthly = !!monthly && buyable(PLAN_MONTHLY);

    /**
     * 🔴 Plan satırları ARTIK HER ZAMAN çiziliyor — satın alınabilir olsun ya
     * da olmasın. Satılamayan satır sönük ve dokunulamaz; üstünde de hangisi
     * olduğu yazıyor.
     */
    const anythingToBuy = !plans || offersWeekly || offersMonthly;

    // Seçim, gerçekten satın alınabilir olanın içinde kalmalı.
    const effectiveSelected = offersWeekly && offersMonthly
        ? selected
        : offersWeekly ? PLAN_WEEKLY : PLAN_MONTHLY;
    const chosen = effectiveSelected === PLAN_WEEKLY
        ? (offersWeekly ? weekly : undefined)
        : (offersMonthly ? monthly : undefined);

    /** When the subscriber's own weekly allocation comes back. */
    const reloadNote = useMemo(() => {
        if (!subscription?.currentPeriodEnd) return null;
        const diffMs = new Date(subscription.currentPeriodEnd).getTime() - Date.now();
        const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        if (days === 0) return t("paywall.reload_today");
        if (days === 1) return t("paywall.reload_tomorrow");
        return t("paywall.reload_in_days", { days });
    }, [subscription?.currentPeriodEnd, t]);

    const priceOf = (plan?: PlanResponse) =>
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
        if (event === "PURCHASED") {
            outcome.current = "purchased";
            // With its evidence (timing, device state), the way a failure has it.
            await reportPurchaseSuccess({ source, planCode });
            // 2.0.0: the purchase no longer just closes the screen. The
            // welcome screen says what was bought and sends the person back
            // into the task that opened this paywall; the post-purchase store
            // keeps every other ask quiet while they do it. Replace, not push:
            // "back" from there must land where the paywall was opened.
            usePostPurchaseStore.getState().begin(resumeKey, planCode ?? null);
            router.replace({ pathname: "/plan-welcome", params: { source, plan: planCode ?? "" } } as never);
            return;
        }
        await recordPaywallEvent(event, { source, planCode });
        exit();
    };

    /**
     * Pro's first week at a lower price (2.0.0) — as the STORE reports it.
     *
     * <p>No free trial any more: a trial caps the credits a new subscriber gets
     * (V72), which is exactly how Guest 149 hit a wall minutes after paying.
     * A paid first week carries the full weekly allowance (the backend caps
     * only period_type=TRIAL).
     *
     * <p>Shown only when three things hold: the store has the offer, it is the
     * one-week shape this copy describes, and THIS Apple ID may take it —
     * Apple gives an introductory offer once per subscription group. Until the
     * eligibility answer arrives the regular price is shown, never the other
     * way round: a price we cannot honour at Apple's sheet is the one thing
     * this screen must not display.
     */
    const introFor = (plan: PlanResponse | undefined, unit: "WEEK" | "MONTH") => {
        const intro = plan?.appleProductId ? storePrices[plan.appleProductId]?.intro ?? null : null;
        if (!intro || intro.cycles !== 1) return null;
        const one = unit === "WEEK"
            ? (intro.periodUnit === "WEEK" && intro.periodUnits === 1) || (intro.periodUnit === "DAY" && intro.periodUnits === 7)
            : intro.periodUnit === "MONTH" && intro.periodUnits === 1;
        return one ? intro : null;
    };
    const weeklyIntro = introFor(weekly, "WEEK");
    const monthlyIntro = introFor(monthly, "MONTH");
    const [introEligible, setIntroEligible] = useState<Record<string, boolean> | null>(null);
    const [introWaitOver, setIntroWaitOver] = useState(false);
    useEffect(() => {
        const ids = [
            weeklyIntro ? weekly?.appleProductId : null,
            monthlyIntro ? monthly?.appleProductId : null,
        ].filter((x): x is string => !!x);
        if (ids.length === 0 || subscribed) {
            setIntroEligible({});
            return;
        }
        let cancelled = false;
        // The price waits for the answer — briefly; after the wait the regular
        // price stands and a late "eligible" still upgrades it (StoreKit applies
        // the offer at the sheet either way, so under-promising is safe).
        const timer = setTimeout(() => { if (!cancelled) setIntroWaitOver(true); }, INTRO_WAIT_MS);
        iap.fetchIntroEligibility(ids)
            .then((m) => { if (!cancelled) setIntroEligible(m); })
            .catch(() => { if (!cancelled) setIntroEligible({}); });
        return () => { cancelled = true; clearTimeout(timer); };
    }, [weeklyIntro?.priceString, monthlyIntro?.priceString, weekly?.appleProductId, monthly?.appleProductId, subscribed]);
    const weeklyIntroShown = !!weeklyIntro && !!weekly?.appleProductId
        && introEligible?.[weekly.appleProductId] === true && offersWeekly;
    const monthlyIntroShown = !!monthlyIntro && !!monthly?.appleProductId
        && introEligible?.[monthly.appleProductId] === true && offersMonthly;
    const chosenIntro = effectiveSelected === PLAN_WEEKLY
        ? (weeklyIntroShown ? weeklyIntro : null)
        : (monthlyIntroShown ? monthlyIntro : null);
    const introPending = (!!weeklyIntro || !!monthlyIntro) && introEligible === null && !introWaitOver
        && !subscribed && anythingToBuy;

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
            const result = await reportPurchaseOutcome(e, {
                source, planCode: exhaustedPack.code,
            });
            if (!result.cancelled) {
                // A cause the user can act on gets its own words; the rest
                // keeps the screen's generic message.
                const named = purchaseAlertKeys(result);
                Alert.alert(
                    t(named?.title ?? "paywall.purchase_failed_title"),
                    t(named?.body ?? "paywall.purchase_failed"),
                );
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
            const result = await reportPurchaseOutcome(e, {
                source, planCode: plan.code,
            });
            if (!result.cancelled) {
                const named = purchaseAlertKeys(result);
                Alert.alert(
                    t(named?.title ?? "paywall.purchase_failed_title"),
                    t(named?.body ?? "paywall.purchase_failed"),
                );
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
     * Umber paywall, 2.0.0.
     *
     * <p><b>What changed from 19 September.</b> The rows stay plain — a plan
     * and its price (owner, 26 Sep: no credit counts, no "≈ designs", no
     * feature lists). What changed is the top of the screen: the two Pro
     * photographs stay where someone reached for a Pro tool; everywhere else
     * it is the moment that opened the paywall — their first result, the
     * room they were about to redesign, the design they wanted to bring to
     * life.
     *
     * <p><b>Apple 3.1.2.</b> Renewal terms are on screen whenever a
     * subscription can be bought — price, period, auto-renewal, how to cancel —
     * not only under a trial. Restore is a labelled control (it used to hide
     * behind a footnote that never said "restore"), and Terms and Privacy are
     * links; both URLs were defined in this file and never rendered.
     *
     * <p>🔴 The purchase path — handleContinue, handlePack, handleRestore, the
     * telemetry and the outcome classifier — is the code that was already
     * running. What happens after a successful purchase (the welcome screen)
     * and what the screen shows are what changed.
     */
    const pricesLoading = !plans || storeStatus === "idle" || storeStatus === "loading";
    const weeklyPrice = pricesLoading ? null : priceOf(weekly);
    const monthlyPrice = pricesLoading ? null : priceOf(monthly);

    /** A price as a number, and whether it came from the store (same currency) or the backend (USD). */
    const numericPrice = (plan?: PlanResponse) => {
        if (!plan) return null;
        const sp = plan.appleProductId ? storePrices[plan.appleProductId] : undefined;
        if (sp && sp.price > 0) return { value: sp.price, store: true };
        return plan.priceCents > 0 ? { value: plan.priceCents / 100, store: false } : null;
    };

    /** What a month costs against 52/12 weeks of weekly, from this storefront's own prices. */
    const monthlySaving = (() => {
        const w = numericPrice(weekly);
        const m = numericPrice(monthly);
        if (!w || !m || w.store !== m.store) return null;
        const pct = Math.floor((1 - m.value / (w.value * 52 / 12)) * 100);
        return pct >= 5 ? pct : null;
    })();

    /** "−25%": a first-period offer against the same product's regular price. */
    const introPctOf = (plan: PlanResponse | undefined, intro: typeof weeklyIntro) => {
        if (!intro || !plan?.appleProductId) return null;
        const regular = storePrices[plan.appleProductId]?.price;
        if (!regular || !(intro.price > 0)) return null;
        const pct = Math.floor((1 - intro.price / regular) * 100);
        return pct >= 5 ? pct : null;
    };
    const introBadge = (plan: PlanResponse | undefined, intro: typeof weeklyIntro) => {
        const pct = introPctOf(plan, intro);
        return pct != null ? t("paywall.intro_badge", { pct }) : t("paywall.intro_badge_plain");
    };

    // ── The moment that opened the screen ────────────────────────────
    const proTools: PaywallHeroSpec = {
        kind: "pro",
        left: { image: require("@/assets/features/style_after.jpg"), label: t("studio.mode_style_transfer") },
        // outdoor_card.png is an 8 KB diagonal-stripe placeholder — the
        // "asset missing" pattern, not a photograph.
        right: { image: require("@/assets/features/outdoor_after.jpg"), label: t("studio.mode_outdoor") },
    };
    const hero: PaywallHeroSpec = (() => {
        if (PRO_TOOL_SOURCES.has(source)) return proTools;
        if (source === SOURCE_FIRST_RESULT && ownAfter) {
            return ownBefore
                ? { kind: "pair", before: { uri: ownBefore, headers: authHeaders }, after: { uri: ownAfter } }
                : { kind: "photo", image: { uri: ownAfter }, chip: t("result.after"), icon: "sparkles-outline" };
        }
        if (source === SOURCE_RESULT_VIDEO || (source === SOURCE_CREDITS_EXHAUSTED && ownAfter)) {
            return {
                kind: "photo", image: ownAfter ? { uri: ownAfter } : SAMPLE_AFTER,
                chip: t("paywall.chip_video"), icon: "videocam",
            };
        }
        if (source === SOURCE_CREDITS_EXHAUSTED && pendingPhoto) {
            return { kind: "photo", image: { uri: pendingPhoto }, chip: t("paywall.chip_your_room"), icon: "image-outline" };
        }
        if (subscribed) return proTools;
        return { kind: "pair", before: SAMPLE_BEFORE, after: SAMPLE_AFTER };
    })();

    /**
     * v3: "This was one room." only where it is literally true — the first
     * result, with the user's own design as the picture. On the sample room it
     * would be a claim about someone else's room, so every other placement
     * keeps the headline it already had (and its line becomes the value line).
     */
    const headline: { title: string; sub: string | null } = (() => {
        if (!subscribed && source === SOURCE_FIRST_RESULT && ownAfter) {
            return { title: t("paywall.hero_one_room_title"), sub: t("paywall.value_line") };
        }
        if (subscribed) {
            return {
                title: source === SOURCE_CREDITS_EXHAUSTED
                    ? t("paywall.title_out_of_credits")
                    : t("paywall.current_plan_title", { plan: subscription?.planName ?? "" }),
                sub: reloadNote,
            };
        }
        if (PRO_TOOL_SOURCES.has(source)) return { title: t("paywall.two_things_headline"), sub: t("paywall.pro_tools_sub") };
        if (source === SOURCE_FIRST_RESULT) return { title: t("paywall.hero_first_title"), sub: t("paywall.hero_first_sub") };
        if (source === SOURCE_RESULT_VIDEO) return { title: t("paywall.hero_video_title"), sub: t("paywall.hero_video_sub") };
        if (source === SOURCE_CREDITS_EXHAUSTED) {
            return hero.kind === "photo" && !ownAfter
                ? { title: t("paywall.hero_room_title"), sub: t("paywall.hero_room_sub") }
                : { title: t("paywall.title_out_of_credits"), sub: t("paywall.hero_exhausted_sub") };
        }
        return { title: t("paywall.hero_default_title"), sub: t("paywall.hero_default_sub") };
    })();

    // ── Money lines ──────────────────────────────────────────────────
    const chosenPrice = !chosen || pricesLoading
        ? null
        : chosenIntro ? chosenIntro.priceString : priceOf(chosen);
    const renewal = (() => {
        if (!anythingToBuy || !chosen || pricesLoading || introPending) return null;
        const isWeekly = effectiveSelected === PLAN_WEEKLY;
        if (chosenIntro) {
            return t(isWeekly ? "paywall.renewal_intro_week" : "paywall.renewal_intro_month",
                { intro: chosenIntro.priceString, price: priceOf(chosen) });
        }
        return t(isWeekly ? "paywall.renewal_week" : "paywall.renewal_month", { price: priceOf(chosen) });
    })();

    const ctaLabel = anythingToBuy ? t("paywall.start_pro") : t("profile.buy_credits");

    const rowA11y = (tier: string, price: string | null, period: string) =>
        [tier, price ? `${price}${period}` : null].filter(Boolean).join(", ");

    const weeklyRowPrice = introPending ? null : weeklyIntroShown ? weeklyIntro!.priceString : weeklyPrice;
    const monthlyRowPrice = introPending ? null : monthlyIntroShown ? monthlyIntro!.priceString : monthlyPrice;
    const ctaDisabled = anythingToBuy ? busy || !chosen : false;
    const ctaPrice = anythingToBuy && chosenPrice && !introPending ? chosenPrice : null;

    return (
        <View style={{ flex: 1, backgroundColor: U.ground }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 14 }}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <PaywallHero
                    spec={hero}
                    height={heroHeight}
                    topInset={insets.top}
                    // The product's name, not copy — same as the "Roomframe"
                    // lockup this screen always drew untranslated.
                    kicker="Roomframe Pro"
                    title={headline.title}
                    beforeLabel={t("result.before")}
                    reduceMotion={reduceMotion}
                />

                <View style={{ paddingHorizontal: theme.v2Layout.gutterWide, paddingTop: 14, gap: 12 }}>
                    {headline.sub ? (
                        <Text style={{ ...theme.v2.body, fontSize: 14, lineHeight: 21, color: theme.color.onSurfaceVariant }}>
                            {headline.sub}
                        </Text>
                    ) : null}

                    {/* İki satır: aynı Pro, iki dönem — her biri BUGÜN ne çekileceğini söylüyor. */}
                    <PaywallPlanRow
                        label={`Pro · ${t("paywall.weekly")}`}
                        price={weeklyRowPrice}
                        period={weeklyIntroShown ? t("paywall.first_week") : t("paywall.per_week")}
                        then={weeklyIntroShown && weeklyPrice ? t("paywall.then_price_week", { price: weeklyPrice }) : null}
                        badge={weeklyIntroShown ? introBadge(weekly, weeklyIntro) : null}
                        selected={offersWeekly && effectiveSelected === PLAN_WEEKLY}
                        current={currentCode === PLAN_WEEKLY}
                        locked={!offersWeekly}
                        currentLabel={t("plans.current_plan")}
                        a11yLabel={rowA11y(`Pro ${t("paywall.weekly")}`,
                            weeklyIntroShown ? weeklyIntro!.priceString : weeklyPrice,
                            weeklyIntroShown ? ` ${t("paywall.first_week")}` : t("paywall.per_week"))}
                        reduceMotion={reduceMotion}
                        onPress={() => {
                            if (!offersWeekly) return;
                            touchedAPlan.current = true;
                            setSelected(PLAN_WEEKLY);
                            recordPaywallEvent("PLAN_SELECTED", { source, planCode: PLAN_WEEKLY });
                        }}
                    />
                    <PaywallPlanRow
                        label={`Pro · ${t("paywall.monthly")}`}
                        price={monthlyRowPrice}
                        period={monthlyIntroShown ? t("paywall.first_month") : t("paywall.per_month")}
                        then={monthlyIntroShown && monthlyPrice ? t("paywall.then_price_month", { price: monthlyPrice }) : null}
                        badge={monthlyIntroShown
                            ? introBadge(monthly, monthlyIntro)
                            : monthlySaving != null ? t("paywall.save_pct", { pct: monthlySaving }) : null}
                        selected={offersMonthly && effectiveSelected === PLAN_MONTHLY}
                        current={currentCode === PLAN_MONTHLY}
                        locked={!offersMonthly}
                        currentLabel={t("plans.current_plan")}
                        a11yLabel={rowA11y(`Pro ${t("paywall.monthly")}`,
                            monthlyIntroShown ? monthlyIntro!.priceString : monthlyPrice,
                            monthlyIntroShown ? ` ${t("paywall.first_month")}` : t("paywall.per_month"))}
                        reduceMotion={reduceMotion}
                        onPress={() => {
                            if (!offersMonthly) return;
                            touchedAPlan.current = true;
                            setSelected(PLAN_MONTHLY);
                            recordPaywallEvent("PLAN_SELECTED", { source, planCode: PLAN_MONTHLY });
                        }}
                    />

                    {/* The out-of-credits placement keeps its low-commitment step:
                        someone who has just run dry is the one person for whom a
                        one-off pack is the right size of decision. */}
                    {exhaustedPack && (
                        <Pressable
                            onPress={handlePack}
                            disabled={busy}
                            accessibilityRole="button"
                            style={{
                                minHeight: 44,
                                borderWidth: 1, borderColor: U.lineNeutral,
                                borderRadius: theme.v2Layout.radius.inline, paddingVertical: 12, paddingHorizontal: 16,
                                flexDirection: "row", gap: 12,
                                alignItems: "center", justifyContent: "space-between",
                            }}
                        >
                            <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted, flex: 1 }}>
                                {t("paywall.pack_line", { credits: exhaustedPack.credits })}
                            </Text>
                            <Text style={{ ...theme.v2.row, color: U.accentBright }}>
                                {priceOfPack(exhaustedPack)}
                            </Text>
                        </Pressable>
                    )}
                </View>
            </ScrollView>

            {/* Always in view: the button, what it will charge today, and the
                three things Apple and a doubtful buyer both look for. */}
            <View style={{
                paddingHorizontal: theme.v2Layout.gutterWide, paddingTop: 10,
                paddingBottom: Math.max(insets.bottom, 12),
            }}>
                {/* Satın alınacak bir şey varsa abonelik düğmesi; yoksa —
                    yani zaten en üstteyse — dürüst olan tek kapı kredi paketi.
                    Abonelik düğmesini orada bırakmak, kullanıcıyı Apple'ın
                    "bu abonelikte zaten varsınız" uyarısına göndermekti. */}
                <Pressable
                    onPress={anythingToBuy ? handleContinue : () => router.replace("/credits/packs" as never)}
                    disabled={ctaDisabled}
                    accessibilityRole="button"
                    accessibilityLabel={ctaPrice ? `${ctaLabel}, ${t("paywall.price_today", { price: ctaPrice })}` : ctaLabel}
                    accessibilityState={{ disabled: ctaDisabled, busy }}
                    style={{
                        borderRadius: theme.v2Layout.radius.button,
                        opacity: anythingToBuy && (busy || !chosen) ? 0.5 : 1,
                        ...theme.elevation.goldGlowSoft,
                    }}
                >
                    <LinearGradient
                        colors={theme.gradient.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            height: 56, borderRadius: theme.v2Layout.radius.button,
                            flexDirection: "row", alignItems: "center",
                            justifyContent: "space-between", paddingHorizontal: 22, gap: 12,
                        }}
                    >
                        {busy ? (
                            <View style={{ flex: 1, alignItems: "center" }}>
                                <ActivityIndicator color={U.buttonInk} />
                            </View>
                        ) : (
                            <>
                                <Text style={{ ...theme.v2.button, color: U.buttonInk, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit>
                                    {ctaLabel}
                                </Text>
                                {ctaPrice ? (
                                    <FadeSwapText
                                        text={t("paywall.price_today", { price: ctaPrice })}
                                        style={{ fontFamily: "NotoSerif", fontSize: 17, lineHeight: 23, color: U.buttonInk }}
                                        reduceMotion={reduceMotion}
                                    />
                                ) : null}
                            </>
                        )}
                    </LinearGradient>
                </Pressable>

                {/* 🔴 App Store 3.1.2: what is charged, how often, that it
                    renews, and how to stop it — next to the button, every time
                    a subscription can be bought. With the first-week offer the
                    regular price is spelled out in the same sentence. */}
                {renewal ? (
                    <Text style={{ ...theme.v2.caption, color: U.inkMuted, marginTop: 10, textAlign: "center" }}>
                        {renewal}
                    </Text>
                ) : null}

                <View style={{
                    flexDirection: "row", justifyContent: "center", alignItems: "center",
                    gap: 6, marginTop: 6,
                }}>
                    <FooterLink label={t("paywall.restore_link")} onPress={handleRestore} disabled={busy} role="button" />
                    <Text style={{ ...theme.v2.caption, color: U.inkMuted }}>·</Text>
                    <FooterLink label={t("paywall.terms")} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})} role="link" />
                    <Text style={{ ...theme.v2.caption, color: U.inkMuted }}>·</Text>
                    <FooterLink label={t("paywall.privacy")} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} role="link" />
                </View>
            </View>

            {/* Kapatma sağ üstte, bir çarpı — fotoğrafın üstünde, kendi koyu
                zemininde. Bu ekran bir yığın adımı değil, üstüne açılan bir
                teklif; açılış kapısı olarak geldiğinde arkasında dönülecek bir
                ekran yok. Ekrana sabit: kaydırmayla asla kaybolmaz. */}
            <Pressable
                onPress={() => leave("DISMISSED")}
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
                style={{
                    position: "absolute", top: insets.top + 8, right: 20,
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: U.photoChrome, borderWidth: 1, borderColor: U.photoChromeBorder,
                    alignItems: "center", justifyContent: "center",
                }}
            >
                <Ionicons name="close" size={18} color={U.ink} />
            </Pressable>
        </View>
    );
}

/** Restore, Terms, Privacy — small, but real tap targets. */
function FooterLink({
    label, onPress, disabled, role,
}: { label: string; onPress: () => void; disabled?: boolean; role: "button" | "link" }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole={role}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            style={{ minHeight: 28, justifyContent: "center" }}
        >
            <Text style={{ ...theme.v2.caption, color: U.inkMuted, textDecorationLine: "underline" }}>
                {label}
            </Text>
        </Pressable>
    );
}
