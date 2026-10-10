import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { recordPaywallEvent } from "@/services/telemetry";
import {
    purchaseAlertKeys,
    reportPurchaseOutcome,
    reportPurchaseSuccess,
} from "@/services/purchaseOutcome";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreditPacksStore } from "@/stores/creditPacksStore";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useStorePricesStore } from "@/stores/storePricesStore";
import { formatProductPrice } from "@/utils/price";

const U = theme.umber;
import { isDummyMode } from "@/config/revenuecat";
import { theme } from "@/config/theme";
import { useWindowDimensions } from "react-native";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { useBackHandler } from "@/utils/navigation";
import { PaywallHero } from "@/components/paywall/PaywallHero";
import { FadeSwapText } from "@/components/paywall/PaywallPlanRow";
import { PackRow } from "@/components/credits/PackRow";

/**
 * The bundled room behind the packs headline. Not the paywall's sample (that
 * one is the subscription offer's picture) — a second finished room, so the
 * two shops do not look like the same screen opened twice.
 */
const PACKS_HERO = require("@/assets/features/redesign_after.jpg");

/*
 * 2026-10-10 (redesign v3): the unused PackCard component that sat here
 * came off. Nothing rendered it since the Umber pass of 19 September, and it
 * still carried the "≈ N standard renders" line the owner retired.
 */

export default function CreditPacksScreen() {
    const { t } = useTranslation();
    const packs = useCreditPacksStore((s) => s.packs);
    const loading = useCreditPacksStore((s) => s.loading);
    const purchasing = useCreditPacksStore((s) => s.purchasing);
    const fetchPacks = useCreditPacksStore((s) => s.fetchPacks);
    const purchase = useCreditPacksStore((s) => s.purchase);
    const balance = useCreditStore((s) => s.balance);
    const { height: screenH } = useWindowDimensions();
    const subscription = useSubscriptionStore((s) => s.subscription);
    const creditPackBonusPct = useSubscriptionStore((s) => s.creditPackBonusPct);
    const getCreditCost = useSubscriptionStore((s) => s.getCreditCost);
    // Plan-aware credit cost for the pack usage hint. Read once at render
    // time; resolved against the active plan's `plan_credit_rules`.
    //
    // The HD line is gone (2026-09-01): HD meant "2 MP instead of 1" and V69
    // made 2 MP the floor, so "how many HD designs does this buy" no longer
    // describes anything a user can choose. hdCost is passed as 0, which is
    // the suppression path PackCard already had for FREE.
    const standardCost = getCreditCost("INTERIOR_REDESIGN", "STANDARD", 1);
    const hdCost = 0;

    // Set when a purchase lands, so unmount does not report a dismissal on
    // top of it. A ref, not state: it is read during teardown, when a state
    // update would already have been discarded.
    const purchasedRef = useRef(false);
    const hydrateStorePrices = useStorePricesStore((s) => s.hydrate);

    // Localized pack prices — idempotent retry in case boot hydration
    // raced an offline window.
    useEffect(() => {
        hydrateStorePrices();
    }, [hydrateStorePrices]);

    useEffect(() => {
        fetchPacks();
    }, []);

    // SHOWN gives this screen the denominator every other paywall surface
    // already had. Without it the funnel could say six people tapped a pack
    // and nothing about how many opened the screen and left — so "almost
    // nobody buys credits" and "almost nobody reaches the screen" read the
    // same, and they call for opposite fixes.
    //
    // DISMISSED fires from the teardown rather than from the back button:
    // every exit passes through unmount, but only one of them passes through
    // that button. iOS's edge-swipe would have been missing from the count,
    // and a denominator that silently drops a whole exit route is worse than
    // none — it looks trustworthy.
    useEffect(() => {
        recordPaywallEvent("SHOWN", { source: "PACKS_SCREEN" });
        return () => {
            if (!purchasedRef.current) {
                recordPaywallEvent("DISMISSED", { source: "PACKS_SCREEN" }).catch(() => {});
            }
        };
    }, []);

    const handlePurchase = async (packCode: string) => {
        // Same funnel table as the paywall (V65); this screen's sales were
        // invisible there until 2026-09-06.
        await recordPaywallEvent("PURCHASE_STARTED", { source: "PACKS_SCREEN", planCode: packCode });
        try {
            const result = await purchase(packCode);
            purchasedRef.current = true;
            reportPurchaseSuccess({ source: "PACKS_SCREEN", planCode: packCode }).catch(() => {});
            // Webhook grant hasn't reconciled within the poll window — the
            // purchase went through on Apple's side, credits land shortly.
            const pending = (result as { pending?: boolean }).pending
                || result.creditsGranted <= 0;
            Alert.alert(
                pending
                    ? t("credit_packs.credits_pending_title", { defaultValue: "Purchase received" })
                    : t("credit_packs.credits_added_title"),
                pending
                    ? t("credit_packs.credits_pending_description", {
                        defaultValue: "Your purchase went through — the credits will appear in a moment.",
                    })
                    : t("credit_packs.credits_added_description", {
                        credits: result.creditsGranted,
                        balance: result.newBalance,
                    }),
                [{ text: "OK", onPress: () => router.back() }],
            );
        } catch (e: unknown) {
            // Until 2026-09-15 this block recorded FAILED for everything,
            // cancellation included, and told the user their purchase had
            // failed when they had simply changed their mind. Six of the six
            // failures this table ever held came from this screen, and not one
            // of them recorded why.
            const result = await reportPurchaseOutcome(e, {
                source: "PACKS_SCREEN", planCode: packCode,
            });
            if (result.cancelled) {
                return;
            }
            const named = purchaseAlertKeys(result);
            if (named) {
                Alert.alert(t(named.title), t(named.body));
                return;
            }
            const status = (e as any)?.response?.status;
            const message =
                status === 429
                    ? t("errors.rate_limit")
                    : status >= 500
                        ? t("errors.generic")
                        : t("credit_packs.purchase_failed_default");
            Alert.alert(t("credit_packs.purchase_failed_title"), message);
        }
    };

    const creditPackBonusPct2 = creditPackBonusPct;
    const storePrices = useStorePricesStore((st) => st.prices);
    /**
     * Credit packs (Umber, 2026-09-19 → redesign v3, 2026-10-10).
     *
     * <p>v3 brings this screen into the paywall's language: a full-bleed room
     * under the status bar with the headline sitting on it, the balance as a
     * chip on the photo (the number the old top card showed), the packs as
     * selectable rows in the paywall's shape, and one gold button pinned to
     * the bottom that says what Apple will charge today.
     *
     * <p>A row used to BE the buy button. It now selects, and the button buys
     * — the same two-step the paywall uses, so a stray tap while scrolling
     * no longer opens Apple's sheet. The featured pack (the one with a badge)
     * starts selected.
     *
     * <p>🔴 handlePurchase, the store call, the pending-purchase alert, the
     * SHOWN/DISMISSED/PURCHASE_STARTED telemetry and the outcome classifier
     * are unchanged. Only the presentation moved.
     */
    const insets = useSafeAreaInsets();
    const reduceMotion = useReduceMotion();
    const handleBack = useBackHandler("/(tabs)/profile");
    // Same budget as the paywall: ~39% of the height, 220–350 pt. On a 390×844
    // phone that leaves the three rows, the button and the note in view.
    const heroHeight = Math.round(Math.min(350, Math.max(220, screenH * 0.39)));

    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const chosen =
        packs.find((p) => p.code === selectedCode)
        ?? packs.find((p) => p.badgeLabel != null)
        ?? packs[0]
        ?? null;

    const priceOfPack = (pack: (typeof packs)[number]) =>
        formatProductPrice(storePrices, pack.appleProductId, pack.priceCents, pack.currency);

    const ctaLabel = t("profile.buy_credits");
    const ctaPrice = chosen ? priceOfPack(chosen) : null;
    const ctaDisabled = !chosen || purchasing !== null;

    return (
        <View style={{ flex: 1, backgroundColor: U.ground }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 14 }}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <PaywallHero
                    spec={{
                        kind: "photo",
                        image: PACKS_HERO,
                        chip: `${balance} ${t("credit_packs.credits_suffix")}`,
                        icon: "wallet-outline",
                    }}
                    height={heroHeight}
                    // +4: the chip starts below the pinned back button, not against it.
                    topInset={insets.top + 4}
                    kicker={t("credit_packs.title")}
                    title={t("credit_packs.headline")}
                    beforeLabel=""
                    reduceMotion={reduceMotion}
                />

                <View style={{ paddingHorizontal: theme.v2Layout.gutterWide, paddingTop: 14, gap: 12 }}>
                    <Text style={{ ...theme.v2.body, fontSize: 14, lineHeight: 21, color: theme.color.onSurfaceVariant }}>
                        {t("credit_packs.promise_line")}
                    </Text>

                    {loading ? (
                        <ActivityIndicator color={U.accent} style={{ marginTop: 24 }} />
                    ) : (
                        packs.map((pack) => {
                            const bonus =
                                creditPackBonusPct2 > 0
                                    ? Math.floor((pack.credits * creditPackBonusPct2) / 100)
                                    : 0;
                            const total = pack.credits + bonus;
                            const creditsLine = bonus > 0
                                ? t("credit_packs.credits_with_bonus", { total, bonus })
                                : t("credit_packs.credits_plain", { count: pack.credits });
                            const price = priceOfPack(pack);
                            return (
                                <PackRow
                                    key={pack.code}
                                    name={pack.name}
                                    creditsLine={creditsLine}
                                    price={price}
                                    badge={pack.badgeLabel ?? null}
                                    selected={chosen?.code === pack.code}
                                    busy={purchasing === pack.code}
                                    dimmed={!!purchasing && purchasing !== pack.code}
                                    disabled={purchasing !== null}
                                    a11yLabel={[pack.name, creditsLine, price].join(", ")}
                                    reduceMotion={reduceMotion}
                                    onPress={() => setSelectedCode(pack.code)}
                                />
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* Always in view: the button and what it will charge today. */}
            <View style={{
                paddingHorizontal: theme.v2Layout.gutterWide, paddingTop: 10,
                paddingBottom: Math.max(insets.bottom, 12),
            }}>
                <Pressable
                    onPress={chosen ? () => handlePurchase(chosen.code) : undefined}
                    disabled={ctaDisabled}
                    accessibilityRole="button"
                    accessibilityLabel={ctaPrice ? `${ctaLabel}, ${t("paywall.price_today", { price: ctaPrice })}` : ctaLabel}
                    accessibilityState={{ disabled: ctaDisabled, busy: purchasing !== null }}
                    style={{
                        borderRadius: theme.v2Layout.radius.button,
                        opacity: ctaDisabled ? 0.5 : 1,
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
                        {purchasing !== null ? (
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

                {/* 2.0.0: "Subscribe for up to +40% bonus credits" came off. The
                    40% belonged to the retired Max plan — live plans give
                    Base +10% and Pro +20% on packs — and the owner wants this
                    screen plain: packs and prices. */}
                <Text style={{ ...theme.v2.caption, color: U.inkMuted, textAlign: "center", marginTop: 10 }}>
                    {t("credit_packs.secured_note")}
                </Text>
            </View>

            {/* Back, pinned over the photo on its own dark fill — the hero runs
                under the status bar, so the control must never scroll away.
                Same exit as the edge-swipe (and as the ledger screen's back). */}
            <Pressable
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel={t("common.back")}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                style={{
                    position: "absolute", top: insets.top + 4, left: 14,
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: U.photoChrome, borderWidth: 1, borderColor: U.photoChromeBorder,
                    alignItems: "center", justifyContent: "center",
                }}
            >
                <Ionicons name="chevron-back" size={20} color={U.ink} />
            </Pressable>
        </View>
    );
}
