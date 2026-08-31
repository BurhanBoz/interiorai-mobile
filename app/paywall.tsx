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
import { setFlag } from "@/utils/oneShotFlag";
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

const PLAN_ANNUAL = "PRO_ANNUAL";
const PLAN_WEEKLY = "PRO_WEEKLY";

/** Weeks per year, used only to express annual as a weekly-equivalent saving. */
const WEEKS_PER_YEAR = 52;

export default function PaywallScreen() {
    const { t } = useTranslation();
    const plans = useSubscriptionStore((s) => s.plans);
    const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
    const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
    const storePrices = useStorePricesStore((s) => s.prices);

    const [selected, setSelected] = useState<string>(PLAN_ANNUAL);
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
        // Mark it seen the moment it renders, not on exit: a user who kills the
        // app mid-screen has still seen it, and replaying it on next launch
        // would read as the app nagging.
        setFlag("paywall_onboarding").catch(() => {});
    }, []);

    const annual = useMemo(() => plans?.find((p) => p.code === PLAN_ANNUAL), [plans]);
    const weekly = useMemo(() => plans?.find((p) => p.code === PLAN_WEEKLY), [plans]);

    /**
     * Real saving, computed from the two live prices — never a hardcoded badge.
     * Returns null when either price is missing so the badge disappears rather
     * than rendering a number we cannot stand behind.
     */
    const savingPct = useMemo(() => {
        if (!annual?.priceCents || !weekly?.priceCents) return null;
        const weeklyYear = weekly.priceCents * WEEKS_PER_YEAR;
        if (weeklyYear <= annual.priceCents) return null;
        return Math.round((1 - annual.priceCents / weeklyYear) * 100);
    }, [annual, weekly]);

    const priceOf = (plan?: typeof annual) =>
        plan ? formatProductPrice(storePrices, plan.appleProductId, plan.priceCents, plan.currency) : "—";

    const leave = async (event: "DISMISSED" | "PURCHASED", planCode?: string) => {
        await recordPaywallEvent(event, { planCode });
        router.replace("/(tabs)/studio");
    };

    const handleContinue = async () => {
        const plan = selected === PLAN_ANNUAL ? annual : weekly;
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

    const benefits: { icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
        { icon: "sparkles", key: "paywall.benefit_quality" },
        { icon: "color-wand", key: "paywall.benefit_features" },
        { icon: "water-outline", key: "paywall.benefit_watermark" },
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
                                label={t("paywall.annual")}
                                sub={t("paywall.annual_sub")}
                                price={priceOf(annual)}
                                badge={savingPct ? t("paywall.save_pct", { pct: savingPct }) : null}
                                selected={selected === PLAN_ANNUAL}
                                onPress={() => {
                                    setSelected(PLAN_ANNUAL);
                                    recordPaywallEvent("PLAN_SELECTED", { planCode: PLAN_ANNUAL });
                                }}
                            />
                            <PlanCard
                                label={t("paywall.weekly")}
                                sub={t("paywall.weekly_sub")}
                                price={priceOf(weekly)}
                                badge={null}
                                selected={selected === PLAN_WEEKLY}
                                onPress={() => {
                                    setSelected(PLAN_WEEKLY);
                                    recordPaywallEvent("PLAN_SELECTED", { planCode: PLAN_WEEKLY });
                                }}
                            />
                        </View>
                    )}

                    <View style={{ marginTop: 18 }}>
                        <PrimaryButton
                            label={t("paywall.continue")}
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
            <View style={{ flex: 1 }}>
                <Text style={{ ...theme.text.label, color: theme.color.onSurface }}>{label}</Text>
                <Text style={{ ...theme.text.caption, color: theme.color.onSurfaceMuted, marginTop: 2 }}>
                    {sub}
                </Text>
            </View>
            {badge ? (
                <View style={{
                    backgroundColor: theme.color.goldContainer, borderRadius: 999,
                    paddingHorizontal: 8, paddingVertical: 3, marginRight: 6,
                }}>
                    <Text style={{ ...theme.text.caption, color: theme.color.onGold, fontWeight: "700" }}>
                        {badge}
                    </Text>
                </View>
            ) : null}
            <Text style={{ ...theme.text.label, color: theme.color.onSurface }}>{price}</Text>
        </Pressable>
    );
}
