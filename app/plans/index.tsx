import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo } from "react";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useBackHandler } from "@/utils/navigation";
import type { PlanResponse } from "@/types/api";

/* ------------------------------------------------------------------ */
/*  Feature comparison matrix — real backend features & permissions   */
/* ------------------------------------------------------------------ */

type FeatureRowType = "credits" | "tier" | "feature" | "permission" | "watermark" | "outputs";

interface FeatureRow {
    labelKey: string;
    key: string;
    type: FeatureRowType;
}

const FEATURE_ROWS: FeatureRow[] = [
    { labelKey: "plans.row_monthly_credits",  key: "monthlyCredits",          type: "credits" },
    { labelKey: "plans.row_model_quality",    key: "modelTier",               type: "tier" },
    { labelKey: "plans.row_variants",         key: "max_outputs",             type: "outputs" },
    { labelKey: "plans.row_hd",               key: "HD_REDESIGN",             type: "feature" },
    { labelKey: "plans.row_inpaint",          key: "INPAINT",                 type: "feature" },
    { labelKey: "plans.row_style_transfer",   key: "STYLE_TRANSFER",          type: "feature" },
    { labelKey: "plans.row_empty_room",       key: "EMPTY_ROOM",              type: "feature" },
    { labelKey: "plans.row_upscale",          key: "ULTRA_HD_UPSCALE",        type: "feature" },
    { labelKey: "plans.row_custom_prompt",    key: "allow_custom_prompt",     type: "permission" },
    { labelKey: "plans.row_commercial",       key: "allow_commercial_spaces", type: "permission" },
    { labelKey: "plans.row_strength",         key: "allow_strength",          type: "permission" },
    { labelKey: "plans.row_seed",             key: "allow_seed",              type: "permission" },
    { labelKey: "plans.row_negative",         key: "allow_negative_prompt",   type: "permission" },
    { labelKey: "plans.row_no_watermark",     key: "watermark",               type: "watermark" },
];

function resolveCell(plan: PlanResponse, row: FeatureRow): string {
    switch (row.type) {
        case "credits":
            return String(plan.monthlyCredits);
        case "tier":
            return plan.modelTier ?? "—";
        case "outputs": {
            // parse INTERIOR_REDESIGN.limits_json.max_outputs
            const feat = plan.features?.find((f) => f.featureCode === "INTERIOR_REDESIGN");
            if (!feat?.limitsJson) return "1";
            try {
                const limits = typeof feat.limitsJson === "string"
                    ? JSON.parse(feat.limitsJson)
                    : feat.limitsJson;
                return String(limits?.max_outputs ?? 1);
            } catch {
                return "1";
            }
        }
        case "feature": {
            const feat = plan.features?.find((f) => f.featureCode === row.key);
            return feat?.enabled ? "✓" : "—";
        }
        case "permission": {
            return plan.permissions?.[row.key] === true ? "✓" : "—";
        }
        case "watermark":
            return plan.watermark ? "—" : "✓";
    }
}

function formatPrice(plan: PlanResponse): string {
    if (plan.priceCents === 0) return "$0";
    const amount = (plan.priceCents / 100).toFixed(2);
    return plan.currency === "USD" ? `$${amount}` : `${amount} ${plan.currency}`;
}

/* ------------------------------------------------------------------ */
/*  Plan Card                                                          */
/* ------------------------------------------------------------------ */

interface PlanCardProps {
    plan: PlanResponse;
    isCurrent: boolean;
    isPopular: boolean;
    onPress: () => void;
}

function PlanCard({ plan, isCurrent, isPopular, onPress }: PlanCardProps) {
    const { t } = useTranslation();
    const subtitle = t("plans.plan_subtitle", {
        credits: plan.monthlyCredits,
        tier: plan.modelTier ?? "ENTRY",
    });
    const cta = isCurrent ? t("plans.current_plan") : t("plans.confirm");

    return (
        <View
            className="bg-surface-container-low rounded-xl"
            style={[
                { padding: 32 },
                isPopular && {
                    borderWidth: 1,
                    borderColor: "rgba(224,194,154,0.3)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 24 },
                    shadowOpacity: 0.4,
                    shadowRadius: 48,
                    elevation: 12,
                },
                isCurrent && !isPopular && {
                    borderWidth: 1,
                    borderColor: "rgba(224,194,154,0.6)",
                },
            ]}
        >
            {/* Badge — Most Popular OR Current */}
            {(isPopular || isCurrent) && (
                <View style={{ position: "absolute", top: 16, right: 16 }}>
                    <LinearGradient
                        colors={isCurrent ? ["#353534", "#2A2A2A"] : ["#C4A882", "#A68A62"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4 }}
                    >
                        <Text
                            style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: isCurrent ? "#E0C29A" : "#3F2D11",
                                textTransform: "uppercase",
                                letterSpacing: 2,
                            }}
                        >
                            {isCurrent ? t("plans.active") : t("plans.most_popular")}
                        </Text>
                    </LinearGradient>
                </View>
            )}

            {/* Tier & subtitle */}
            <View style={{ marginBottom: 24 }}>
                <Text
                    className="font-label text-secondary"
                    style={{
                        fontSize: 11,
                        letterSpacing: 2.2,
                        textTransform: "uppercase",
                        marginBottom: 4,
                    }}
                >
                    {plan.name}
                </Text>
                <Text className="font-body" style={{ fontSize: 14, color: "#E0C29A" }}>
                    {subtitle}
                </Text>
            </View>

            {/* Price */}
            <View className="flex-row items-baseline" style={{ gap: 8, marginBottom: 32 }}>
                <Text className="font-headline text-on-surface" style={{ fontSize: 36 }}>
                    {formatPrice(plan)}
                </Text>
                <Text className="text-secondary" style={{ fontSize: 12 }}>
                    {t("plans.per_month")}
                </Text>
            </View>

            {/* CTA */}
            {isCurrent ? (
                <View
                    style={{
                        height: 56,
                        borderRadius: 12,
                        backgroundColor: "#353534",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text
                        className="font-body"
                        style={{ fontSize: 15, fontWeight: "600", color: "#998F84" }}
                    >
                        {cta}
                    </Text>
                </View>
            ) : isPopular ? (
                <Pressable
                    onPress={onPress}
                    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
                >
                    <LinearGradient
                        colors={["#C4A882", "#A68A62"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            height: 56,
                            borderRadius: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingHorizontal: 24,
                        }}
                    >
                        <Text
                            className="font-body"
                            style={{ fontSize: 15, fontWeight: "600", color: "#3F2D11" }}
                        >
                            {cta}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
                    </LinearGradient>
                </Pressable>
            ) : (
                <Pressable
                    onPress={onPress}
                    style={({ pressed }) => ({
                        height: 56,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#4D463C",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: pressed ? "#2A2A2A" : "transparent",
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                    })}
                >
                    <Text
                        className="font-body text-secondary"
                        style={{ fontSize: 15, fontWeight: "600" }}
                    >
                        {cta}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  Feature Comparison Table                                           */
/* ------------------------------------------------------------------ */

function FeatureTable({ plans, currentCode }: { plans: PlanResponse[]; currentCode: string | null }) {
    const { t } = useTranslation();
    return (
        <View className="rounded-xl bg-surface-container-low overflow-hidden">
            {/* Header row */}
            <View
                className="flex-row"
                style={{ backgroundColor: "#201F1F", paddingVertical: 14, paddingHorizontal: 16 }}
            >
                <Text
                    className="flex-1 font-label"
                    style={{
                        fontSize: 11,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        color: "rgba(209,197,184,0.7)",
                    }}
                >
                    {t("plans.feature_header")}
                </Text>
                {plans.map((plan) => (
                    <Text
                        key={plan.code}
                        style={{
                            width: 56,
                            textAlign: "center",
                            fontSize: 11,
                            letterSpacing: 2,
                            textTransform: "uppercase",
                            fontFamily: "Inter",
                            color: plan.code === currentCode ? "#E0C29A" : "rgba(209,197,184,0.7)",
                            fontWeight: plan.code === currentCode ? "700" : "400",
                        }}
                    >
                        {plan.name}
                    </Text>
                ))}
            </View>

            {/* Feature rows */}
            {FEATURE_ROWS.map((row, idx) => (
                <View
                    key={row.key + idx}
                    className="flex-row items-center"
                    style={{
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderTopWidth: 1,
                        borderTopColor: "rgba(77,70,60,0.1)",
                    }}
                >
                    <Text
                        className="flex-1 font-body text-on-surface"
                        style={{ fontSize: 13, fontWeight: "500" }}
                    >
                        {t(row.labelKey)}
                    </Text>
                    {plans.map((plan) => {
                        const val = resolveCell(plan, row);
                        const isCheck = val === "✓";
                        const isDash = val === "—";
                        const highlight = plan.code === currentCode;
                        return (
                            <View key={plan.code} style={{ width: 56, alignItems: "center" }}>
                                {isCheck ? (
                                    <Ionicons
                                        name="checkmark"
                                        size={20}
                                        color={highlight ? "#E0C29A" : "#C4A882"}
                                    />
                                ) : isDash ? (
                                    <Ionicons name="remove" size={18} color="#998F84" />
                                ) : (
                                    <Text
                                        className="font-body"
                                        style={{
                                            fontSize: 12,
                                            textAlign: "center",
                                            color: highlight ? "#E0C29A" : "#998F84",
                                            fontWeight: highlight ? "600" : "400",
                                        }}
                                    >
                                        {val}
                                    </Text>
                                )}
                            </View>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export default function PlansScreen() {
    const { t } = useTranslation();
    const plans = useSubscriptionStore((s) => s.plans);
    const subscription = useSubscriptionStore((s) => s.subscription);
    const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
    const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
    const handleBack = useBackHandler("/(tabs)/profile");

    useEffect(() => {
        if (!plans) {
            fetchPlans()
                .then(() => fetchSubscription())
                .catch(() => {});
        } else if (!subscription) {
            fetchSubscription().catch(() => {});
        }
    }, []);

    const currentCode = subscription?.planCode ?? "FREE";
    const sortedPlans = useMemo(
        () => (plans ? [...plans].sort((a, b) => a.sortOrder - b.sortOrder) : []),
        [plans],
    );

    return (
        <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
            <View
                className="flex-row items-center justify-between px-6"
                style={{ height: 56 }}
            >
                <Pressable onPress={handleBack} hitSlop={8}>
                    <Ionicons name="arrow-back" size={24} color="#E0C29A" />
                </Pressable>
                <Text
                    className="font-label text-on-surface-variant"
                    style={{ fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase" }}
                >
                    {t("plans.title")}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Headline */}
                <View style={{ marginTop: 24, marginBottom: 40 }}>
                    <Text
                        className="font-headline text-on-surface"
                        style={{ fontSize: 36, lineHeight: 42, marginBottom: 12 }}
                    >
                        {t("plans.title")}
                    </Text>
                    <Text className="font-body text-secondary" style={{ fontSize: 14 }}>
                        {t("plans.subtitle")}
                    </Text>
                </View>

                {/* Plan cards */}
                {sortedPlans.length === 0 ? (
                    <ActivityIndicator color="#E0C29A" style={{ marginVertical: 48 }} />
                ) : (
                    <View style={{ gap: 16, marginBottom: 48 }}>
                        {sortedPlans.map((plan) => (
                            <PlanCard
                                key={plan.code}
                                plan={plan}
                                isCurrent={plan.code === currentCode}
                                isPopular={plan.code === "PRO" && currentCode !== "PRO"}
                                onPress={() =>
                                    router.push({
                                        pathname: "/plans/confirm",
                                        params: { planCode: plan.code },
                                    })
                                }
                            />
                        ))}
                    </View>
                )}

                {/* One-time credit pack bridge */}
                <Pressable
                    onPress={() => router.push("/credits/packs")}
                    style={{ marginBottom: 48 }}
                >
                    <View
                        className="bg-surface-container-low rounded-xl flex-row items-center"
                        style={{
                            padding: 20,
                            borderWidth: 1,
                            borderColor: "rgba(77,70,60,0.3)",
                        }}
                    >
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: "rgba(224,194,154,0.1)",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 16,
                            }}
                        >
                            <Ionicons name="flash-outline" size={20} color="#E0C29A" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text
                                className="font-body text-on-surface"
                                style={{ fontSize: 14, fontWeight: "600", marginBottom: 2 }}
                            >
                                {t("plans.credit_pack_bridge_title")}
                            </Text>
                            <Text
                                className="font-body text-on-surface-variant"
                                style={{ fontSize: 12 }}
                            >
                                {t("plans.credit_pack_bridge_subtitle")}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#998F84" />
                    </View>
                </Pressable>

                {/* Feature Comparison */}
                {sortedPlans.length > 0 && (
                    <View style={{ marginBottom: 80 }}>
                        <Text
                            className="font-label text-secondary"
                            style={{
                                fontSize: 11,
                                letterSpacing: 2.2,
                                textTransform: "uppercase",
                                textAlign: "center",
                                marginBottom: 24,
                            }}
                        >
                            {t("plans.feature_comparison")}
                        </Text>
                        <FeatureTable plans={sortedPlans} currentCode={currentCode} />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
