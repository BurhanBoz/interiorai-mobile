import { useEffect, useMemo, useState } from "react";
import {
    View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Image, Linking,
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
            router.replace("/(tabs)/studio");
        } catch {
            Alert.alert(t("paywall.restore_failed_title"), t("paywall.restore_failed"));
        } finally {
            setBusy(false);
        }
    };

    const benefits: { icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
        { icon: "infinite", key: "paywall.benefit_credits" },
        { icon: "sparkles", key: "paywall.benefit_quality" },
        { icon: "color-wand", key: "paywall.benefit_features" },
        { icon: "water-outline", key: "paywall.benefit_watermark" },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surface }} edges={["top", "bottom"]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>

                {/* ── Hero: the product's own before/after, not a stock promise ── */}
                <View style={{ height: 260, position: "relative" }}>
                    <View style={{ flexDirection: "row", flex: 1 }}>
                        <Image source={require("@/assets/trial/kitchen_Before.png")}
                               style={{ flex: 1, height: "100%" }} resizeMode="cover" />
                        <Image source={require("@/assets/trial/kitchen_After.png")}
                               style={{ flex: 1, height: "100%" }} resizeMode="cover" />
                    </View>
                    <LinearGradient
                        colors={["transparent", theme.color.surface]}
                        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 110 }}
                    />
                    <Text style={{
                        position: "absolute", top: 14, left: 16, ...theme.text.caption,
                        color: theme.color.onSurface, backgroundColor: "rgba(19,19,19,0.7)",
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                        overflow: "hidden",
                    }}>{t("result.before")}</Text>
                    <Text style={{
                        position: "absolute", top: 14, right: 16, ...theme.text.caption,
                        color: theme.color.onGold, backgroundColor: theme.color.goldContainer,
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                        overflow: "hidden",
                    }}>{t("result.after")}</Text>

                    <Pressable
                        onPress={() => leave("DISMISSED")}
                        hitSlop={12}
                        accessibilityLabel={t("common.close")}
                        style={{
                            position: "absolute", top: 12, right: 16, width: 34, height: 34,
                            borderRadius: 17, alignItems: "center", justifyContent: "center",
                            backgroundColor: "rgba(19,19,19,0.55)",
                        }}
                    >
                        <Ionicons name="close" size={20} color={theme.color.onSurface} />
                    </Pressable>
                </View>

                <View style={{ paddingHorizontal: theme.space.gutter, marginTop: -18 }}>
                    <Text style={{ ...theme.text.display, color: theme.color.goldMidday, textAlign: "center" }}>
                        {t("paywall.title")}
                    </Text>
                    <Text style={{
                        ...theme.text.body, color: theme.color.onSurfaceMuted,
                        textAlign: "center", marginTop: 6, marginBottom: 22,
                    }}>
                        {t("paywall.subtitle")}
                    </Text>

                    {/* ── Benefits ── */}
                    <View style={{ gap: 12, marginBottom: 26 }}>
                        {benefits.map((b) => (
                            <View key={b.key} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <View style={{
                                    width: 32, height: 32, borderRadius: 16,
                                    backgroundColor: theme.color.surfaceContainerHigh,
                                    alignItems: "center", justifyContent: "center",
                                }}>
                                    <Ionicons name={b.icon} size={17} color={theme.color.goldContainer} />
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

                    <View style={{ marginTop: 22 }}>
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
                        textAlign: "center", marginTop: 12,
                    }}>
                        {t("paywall.renewal_note")}
                    </Text>

                    <View style={{
                        flexDirection: "row", justifyContent: "center",
                        alignItems: "center", gap: 18, marginTop: 18,
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

                    <Pressable onPress={() => leave("DISMISSED")} hitSlop={10} style={{ marginTop: 20 }}>
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
