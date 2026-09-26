import { useEffect, useMemo, useRef, useState } from "react";
import {
    View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Image, Linking,
    Animated, Easing, AccessibilityInfo, Dimensions,
} from "react-native";
import { Image as ExpoImage, type ImageSource } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { theme, track as tracking } from "@/config/theme";
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
/** The locked "Bring it to life" button on a result (1.7.1: Base or Pro). */
const SOURCE_RESULT_VIDEO = "RESULT_VIDEO";
/** A Pro-only tool the user reached for: Style Transfer or Outdoor Design. */
const PRO_TOOL_SOURCES = new Set(["RESULT_STYLE", "FEATURE_TILE"]);

/** The low-commitment step, offered only to someone who has just run dry. */
const EXHAUSTED_PACK_CODE = "CREDITS_20";

/** The app's own sample room — the hero when the moment has no photo of its own. */
const SAMPLE_BEFORE = require("@/assets/features/redesign_before.png");
const SAMPLE_AFTER = require("@/assets/features/redesign_after.png");

/** How long a pending eligibility answer may hold the Pro price back. */
const INTRO_WAIT_MS = 1200;

type IoniconName = keyof typeof Ionicons.glyphMap;

/** What the top of the screen shows — the moment that opened it. */
type HeroSpec =
    | { kind: "wipe"; before: ImageSource | number; after: ImageSource | number }
    | { kind: "photo"; image: ImageSource | number; chip: string; icon: IoniconName; moving: boolean }
    | { kind: "pro" };

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
    // out the native driver, which is fine for one narrow view.
    // The hero sits inside the screen's 18pt side padding.
    const heroWidth = Dimensions.get("window").width - 36;
    // The hero takes what the screen can spare. The rule for redesigned
    // screens is "fits 393x852 without scrolling"; both plan rows must be in
    // view on a 390x844 phone even with the first-week offer and a long
    // language, so the picture gives way first: ~154pt there, 190pt on a Pro
    // Max, never below 110pt (an SE scrolls, and says so).
    const heroHeight = Math.round(Math.min(190, Math.max(110, Dimensions.get("window").height - 690)));
    const reveal = useRef(new Animated.Value(1)).current;
    const revealWidth = reveal.interpolate({
        inputRange: [0, 1],
        outputRange: [0, heroWidth],
    });
    // A slow push-in on a still — "this design, moving" — for the video hero.
    const drift = useRef(new Animated.Value(0)).current;
    const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(false));
    }, []);

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

    const offersBase = !!base && buyable(baseCode);
    const offersPro = !!pro && buyable(proCode);

    /**
     * 🔴 Plan satırları ARTIK HER ZAMAN çiziliyor — satın alınabilir olsun ya
     * da olmasın. Önceki sürüm onları offersX arkasına saklıyordu ve ödeyen
     * bir abone paywall'ı açtığında ortada boş bir boşluk görüyordu: kendi
     * planını, fiyatını, merdivenin neresinde durduğunu hiçbir yerden
     * okuyamıyordu. Fiyatı görmek satın almaktan ayrı bir ihtiyaç.
     * Satılamayan satır sönük ve dokunulamaz; üstünde de hangisi olduğu
     * yazıyor.
     */
    const anythingToBuy = !plans || offersBase || offersPro;

    // Seçim, gerçekten satın alınabilir olanın içinde kalmalı: BASE abonesi
    // varsayılan PRO seçimini yanlış planı fiyatlayan bir düğmeye taşımasın.
    const effectiveSelected = offersPro && offersBase
        ? selected
        : offersPro ? PLAN_PRO : PLAN_BASE;
    const chosen = effectiveSelected === PLAN_BASE
        ? (offersBase ? base : undefined)
        : (offersPro ? pro : undefined);

    /** When the subscriber's own weekly allocation comes back. */
    const reloadNote = useMemo(() => {
        if (!subscription?.currentPeriodEnd) return null;
        const diffMs = new Date(subscription.currentPeriodEnd).getTime() - Date.now();
        const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        if (days === 0) return t("paywall.reload_today");
        if (days === 1) return t("paywall.reload_tomorrow");
        return t("paywall.reload_in_days", { days });
    }, [subscription?.currentPeriodEnd, t]);

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
    const proWeekly = useMemo(() => plans?.find((p) => p.code === PLAN_PRO), [plans]);
    const introOffer = (() => {
        const intro = proWeekly?.appleProductId ? storePrices[proWeekly.appleProductId]?.intro ?? null : null;
        if (!intro) return null;
        const oneWeek = (intro.periodUnit === "WEEK" && intro.periodUnits === 1)
            || (intro.periodUnit === "DAY" && intro.periodUnits === 7);
        return oneWeek && intro.cycles === 1 ? intro : null;
    })();
    const [introEligible, setIntroEligible] = useState<boolean | null>(null);
    const [introWaitOver, setIntroWaitOver] = useState(false);
    useEffect(() => {
        const productId = proWeekly?.appleProductId;
        if (!introOffer || !productId || subscribed) {
            setIntroEligible(false);
            return;
        }
        let cancelled = false;
        // The Pro price waits for the answer — briefly. Showing the regular
        // price and then swapping in a lower one reads as a glitch; waiting
        // forever reads as a broken screen. After the wait the regular price
        // stands, and a late "eligible" still upgrades it (StoreKit applies
        // the offer at the sheet either way, so under-promising is safe).
        const timer = setTimeout(() => { if (!cancelled) setIntroWaitOver(true); }, INTRO_WAIT_MS);
        iap.fetchIntroEligibility([productId])
            .then((m) => { if (!cancelled) setIntroEligible(m[productId] === true); })
            .catch(() => { if (!cancelled) setIntroEligible(false); });
        return () => { cancelled = true; clearTimeout(timer); };
    }, [introOffer?.priceString, proWeekly?.appleProductId, subscribed]);
    const introShown = !!introOffer && introEligible === true && billing === "weekly" && offersPro;
    const introApplies = introShown && effectiveSelected === PLAN_PRO;
    const introPending = !!introOffer && introEligible === null && !introWaitOver
        && !subscribed && billing === "weekly" && offersPro;

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
    const proPrice = pricesLoading ? null : priceOf(pro);
    const basePrice = pricesLoading ? null : priceOf(base);
    const selectedIsPro = effectiveSelected === PLAN_PRO;
    const periodLabel = t(billing === "annual" ? "paywall.per_year" : "paywall.per_week");

    /** A price as a number, and whether it came from the store (same currency) or the backend (USD). */
    const numericPrice = (plan?: PlanResponse) => {
        if (!plan) return null;
        const sp = plan.appleProductId ? storePrices[plan.appleProductId] : undefined;
        if (sp && sp.price > 0) return { value: sp.price, store: true };
        return plan.priceCents > 0 ? { value: plan.priceCents / 100, store: false } : null;
    };

    /**
     * What a year costs against 52 weeks of the same tier, from the prices this
     * storefront actually charges. The label used to say "−30%" for both
     * tiers; the real figures were 49% (Pro) and 61% (Base). Rounded down, and
     * never computed across two currencies.
     */
    const annualSaving = (() => {
        // The tier whose year this toggle would actually sell: the selected
        // one — or Pro for anyone already on Pro, for whom Base is not for
        // sale (a Pro subscriber was shown Base's 61% on the simulator).
        const pro = selectedIsPro || tierRank(currentCode) >= tierRank(PLAN_PRO);
        const weekly = numericPrice(plans?.find((p) => p.code === (pro ? PLAN_PRO : PLAN_BASE)));
        const annual = numericPrice(plans?.find((p) => p.code === (pro ? PLAN_PRO_ANNUAL : PLAN_BASE_ANNUAL)));
        if (!weekly || !annual || weekly.store !== annual.store) return null;
        const pct = Math.floor((1 - annual.value / (52 * weekly.value)) * 100);
        return pct >= 5 ? pct : null;
    })();

    /** "First week −22%": the offer against this storefront's own weekly price. */
    const introPct = (() => {
        if (!introOffer || !proWeekly?.appleProductId) return null;
        const regular = storePrices[proWeekly.appleProductId]?.price;
        if (!regular || !(introOffer.price > 0)) return null;
        const pct = Math.floor((1 - introOffer.price / regular) * 100);
        return pct >= 5 ? pct : null;
    })();

    // ── The moment that opened the screen ────────────────────────────
    const hero: HeroSpec = (() => {
        if (PRO_TOOL_SOURCES.has(source)) return { kind: "pro" };
        if (source === SOURCE_FIRST_RESULT && ownAfter) {
            return ownBefore
                ? { kind: "wipe", before: { uri: ownBefore, headers: authHeaders }, after: { uri: ownAfter } }
                : { kind: "photo", image: { uri: ownAfter }, chip: t("result.after"), icon: "sparkles-outline", moving: false };
        }
        if (source === SOURCE_RESULT_VIDEO || (source === SOURCE_CREDITS_EXHAUSTED && ownAfter)) {
            return {
                kind: "photo", image: ownAfter ? { uri: ownAfter } : SAMPLE_AFTER,
                chip: t("paywall.chip_video"), icon: "videocam", moving: true,
            };
        }
        if (source === SOURCE_CREDITS_EXHAUSTED && pendingPhoto) {
            return { kind: "photo", image: { uri: pendingPhoto }, chip: t("paywall.chip_your_room"), icon: "image-outline", moving: false };
        }
        if (subscribed) return { kind: "pro" };
        return { kind: "wipe", before: SAMPLE_BEFORE, after: SAMPLE_AFTER };
    })();

    const headline: { title: string; sub: string | null } = (() => {
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

    const wantsWipe = hero.kind === "wipe";
    const wantsDrift = hero.kind === "photo" && hero.moving;
    useEffect(() => {
        if (reduceMotion === null) return;
        if (!wantsWipe) return;
        if (reduceMotion) {
            // Still show both rooms — just stop moving between them.
            reveal.setValue(0.5);
            return;
        }
        const hold = (v: number, ms: number) =>
            Animated.timing(reveal, { toValue: v, duration: ms, easing: Easing.inOut(Easing.cubic), useNativeDriver: false });
        const loop = Animated.loop(Animated.sequence([
            Animated.delay(600),
            hold(0.08, 1500),   // wipe to the redesigned room
            Animated.delay(1400),
            hold(0.95, 1500),   // and back to the original
            Animated.delay(700),
        ]));
        loop.start();
        return () => loop.stop();
    }, [wantsWipe, reduceMotion]);
    useEffect(() => {
        if (!wantsDrift || reduceMotion !== false) return;
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(drift, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(drift, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [wantsDrift, reduceMotion]);

    // ── Money lines ──────────────────────────────────────────────────
    const chosenPrice = !chosen || pricesLoading
        ? null
        : introApplies ? introOffer!.priceString : priceOf(chosen);
    const renewal = (() => {
        if (!anythingToBuy || !chosen || pricesLoading || introPending) return null;
        if (introApplies) return t("paywall.renewal_intro_week", { intro: introOffer!.priceString, price: priceOf(chosen) });
        return t(billing === "annual" ? "paywall.renewal_year" : "paywall.renewal_week", { price: priceOf(chosen) });
    })();

    const ctaLabel = anythingToBuy
        ? (selectedIsPro ? t("paywall.start_pro") : t("paywall.start_base"))
        : t("profile.buy_credits");

    const rowA11y = (tier: string, price: string | null, period: string) =>
        [tier, price ? `${price}${period}` : null].filter(Boolean).join(", ");

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: U.ground }} edges={["top", "bottom"]}>
            {/* Kapatma sağ üstte, bir çarpı. Bu ekran bir yığın adımı değil,
                üstüne açılan bir teklif — ve açılış kapısı olarak geldiğinde
                arkasında dönülecek bir ekran yok. Çarpı ikisinde de doğru. */}
            <View style={{
                paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6,
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            }}>
                <Text style={{ ...theme.v2.brand, color: U.inkMuted }} accessibilityElementsHidden importantForAccessibility="no">
                    Roomframe
                </Text>
                <Pressable
                    onPress={() => leave("DISMISSED")}
                    accessibilityRole="button"
                    accessibilityLabel={t("common.close")}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                        width: 34, height: 34, borderRadius: 17,
                        backgroundColor: U.lineNeutral,
                        alignItems: "center", justifyContent: "center",
                    }}
                >
                    <Ionicons name="close" size={19} color={U.ink} />
                </Pressable>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}
                showsVerticalScrollIndicator={false}
            >
                <Text style={{ ...theme.v2.displayL, color: U.ink }} accessibilityRole="header">
                    {headline.title}
                </Text>
                {headline.sub ? (
                    <Text style={{ ...theme.v2.body, color: U.inkMuted, marginTop: 8 }}>
                        {headline.sub}
                    </Text>
                ) : null}

                <View style={{ marginTop: 16 }}>
                    {hero.kind === "pro" ? (
                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <ProCard
                                image={require("@/assets/features/style_after.png")}
                                label={t("studio.mode_style_transfer")}
                                height={heroHeight - 30}
                            />
                            <ProCard
                                // outdoor_card.png is an 8 KB diagonal-stripe placeholder — the
                                // "asset missing" pattern, not a photograph.
                                image={require("@/assets/features/outdoor_after.png")}
                                label={t("studio.mode_outdoor")}
                                height={heroHeight - 30}
                            />
                        </View>
                    ) : hero.kind === "wipe" ? (
                        <WipeHero
                            before={hero.before}
                            after={hero.after}
                            width={heroWidth}
                            height={heroHeight}
                            revealWidth={revealWidth}
                            beforeLabel={t("result.before")}
                            afterLabel={t("result.after")}
                        />
                    ) : (
                        <PhotoHero
                            image={hero.image}
                            chip={hero.chip}
                            icon={hero.icon}
                            height={heroHeight}
                            drift={hero.moving ? drift : null}
                        />
                    )}
                </View>

                <BillingSegment
                    annual={billing === "annual"}
                    onChange={setBilling}
                    weeklyLabel={t("paywall.weekly")}
                    annualLabel={annualSaving != null ? t("paywall.annual_save", { pct: annualSaving }) : t("paywall.annual")}
                />

                {/* Merdivenin tamamı, her zaman, fiyatlarıyla. */}
                <View style={{ gap: 10, marginTop: 14 }}>
                    <UmberPlanRow
                        tier="PRO"
                        price={introPending ? null : introShown ? introOffer!.priceString : proPrice}
                        period={introShown ? t("paywall.first_week") : periodLabel}
                        then={introShown && proPrice ? t("paywall.then_price_week", { price: proPrice }) : null}
                        badge={introShown ? (introPct != null ? t("paywall.intro_badge", { pct: introPct }) : t("paywall.intro_badge_plain")) : null}
                        selected={offersPro && selectedIsPro}
                        current={currentCode === proCode}
                        locked={!offersPro}
                        currentLabel={t("plans.current_plan")}
                        a11yLabel={rowA11y("Pro", introShown ? introOffer!.priceString : proPrice, introShown ? ` ${t("paywall.first_week")}` : periodLabel)}
                        onPress={() => {
                            if (!offersPro) return;
                            touchedAPlan.current = true;
                            setSelected(PLAN_PRO);
                            recordPaywallEvent("PLAN_SELECTED", { source, planCode: PLAN_PRO });
                        }}
                    />
                    <UmberPlanRow
                        tier="BASE"
                        price={basePrice}
                        period={periodLabel}
                        then={null}
                        badge={null}
                        selected={offersBase && !selectedIsPro}
                        current={currentCode === baseCode}
                        locked={!offersBase}
                        currentLabel={t("plans.current_plan")}
                        a11yLabel={rowA11y("Base", basePrice, periodLabel)}
                        onPress={() => {
                            if (!offersBase) return;
                            touchedAPlan.current = true;
                            setSelected(PLAN_BASE);
                            recordPaywallEvent("PLAN_SELECTED", { source, planCode: PLAN_BASE });
                        }}
                    />
                </View>

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
                            marginTop: 10, flexDirection: "row", gap: 12,
                            alignItems: "center", justifyContent: "space-between",
                        }}
                    >
                        <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted, flex: 1 }}>
                            {t("paywall.pack_line", { credits: exhaustedPack.credits })}
                        </Text>
                        <Text style={{ fontFamily: "Inter-Bold", fontSize: 12.5, color: U.accentBright }}>
                            {priceOfPack(exhaustedPack)}
                        </Text>
                    </Pressable>
                )}
            </ScrollView>

            {/* Always in view: the button, what it will charge, and the three
                things Apple and a doubtful buyer both look for. */}
            <View style={{ paddingHorizontal: 18, paddingTop: 10, borderTopWidth: 1, borderTopColor: U.lineNeutral }}>
                {/* Satın alınacak bir şey varsa abonelik düğmesi; yoksa —
                    yani zaten en üstteyse — dürüst olan tek kapı kredi paketi.
                    Abonelik düğmesini orada bırakmak, kullanıcıyı Apple'ın
                    "bu abonelikte zaten varsınız" uyarısına göndermekti. */}
                <Pressable
                    onPress={anythingToBuy ? handleContinue : () => router.replace("/credits/packs" as never)}
                    disabled={anythingToBuy ? busy || !chosen : false}
                    accessibilityRole="button"
                    accessibilityLabel={chosenPrice && anythingToBuy ? `${ctaLabel}, ${chosenPrice}` : ctaLabel}
                    accessibilityState={{ disabled: anythingToBuy ? busy || !chosen : false, busy }}
                    style={{
                        height: 56, borderRadius: 16, backgroundColor: U.buttonFill,
                        opacity: anythingToBuy && (busy || !chosen) ? 0.5 : 1,
                        flexDirection: "row", alignItems: "center",
                        justifyContent: "space-between", paddingHorizontal: 22,
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
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                {anythingToBuy && chosenPrice && !introPending ? (
                                    <Text style={{ fontFamily: "NotoSerif", fontSize: 18, color: U.buttonInk }}>
                                        {chosenPrice}
                                    </Text>
                                ) : null}
                                <Text style={{ color: U.buttonInk, fontSize: 18 }}>→</Text>
                            </View>
                        </>
                    )}
                </Pressable>

                {/* 🔴 App Store 3.1.2: what is charged, how often, that it
                    renews, and how to stop it — next to the button, every time
                    a subscription can be bought. With the first-week offer the
                    regular price is spelled out in the same sentence. */}
                {renewal ? (
                    <Text style={{ ...theme.v2.caption, color: U.inkMuted, marginTop: 9, textAlign: "center" }}>
                        {renewal}
                    </Text>
                ) : null}

                <View style={{
                    flexDirection: "row", justifyContent: "center", alignItems: "center",
                    gap: 6, marginTop: 6, marginBottom: 4,
                }}>
                    <FooterLink label={t("paywall.restore_link")} onPress={handleRestore} disabled={busy} role="button" />
                    <Text style={{ ...theme.v2.caption, color: U.inkMuted }}>·</Text>
                    <FooterLink label={t("paywall.terms")} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})} role="link" />
                    <Text style={{ ...theme.v2.caption, color: U.inkMuted }}>·</Text>
                    <FooterLink label={t("paywall.privacy")} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} role="link" />
                </View>
            </View>
        </SafeAreaView>
    );
}

/** A locked capability, shown rather than described. */
function ProCard({ image, label, height }: { image: number; label: string; height: number }) {
    return (
        <View
            style={{ flex: 1, height, borderRadius: 16, overflow: "hidden", backgroundColor: U.surface }}
            accessible
            accessibilityRole="image"
            accessibilityLabel={label}
        >
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

/** A pill over a photograph: its own dark fill, whatever the photo. */
function PhotoChip({ label, icon }: { label: string; icon?: IoniconName }) {
    const { i18n } = useTranslation();
    return (
        <View style={{
            flexDirection: "row", alignItems: "center", gap: 5,
            paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100,
            backgroundColor: U.photoChrome, borderWidth: 1, borderColor: U.photoChromeBorder,
        }}>
            {icon ? <Ionicons name={icon} size={12} color="#fff" /> : null}
            <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 10.5, letterSpacing: tracking(0.8), color: "#fff" }}>
                {label.toLocaleUpperCase(i18n.language)}
            </Text>
        </View>
    );
}

/**
 * Before and after, wiping between the two — the user's own first result when
 * there is one, the sample room otherwise. The "before" window narrows over
 * the "after" photo; its image keeps full width so nothing slides.
 */
function WipeHero({
    before, after, width, height, revealWidth, beforeLabel, afterLabel,
}: {
    before: ImageSource | number; after: ImageSource | number;
    width: number; height: number;
    revealWidth: Animated.AnimatedInterpolation<number>;
    beforeLabel: string; afterLabel: string;
}) {
    return (
        <View
            style={{ height, borderRadius: 18, overflow: "hidden", backgroundColor: U.surface }}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${beforeLabel} / ${afterLabel}`}
        >
            <ExpoImage source={after} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
            <Animated.View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: revealWidth, overflow: "hidden" }}>
                <ExpoImage source={before} style={{ width, height }} contentFit="cover" transition={200} />
            </Animated.View>
            <Animated.View
                style={{
                    position: "absolute", top: 0, bottom: 0, width: 2, marginLeft: -1,
                    left: revealWidth, backgroundColor: U.accentBright,
                }}
            />
            <View style={{ position: "absolute", top: 10, left: 10 }}>
                <PhotoChip label={beforeLabel} />
            </View>
            <View style={{ position: "absolute", top: 10, right: 10 }}>
                <PhotoChip label={afterLabel} />
            </View>
        </View>
    );
}

/** One photograph with a label — the room waiting for credits, or the design about to move. */
function PhotoHero({
    image, chip, icon, height, drift,
}: {
    image: ImageSource | number; chip: string; icon: IoniconName; height: number;
    drift: Animated.Value | null;
}) {
    const transform = drift
        ? [
            { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
            { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
        ]
        : undefined;
    return (
        <View
            style={{ height, borderRadius: 18, overflow: "hidden", backgroundColor: U.surface }}
            accessible
            accessibilityRole="image"
            accessibilityLabel={chip}
        >
            <Animated.View style={{ width: "100%", height: "100%", transform }}>
                <ExpoImage source={image} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
            </Animated.View>
            <View style={{ position: "absolute", left: 10, bottom: 10 }}>
                <PhotoChip label={chip} icon={icon} />
            </View>
        </View>
    );
}

function BillingSegment({
    annual, onChange, weeklyLabel, annualLabel,
}: {
    annual: boolean; onChange: (v: "weekly" | "annual") => void;
    weeklyLabel: string; annualLabel: string;
}) {
    return (
        <View
            accessibilityRole="radiogroup"
            style={{
                marginTop: 16, flexDirection: "row", borderRadius: 100,
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
                        <Text
                            style={{ ...theme.v2.tier, color: active ? U.accentBright : U.inkMuted }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {key === "annual" ? annualLabel : weeklyLabel}
                        </Text>
                    </Pressable>
                );
            })}
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

/** A price that has not arrived yet: a quiet bar, never a wrong number. */
function PriceSkeleton() {
    const pulse = useRef(new Animated.Value(0.35)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 0.7, duration: 650, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0.35, duration: 650, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <Animated.View
            style={{ width: 66, height: 24, borderRadius: 6, backgroundColor: U.lineAccent, opacity: pulse, marginBottom: 4 }}
        />
    );
}

/**
 * Merdivenin bir basamağı.
 *
 * <p>Üç hâl: seçilebilir, seçili, ve satın alınamaz. Üçüncüsü sönük çiziliyor
 * ama FİYATI DURUYOR — kullanıcı kendi planının ne kadar olduğunu ve bir alt
 * basamağın ne kadar olduğunu görebilmeli; satın alma hakkının olmaması bunu
 * gizlemek için gerekçe değil. Üstünde bulunulan basamak ayrıca etiketli,
 * yoksa sönük satır "tükendi" gibi okunur.
 *
 * <p>2.0.0: a plan and its price, nothing else — the owner's call on
 * 26 Sep was "as plain as possible": no credit counts, no "≈ 20 designs",
 * no feature lists. With the first-week offer the price column reads
 * "$6.99 · first week · then $8.99/week" — the regular price never leaves
 * the row the offer is on.
 */
function UmberPlanRow({
    tier, price, period, then, badge, selected, current, locked, currentLabel, a11yLabel, onPress,
}: {
    tier: "PRO" | "BASE";
    /** Null while the store price is on its way — drawn as a skeleton. */
    price: string | null; period: string;
    /** "then $8.99/week" under an introductory price; null otherwise. */
    then: string | null;
    /** The first-week offer, when the store has it AND this Apple ID may take it. */
    badge: string | null;
    selected: boolean; current: boolean; locked: boolean;
    currentLabel: string; a11yLabel: string;
    onPress: () => void;
}) {
    const isPro = tier === "PRO";
    // Locale-aware: Turkish "i" is "İ" in capitals, not "I".
    const { i18n } = useTranslation();
    const upper = (s: string) => s.toLocaleUpperCase(i18n.language);
    return (
        <Pressable
            onPress={onPress}
            disabled={locked}
            accessibilityRole="radio"
            accessibilityLabel={a11yLabel}
            accessibilityState={{ selected, disabled: locked }}
            style={{
                borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16,
                borderWidth: selected || current ? 1.5 : 1,
                borderColor: selected ? U.accent : current ? U.accentBright : U.lineNeutral,
                backgroundColor: isPro ? U.surface : "transparent",
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                gap: 12,
                // Üstünde olunan plan sönmez — o bir bilgi, bir kısıt değil.
                opacity: locked && !current ? 0.45 : 1,
            }}
        >
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <View style={{
                        width: 16, height: 16, borderRadius: 8, borderWidth: 1.5,
                        borderColor: selected ? U.accent : U.lineNeutral,
                        alignItems: "center", justifyContent: "center",
                    }}>
                        {selected ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: U.accent }} /> : null}
                    </View>
                    <Text style={{ ...theme.v2.tier, color: isPro ? U.accentBright : U.inkMuted }}>
                        {tier}
                    </Text>
                    {current ? (
                        <View style={{
                            paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100,
                            backgroundColor: U.lineAccent, borderWidth: 1, borderColor: U.accent,
                        }}>
                            <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 9.5, letterSpacing: tracking(0.8), color: U.accentBright }}>
                                {upper(currentLabel)}
                            </Text>
                        </View>
                    ) : badge ? (
                        // Dolu rozet: bu satırdaki en güçlü tek argüman ve
                        // "mevcut plan" ile aynı anda asla görünmez.
                        <View style={{
                            paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 100,
                            backgroundColor: U.accent,
                        }}>
                            <Text style={{ fontFamily: "Inter-Bold", fontSize: 9.5, letterSpacing: tracking(0.8), color: U.buttonInk }}>
                                {upper(badge)}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
                {price ? (
                    <Text style={{ ...theme.v2.price, color: U.ink }}>{price}</Text>
                ) : (
                    <PriceSkeleton />
                )}
                <Text style={{ ...theme.v2.caption, color: then ? U.accentBright : U.inkMuted }}>{period}</Text>
                {then ? (
                    <Text style={{ ...theme.v2.caption, color: U.inkMuted }}>{then}</Text>
                ) : null}
            </View>
        </Pressable>
    );
}
