import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { isDummyMode } from "@/config/revenuecat";
import * as iap from "@/services/iap";
import type { PlanResponse } from "@/types/api";
import { SubscriptionDisclosure } from "@/components/ui/SubscriptionDisclosure";

interface PlanHighlight {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
}

function highlightsFor(plan: PlanResponse | undefined, t: TFunction): PlanHighlight[] {
    if (!plan) return [];
    const modelDescKey =
        plan.modelTier === "FLUX"
            ? "plans.highlight_flux_desc"
            : plan.modelTier === "SDXL"
                ? "plans.highlight_sdxl_desc"
                : "plans.highlight_entry_desc";
    const rows: PlanHighlight[] = [
        {
            icon: "speedometer-outline",
            title: t("plans.highlight_credits_title", { count: plan.monthlyCredits }),
            description: t("plans.highlight_credits_desc"),
        },
        {
            icon: "sparkles-outline",
            title: t("plans.highlight_model_title", { tier: plan.modelTier ?? "ENTRY" }),
            description: t(modelDescKey),
        },
    ];
    if (!plan.watermark) {
        rows.push({
            icon: "shield-checkmark-outline",
            title: t("plans.row_no_watermark"),
            description: t("plans.highlight_no_watermark_desc"),
        });
    }
    if (plan.permissions?.allow_commercial_spaces) {
        rows.push({
            icon: "business-outline",
            title: t("plans.row_commercial"),
            description: t("plans.highlight_commercial_desc"),
        });
    }
    const feat = (code: string) => plan.features?.find((f) => f.featureCode === code)?.enabled;
    if (feat("INPAINT")) {
        rows.push({
            icon: "brush-outline",
            title: t("plans.row_inpaint"),
            description: t("plans.highlight_inpaint_desc"),
        });
    }
    if (feat("STYLE_TRANSFER")) {
        rows.push({
            icon: "color-palette-outline",
            title: t("plans.row_style_transfer"),
            description: t("plans.highlight_style_desc"),
        });
    }
    return rows;
}

function formatPrice(plan: PlanResponse): string {
    if (plan.priceCents === 0) return "$0";
    const amount = (plan.priceCents / 100).toFixed(2);
    return plan.currency === "USD" ? `$${amount}` : `${amount} ${plan.currency}`;
}

export default function PlanConfirmScreen() {
    const { t } = useTranslation();
    const params = useLocalSearchParams<{ planCode?: string }>();
    const plans = useSubscriptionStore((s) => s.plans);
    const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
    const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
    const fetchBalance = useCreditStore((s) => s.fetchBalance);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!plans) fetchPlans().catch(() => {});
    }, []);

    const plan = useMemo(
        () => plans?.find((p) => p.code === params.planCode),
        [plans, params.planCode],
    );
    const highlights = useMemo(() => highlightsFor(plan, t), [plan, t]);

    const handleConfirm = async () => {
        if (!plan) return;
        setSubmitting(true);
        try {
            // iap.purchaseSubscription handles both dummy mode and real RC
            // flow under the hood — caller doesn't need to branch on mode.
            // In dummy mode: backend's activate-dummy endpoint.
            // In RC mode: Apple StoreKit payment sheet → backend verify-receipt.
            await iap.purchaseSubscription(plan.code);

            // Refresh client state — plans list, active sub, credit balance.
            // Backend's verifyAndActivate already applied the new plan's
            // monthly credit allocation server-side; we just need to pull.
            await fetchPlans();
            await Promise.all([fetchSubscription(), fetchBalance()]);

            Alert.alert(
                t("plans.confirm_activated_title"),
                t("plans.confirm_activated_description", {
                    plan: plan.name,
                    credits: plan.monthlyCredits,
                }),
                [{ text: "OK", onPress: () => router.back() }],
            );
        } catch (e: unknown) {
            // User tapped Cancel in the Apple payment sheet — quiet dismiss,
            // no error alert needed (Apple already showed the cancel UI).
            if (iap.isUserCancelled(e)) {
                return;
            }
            const status = (e as any)?.response?.status;
            const message =
                status >= 500
                    ? t("errors.generic")
                    : t("plans.confirm_activation_failed");
            Alert.alert(t("plans.confirm_activation_failed"), message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!plan) {
        return (
            <SafeAreaView edges={["bottom"]} className="flex-1 bg-surface items-center justify-center">
                <ActivityIndicator color="#E0C29A" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["bottom"]} className="flex-1 bg-surface">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Drag handle */}
                <View className="items-center pt-4 pb-8">
                    <View
                        className="rounded-full bg-surface-container-highest"
                        style={{ width: 40, height: 4 }}
                    />
                </View>

                {/* Header */}
                <View style={{ marginBottom: 32 }}>
                    <Text
                        className="font-label text-secondary"
                        style={{
                            fontSize: 11,
                            fontWeight: "500",
                            letterSpacing: 2.2,
                            textTransform: "uppercase",
                            marginBottom: 16,
                        }}
                    >
                        {t("plans.confirm_membership_tier")}
                    </Text>

                    <View className="flex-row justify-between items-end">
                        <Text
                            className="font-headline text-on-surface"
                            style={{ fontSize: 36, lineHeight: 42 }}
                        >
                            {t("plans.confirm_upgrade_to")}{"\n"}
                            {plan.name}
                        </Text>
                        <View style={{ alignItems: "flex-end" }}>
                            <Text
                                className="font-headline text-secondary"
                                style={{ fontSize: 32, lineHeight: 38 }}
                            >
                                {formatPrice(plan)}
                            </Text>
                            <Text
                                className="font-body text-on-surface-variant"
                                style={{ fontSize: 14, marginTop: 2 }}
                            >
                                {t("plans.per_month")}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Feature highlights */}
                <View style={{ marginBottom: 32 }}>
                    {highlights.map((feature, idx) => (
                        <View
                            key={feature.title}
                            className="flex-row items-start"
                            style={{
                                paddingVertical: 24,
                                gap: 16,
                                borderBottomWidth: idx < highlights.length - 1 ? 1 : 0,
                                borderBottomColor: "rgba(77,70,60,0.15)",
                            }}
                        >
                            <Ionicons
                                name={feature.icon}
                                size={24}
                                color="#E0C29A"
                                style={{ marginTop: 2 }}
                            />
                            <View className="flex-1" style={{ gap: 4 }}>
                                <Text
                                    className="font-body text-on-surface"
                                    style={{ fontSize: 16, fontWeight: "500" }}
                                >
                                    {feature.title}
                                </Text>
                                <Text
                                    className="font-body text-on-surface-variant"
                                    style={{ fontSize: 13, lineHeight: 20 }}
                                >
                                    {feature.description}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Dummy-mode notice */}
                {isDummyMode && (
                    <View
                        className="rounded-xl flex-row items-center"
                        style={{
                            padding: 16,
                            gap: 12,
                            marginBottom: 16,
                            backgroundColor: "rgba(224,194,154,0.08)",
                            borderWidth: 1,
                            borderColor: "rgba(224,194,154,0.2)",
                        }}
                    >
                        <Ionicons name="flask-outline" size={20} color="#E0C29A" />
                        <Text
                            className="flex-1 font-body text-on-surface-variant"
                            style={{ fontSize: 12, lineHeight: 18 }}
                        >
                            {t("plans.confirm_dev_notice", { plan: plan.name })}
                        </Text>
                    </View>
                )}

                {/* Credit packs alternative */}
                <Pressable
                    onPress={() => {
                        router.back();
                        setTimeout(() => router.push("/credits/packs"), 200);
                    }}
                    className="rounded-xl bg-surface-container-high flex-row items-center"
                    style={{ padding: 16, gap: 16, marginBottom: 32 }}
                >
                    <Ionicons name="flash-outline" size={22} color="#E0C29A" />
                    <View className="flex-1">
                        <Text
                            className="font-body text-on-surface"
                            style={{ fontSize: 13, fontWeight: "600", marginBottom: 2 }}
                        >
                            {t("plans.confirm_not_ready")}
                        </Text>
                        <Text
                            className="font-body text-on-surface-variant"
                            style={{ fontSize: 12 }}
                        >
                            {t("plans.confirm_buy_packs_instead")}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#998F84" />
                </Pressable>
            </ScrollView>

            {/* Bottom CTA */}
            <View className="px-8 pb-2" style={{ paddingTop: 16 }}>
                <Pressable
                    onPress={handleConfirm}
                    disabled={submitting}
                    style={({ pressed }) => ({
                        transform: [{ scale: pressed && !submitting ? 0.98 : 1 }],
                        opacity: submitting ? 0.7 : 1,
                    })}
                >
                    <LinearGradient
                        colors={["#C4A882", "#A68A62"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 12,
                            height: 56,
                            borderRadius: 16,
                            paddingHorizontal: 24,
                            borderWidth: 1,
                            borderColor: "rgba(196,168,130,0.3)",
                        }}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#3F2D11" />
                        ) : (
                            <>
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        fontSize: 14,
                                        fontWeight: "700",
                                        letterSpacing: 1.5,
                                        textTransform: "uppercase",
                                        color: "#3F2D11",
                                    }}
                                >
                                    {t("plans.confirm")}
                                </Text>
                                <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
                            </>
                        )}
                    </LinearGradient>
                </Pressable>

                {/* Apple App Store guideline 3.1.2 — required disclosure block.
                    Sits between primary CTA and secondary Return so it's in
                    the user's eye line at decision time, not buried below.
                    Reviewer rejects builds that omit any of these elements. */}
                <SubscriptionDisclosure
                    planName={plan.name}
                    pricePerPeriod={`$${((plan.priceCents ?? 0) / 100).toFixed(2)}${t("plans.per_month")}`}
                />

                <Pressable
                    onPress={() => router.back()}
                    className="items-center"
                    style={{ paddingVertical: 16 }}
                >
                    <Text
                        className="font-body text-on-surface-variant"
                        style={{
                            fontSize: 14,
                            fontWeight: "500",
                            textDecorationLine: "underline",
                            textDecorationColor: "rgba(77,70,60,0.3)",
                        }}
                    >
                        {t("plans.confirm_cancel_return")}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
