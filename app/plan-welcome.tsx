import { useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useCreditStore } from "@/stores/creditStore";
import { useStudioStore } from "@/stores/studioStore";
import { planTier } from "@/utils/planTier";
import { creditsBuy } from "@/utils/planValue";
import { track } from "@/services/analytics";

const U = theme.umber;

/** Paywalls opened as the first screen: there is nothing behind them to go back to. */
const ENTRY_SOURCES = new Set(["ONBOARDING", "APP_OPEN"]);

/**
 * Right after a purchase (2.0.0).
 *
 * <p>Until 1.7.1 the paywall simply closed: the person landed back where they
 * were and had to start again the thing they had just paid to do. In
 * September three of four weekly buyers turned auto-renew off the next day,
 * and one hit the credits wall minutes after paying. This screen says what was
 * bought in units a person understands, and puts them back into the exact
 * task that opened the paywall — one tap.
 *
 * <p>No prompt of any kind appears in this visit (postPurchaseStore keeps the
 * rating, push and offer asks quiet), so nothing competes with it.
 */
export default function PlanWelcomeScreen() {
    const { t } = useTranslation();
    const params = useLocalSearchParams<{ source?: string; plan?: string }>();
    const source = typeof params.source === "string" ? params.source.toUpperCase() : "";
    const boughtCode = typeof params.plan === "string" ? params.plan : "";

    const plans = useSubscriptionStore((s) => s.plans);
    const subscription = useSubscriptionStore((s) => s.subscription);
    const balance = useCreditStore((s) => s.balance);
    const fetchBalance = useCreditStore((s) => s.fetchBalance);
    const setMode = useStudioStore((s) => s.setMode);

    // The webhook can land a moment after the purchase call returns; read the
    // wallet again rather than show a number from before the purchase.
    useEffect(() => {
        fetchBalance().catch(() => {});
        track("plan_welcome_viewed", { source, plan: boughtCode });
    }, []);

    const isPack = boughtCode.startsWith("CREDITS");
    const tier = isPack ? planTier(subscription?.planCode) : planTier(boughtCode);
    // Which plan's prices a credit is spent at: the subscription's own, or —
    // for a pack on the free plan — the paid prices a pack switches on.
    const pricingPlan = useMemo(() => {
        const code = !isPack ? boughtCode : subscription?.planCode && planTier(subscription.planCode) !== "FREE"
            ? subscription.planCode : "PRO_WEEKLY";
        return plans?.find((p) => p.code === code) ?? null;
    }, [plans, boughtCode, isPack, subscription?.planCode]);

    const credits = balance ?? 0;
    const buys = creditsBuy(pricingPlan, credits);

    const title = isPack
        ? t("plan_welcome.title_pack")
        : tier === "PRO" ? t("plan_welcome.title_pro") : t("plan_welcome.title_base");

    const unlocked: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [];
    if (!isPack) {
        unlocked.push({ icon: "videocam-outline", label: t("plan_welcome.feature_video") });
        if (tier === "PRO") {
            unlocked.push({ icon: "color-wand-outline", label: t("studio.mode_style_transfer") });
            unlocked.push({ icon: "leaf-outline", label: t("studio.mode_outdoor") });
        }
        unlocked.push({ icon: "water-outline", label: t("plan_welcome.feature_no_watermark") });
    }

    const entry = ENTRY_SOURCES.has(source);
    const primary = () => {
        track("plan_welcome_continue", { source, entry });
        if (entry) router.replace("/(tabs)/studio" as never);
        else router.back();
    };

    const openMode = (mode: string, route: string) => {
        track("plan_welcome_try", { mode });
        setMode(mode as never);
        router.replace(route as never);
    };

    const tries: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; onPress: () => void }[] = [];
    if (!isPack || tier !== "FREE") {
        tries.push({
            key: "video", icon: "film-outline", label: t("plan_welcome.try_video"),
            sub: t("plan_welcome.try_video_sub", { cta: t("result.video_cta") }),
            onPress: () => { track("plan_welcome_try", { mode: "ROOM_VIDEO" }); router.replace("/(tabs)/gallery" as never); },
        });
    }
    tries.push({
        key: "empty", icon: "cube-outline", label: t("studio.mode_empty_room"),
        onPress: () => openMode("EMPTY_ROOM", "/studio/composer"),
    });
    if (tier === "PRO") {
        tries.push({
            key: "style", icon: "color-wand-outline", label: t("studio.mode_style_transfer"),
            onPress: () => openMode("STYLE_TRANSFER", "/studio/style-transfer"),
        });
    } else {
        tries.push({
            key: "magic", icon: "brush-outline", label: t("studio.mode_inpaint"),
            onPress: () => openMode("INPAINT", "/studio/smart-edit"),
        });
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: U.ground }} edges={["top", "bottom"]}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 36, paddingBottom: 24, gap: 22 }}>
                <View style={{ alignItems: "center", gap: 14 }}>
                    <View style={{
                        width: 64, height: 64, borderRadius: 32, backgroundColor: U.lineAccent,
                        borderWidth: 1, borderColor: U.accent, alignItems: "center", justifyContent: "center",
                    }}>
                        <Ionicons name="checkmark" size={32} color={U.accentBright} />
                    </View>
                    <Text style={{ ...theme.v2.displayS, color: U.ink, textAlign: "center" }}>{title}</Text>
                </View>

                <View style={{
                    borderRadius: 18, backgroundColor: U.surface, borderWidth: 1, borderColor: U.lineNeutral,
                    paddingVertical: 18, paddingHorizontal: 18, gap: 6,
                }}>
                    <Text style={{ ...theme.v2.price, color: U.ink }}>{t("plan_welcome.balance", { count: credits })}</Text>
                    {buys.designs != null ? (
                        <Text style={{ ...theme.v2.body, color: U.inkMuted }}>
                            {buys.videos != null && buys.videos > 0
                                ? t("plan_welcome.balance_value", {
                                    designs: t("paywall.n_designs", { count: buys.designs }),
                                    videos: t("paywall.n_videos", { count: buys.videos }),
                                })
                                : t("plan_welcome.balance_value_designs", {
                                    designs: t("paywall.n_designs", { count: buys.designs }),
                                })}
                        </Text>
                    ) : null}
                </View>

                {unlocked.length > 0 ? (
                    <View style={{ gap: 10 }}>
                        <Text style={{ ...theme.v2.tier, color: U.inkMuted }}>{t("plan_welcome.unlocked")}</Text>
                        {unlocked.map((u) => (
                            <View key={u.label} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <Ionicons name={u.icon} size={20} color={U.accentBright} />
                                <Text style={{ ...theme.v2.body, color: U.ink }}>{u.label}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                <View style={{ gap: 10 }}>
                    <Text style={{ ...theme.v2.tier, color: U.inkMuted }}>{t("plan_welcome.try_title")}</Text>
                    {tries.map((x) => (
                        <Pressable
                            key={x.key}
                            onPress={x.onPress}
                            accessibilityRole="button"
                            // A plain style object: the function form was dropped
                            // by the styling layer here and the tile fell apart
                            // into a column (simulator, 26 Sep).
                            style={{
                                flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16,
                                borderWidth: 1, borderColor: U.lineNeutral, paddingVertical: 14, paddingHorizontal: 16,
                            }}
                        >
                            <Ionicons name={x.icon} size={22} color={U.accentBright} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 15, color: U.ink }}>{x.label}</Text>
                                {x.sub ? <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted, marginTop: 2 }}>{x.sub}</Text> : null}
                            </View>
                            <Text style={{ color: U.inkMuted, fontSize: 18 }}>›</Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>

            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                <Pressable
                    onPress={primary}
                    accessibilityRole="button"
                    style={{
                        height: 56, borderRadius: 16, backgroundColor: U.buttonFill,
                        flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22,
                    }}
                >
                    <Text style={{ ...theme.v2.button, color: U.buttonInk }} numberOfLines={1}>
                        {entry ? t("plan_welcome.start") : t("plan_welcome.continue")}
                    </Text>
                    <Text style={{ color: U.buttonInk, fontSize: 18 }}>→</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
