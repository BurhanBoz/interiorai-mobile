import { useEffect, useMemo, useRef, useState } from "react";
import {
    View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Image, Linking,
    Animated, Easing, AccessibilityInfo, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useStorePricesStore } from "@/stores/storePricesStore";
import { formatProductPrice } from "@/utils/price";
import * as iap from "@/services/iap";
import { recordPaywallEvent } from "@/services/telemetry";
import { planTier } from "@/utils/planTier";

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

export default function PaywallScreen() {
    const { t } = useTranslation();
    const plans = useSubscriptionStore((s) => s.plans);
    const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
    const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
    const storePrices = useStorePricesStore((s) => s.prices);

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
        recordPaywallEvent("SHOWN");
        // No "already seen" flag any more. It was the wrong question: a flag
        // asks "have we shown this before", and the answer we actually want is
        // "does this person pay us" — which app/index.tsx now asks on every
        // launch. Worse, that flag lived in the Keychain, so it survived app
        // deletion and silenced the paywall for reinstalls too.
    }, []);

    const pro = useMemo(() => plans?.find((p) => p.code === PLAN_PRO), [plans]);
    const base = useMemo(() => plans?.find((p) => p.code === PLAN_BASE), [plans]);
    const chosen = selected === PLAN_BASE ? base : pro;

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

    const leave = async (event: "DISMISSED" | "PURCHASED", planCode?: string) => {
        await recordPaywallEvent(event, { planCode });
        router.replace("/(tabs)/studio");
    };

    const handleContinue = async () => {
        const plan = chosen;
        if (!plan || busy) return;

        setBusy(true);
        await recordPaywallEvent("PURCHASE_STARTED", { planCode: plan.code });
        try {
            await iap.purchaseSubscription(plan.code, plan.appleProductId);
            await fetchSubscription().catch(() => {});
            await leave("PURCHASED", plan.code);
        } catch (e) {
            if (iap.isUserCancelled(e)) {
                // Cancelling the Apple sheet is not a failure and must not be
                // reported as one — it would inflate the FAILED bucket with
                // people who simply changed their mind at the last step.
                await recordPaywallEvent("DISMISSED", { planCode: plan.code });
            } else {
                await recordPaywallEvent("FAILED", { planCode: plan.code });
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
                await recordPaywallEvent("PURCHASED", { planCode: restored });
                router.replace("/(tabs)/studio");
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
                    <Image source={require("@/assets/trial/kitchen_After.png")}
                           style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    <Animated.View style={{
                        position: "absolute", top: 0, left: 0, bottom: 0,
                        width: revealWidth, overflow: "hidden",
                    }}>
                        <Image source={require("@/assets/trial/kitchen_Before.png")}
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
                        {t("paywall.title")}
                    </Text>

                    {/* ── Benefits ── */}
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

                    {/* ── Plans ── */}
                    {!plans ? (
                        <ActivityIndicator color={theme.color.goldContainer} style={{ marginVertical: 30 }} />
                    ) : (
                        <View style={{ gap: 12 }}>
                            <PlanCard
                                label={t("paywall.plan_base")}
                                sub={t("paywall.plan_base_sub", { credits: base?.monthlyCredits ?? 0 })}
                                price={priceOf(base)}
                                badge={bestValueCode === PLAN_BASE ? t("paywall.best_value") : null}
                                selected={selected === PLAN_BASE}
                                onPress={() => {
                                    setSelected(PLAN_BASE);
                                    recordPaywallEvent("PLAN_SELECTED", { planCode: PLAN_BASE });
                                }}
                            />
                            <PlanCard
                                label={t("paywall.plan_pro")}
                                sub={t("paywall.plan_pro_sub", { credits: pro?.monthlyCredits ?? 0 })}
                                price={priceOf(pro)}
                                badge={bestValueCode === PLAN_PRO ? t("paywall.best_value") : null}
                                selected={selected === PLAN_PRO}
                                onPress={() => {
                                    setSelected(PLAN_PRO);
                                    recordPaywallEvent("PLAN_SELECTED", { planCode: PLAN_PRO });
                                }}
                            />
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
                    <View style={{ marginTop: 18 }}>
                        <PrimaryButton
                            label={t("paywall.subscribe_cta", { price: priceOf(chosen) })}
                            onPress={handleContinue}
                            loading={busy}
                            disabled={!plans}
                        />
                    </View>

                    {/* Renewal terms in plain words — Apple 3.1.2 wants the user to
                        know what recurs before they tap, not after. */}
                    <Text style={{
                        ...theme.text.caption, color: theme.color.onSurfaceMuted,
                        textAlign: "center", marginTop: 10,
                    }}>
                        {t("paywall.renewal_note")}
                    </Text>

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
