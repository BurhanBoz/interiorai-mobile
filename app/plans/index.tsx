import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo } from "react";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useBackHandler } from "@/utils/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { theme } from "@/config/theme";
import type { PlanResponse } from "@/types/api";

/* ------------------------------------------------------------------ */
/*  Feature comparison matrix — real backend features & permissions   */
/* ------------------------------------------------------------------ */

type FeatureRowType =
    | "credits"
    | "tier"
    | "feature"
    | "permission"
    | "watermark"
    | "outputs"
    | "queue"
    | "combo";

interface FeatureRow {
    labelKey: string;
    key: string;
    type: FeatureRowType;
    /** Permission keys checked for `combo` rows — row shows ✓ if ALL are true. */
    comboKeys?: string[];
    /** True on the first row of a visual group so we render a subtle divider. */
    groupStart?: boolean;
    /** Optional translation key for the group eyebrow shown above this row. */
    groupLabelKey?: string;
}

// Rows ordered by *buyer intent*: core value (credits, variants) first, then
// the visible output quality (model, watermark, priority), then capabilities,
// then expert controls. The old order put permissions mixed with features
// which made skimming the matrix for "what do I get more of?" hard.
const FEATURE_ROWS: FeatureRow[] = [
    // ── Group 1: Core allowance ──
    { labelKey: "plans.row_monthly_credits",  key: "monthlyCredits",          type: "credits",
      groupStart: true, groupLabelKey: "plans.group_allowance" },
    { labelKey: "plans.row_variants",         key: "max_outputs",             type: "outputs" },

    // ── Group 2: Output quality ──
    { labelKey: "plans.row_model_quality",    key: "modelTier",               type: "tier",
      groupStart: true, groupLabelKey: "plans.group_quality" },
    { labelKey: "plans.row_no_watermark",     key: "watermark",               type: "watermark" },
    { labelKey: "plans.row_queue_priority",   key: "queuePriority",           type: "queue" },

    // ── Group 3: Capabilities ──
    { labelKey: "plans.row_hd",               key: "HD_REDESIGN",             type: "feature",
      groupStart: true, groupLabelKey: "plans.group_capabilities" },
    { labelKey: "plans.row_upscale",          key: "ULTRA_HD_UPSCALE",        type: "feature" },
    { labelKey: "plans.row_inpaint",          key: "INPAINT",                 type: "feature" },
    { labelKey: "plans.row_style_transfer",   key: "STYLE_TRANSFER",          type: "feature" },
    { labelKey: "plans.row_empty_room",       key: "EMPTY_ROOM",              type: "feature" },

    // ── Group 4: Controls & licensing ──
    { labelKey: "plans.row_custom_prompt",    key: "allow_custom_prompt",     type: "permission",
      groupStart: true, groupLabelKey: "plans.group_controls" },
    { labelKey: "plans.row_commercial",       key: "allow_commercial_spaces", type: "permission" },
    // Merged: strength + seed + negative prompt all unlock as one "expert
    // controls" bundle on PRO+. Three separate rows were noise — nobody
    // upgrades for "seed control" alone.
    { labelKey: "plans.row_advanced_controls", key: "advanced_controls",     type: "combo",
      comboKeys: ["allow_strength", "allow_seed", "allow_negative_prompt"] },
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
        case "queue":
            // Binary ✓/—: anything above FREE's 0 gets priority queueing.
            // Longer copy ("Priority"/"Instant") overflows the 56px cell on
            // small phones. The tier-specific nuance is already in the plan
            // cards above the table.
            return (plan.queuePriority ?? 0) > 0 ? "✓" : "—";
        case "feature": {
            const feat = plan.features?.find((f) => f.featureCode === row.key);
            return feat?.enabled ? "✓" : "—";
        }
        case "permission": {
            return plan.permissions?.[row.key] === true ? "✓" : "—";
        }
        case "combo": {
            const keys = row.comboKeys ?? [];
            const allOn = keys.every((k) => plan.permissions?.[k] === true);
            return allOn ? "✓" : "—";
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
    const isMaxTier = plan.code === "MAX";

    return (
        <View
            style={[
                {
                    padding: 28,
                    borderRadius: 20,
                    backgroundColor: theme.color.surfaceContainerLow,
                    borderWidth: 1,
                    borderColor: "rgba(77,70,60,0.22)",
                },
                isPopular && {
                    borderColor: "rgba(225,195,155,0.45)",
                    ...theme.elevation.md,
                },
                isCurrent && !isPopular && {
                    borderColor: "rgba(225,195,155,0.55)",
                    backgroundColor: "rgba(225,195,155,0.04)",
                },
                isMaxTier && !isCurrent && theme.elevation.goldGlowSoft,
            ]}
        >
            {/* MAX shimmer wash — signals "top tier" without a loud badge. */}
            {isMaxTier ? (
                <LinearGradient
                    colors={[
                        "rgba(253,222,181,0.10)",
                        "rgba(225,195,155,0.02)",
                        "rgba(253,222,181,0.08)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 20,
                    }}
                />
            ) : null}

            {(isPopular || isCurrent) ? (
                <View style={{ position: "absolute", top: -10, right: 20 }}>
                    <LinearGradient
                        colors={
                            isCurrent
                                ? [theme.color.goldDawn, theme.color.goldMidday]
                                : [theme.color.goldMidday, theme.color.goldDusk]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            borderRadius: 999,
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            borderWidth: 0.5,
                            borderColor: "rgba(63,45,17,0.2)",
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: "Inter-SemiBold",
                                fontSize: 10,
                                color: theme.color.onGold,
                                textTransform: "uppercase",
                                letterSpacing: 1.8,
                            }}
                        >
                            {isCurrent
                                ? t("plans.your_plan", { defaultValue: "Your Plan" })
                                : t("plans.most_popular")}
                        </Text>
                    </LinearGradient>
                </View>
            ) : null}

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

            {/* Feature rows — grouped with subtle eyebrow labels so the
                matrix reads as four coherent sections (allowance / quality /
                capabilities / controls) instead of a 13-row wall. */}
            {FEATURE_ROWS.map((row, idx) => {
                const showGroup = row.groupStart && row.groupLabelKey && idx > 0;
                return (
                    <View key={row.key + idx}>
                        {showGroup ? (
                            <View
                                style={{
                                    paddingTop: 14,
                                    paddingBottom: 6,
                                    paddingHorizontal: 16,
                                    backgroundColor: "rgba(32,31,31,0.55)",
                                    borderTopWidth: 1,
                                    borderTopColor: "rgba(77,70,60,0.18)",
                                }}
                            >
                                <Text
                                    style={{
                                        fontFamily: "Inter-SemiBold",
                                        fontSize: 10,
                                        letterSpacing: 1.8,
                                        textTransform: "uppercase",
                                        color: "rgba(225,195,155,0.55)",
                                    }}
                                >
                                    {t(row.groupLabelKey!)}
                                </Text>
                            </View>
                        ) : null}
                        <View
                            className="flex-row items-center"
                            style={{
                                paddingVertical: 14,
                                paddingHorizontal: 16,
                                borderTopWidth: showGroup ? 0 : 1,
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
                    </View>
                );
            })}
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
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: theme.color.surface }}>
            <TopBar title={t("plans.title")} showBack onBack={handleBack} />

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
