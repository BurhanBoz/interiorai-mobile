import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Modal,
    Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useBackHandler } from "@/utils/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { theme } from "@/config/theme";
import type { PlanResponse } from "@/types/api";

const { height: SCREEN_H } = Dimensions.get("window");

/* ------------------------------------------------------------------ */
/*  Feature rows                                                        */
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
    comboKeys?: string[];
    groupLabelKey?: string;
}

const FEATURE_ROWS: FeatureRow[] = [
    { labelKey: "plans.row_monthly_credits",   key: "monthlyCredits",           type: "credits",    groupLabelKey: "plans.group_allowance" },
    { labelKey: "plans.row_variants",          key: "max_outputs",              type: "outputs" },
    { labelKey: "plans.row_model_quality",     key: "modelTier",                type: "tier",       groupLabelKey: "plans.group_quality" },
    { labelKey: "plans.row_no_watermark",      key: "watermark",                type: "watermark" },
    { labelKey: "plans.row_queue_priority",    key: "queuePriority",            type: "queue" },
    { labelKey: "plans.row_hd",                key: "HD_REDESIGN",              type: "feature",    groupLabelKey: "plans.group_capabilities" },
    { labelKey: "plans.row_upscale",           key: "ULTRA_HD_UPSCALE",         type: "feature" },
    { labelKey: "plans.row_inpaint",           key: "INPAINT",                  type: "feature" },
    { labelKey: "plans.row_style_transfer",    key: "STYLE_TRANSFER",           type: "feature" },
    { labelKey: "plans.row_empty_room",        key: "EMPTY_ROOM",               type: "feature" },
    { labelKey: "plans.row_custom_prompt",     key: "allow_custom_prompt",      type: "permission", groupLabelKey: "plans.group_controls" },
    { labelKey: "plans.row_commercial",        key: "allow_commercial_spaces",  type: "permission" },
    { labelKey: "plans.row_quality_mode",      key: "allow_quality_mode",       type: "permission" },
    { labelKey: "plans.row_advanced_controls", key: "advanced_controls",        type: "combo",      comboKeys: ["allow_strength", "allow_seed", "allow_negative_prompt"] },
];

// Frontend truth table — which features each tier definitively introduces.
// Overrides backend "—" for features we know belong to a tier.
const TIER_HIGHLIGHTS: Record<string, string[]> = {
    BASIC: ["allow_custom_prompt", "max_outputs"],
    PRO:   ["ULTRA_HD_UPSCALE", "INPAINT", "allow_commercial_spaces", "advanced_controls"],
    MAX:   ["STYLE_TRANSFER", "allow_quality_mode"],
};

function resolveCell(plan: PlanResponse, row: FeatureRow): string {
    switch (row.type) {
        case "credits":
            if (plan.code === "FREE") return "1/day";
            if (plan.billingPeriod === "YEARLY") return String(plan.monthlyCredits * 12);
            return String(plan.monthlyCredits);
        case "tier":
            return plan.modelTier ?? "—";
        case "outputs": {
            const feat = plan.features?.find((f) => f.featureCode === "INTERIOR_REDESIGN");
            if (!feat?.limitsJson) return "1";
            try {
                const l = typeof feat.limitsJson === "string" ? JSON.parse(feat.limitsJson) : feat.limitsJson;
                return String(l?.max_outputs ?? 1);
            } catch { return "1"; }
        }
        case "queue":
            return (plan.queuePriority ?? 0) > 0 ? "✓" : "—";
        case "feature": {
            const feat = plan.features?.find((f) => f.featureCode === row.key);
            return feat?.enabled ? "✓" : "—";
        }
        case "permission":
            return plan.permissions?.[row.key] === true ? "✓" : "—";
        case "combo": {
            const allOn = (row.comboKeys ?? []).every((k) => plan.permissions?.[k] === true);
            return allOn ? "✓" : "—";
        }
        case "watermark":
            return plan.watermark ? "—" : "✓";
    }
}

// For annual plans, resolve feature data from the monthly counterpart
// (backend may not have seeded plan_features for annual SKUs).
function resolveSource(plan: PlanResponse, allPlans: PlanResponse[]): PlanResponse {
    if ((plan.features?.length ?? 0) > 0) return plan;
    if (!plan.code.endsWith("_ANNUAL")) return plan;
    const monthly = allPlans.find((p) => p.code === plan.code.replace("_ANNUAL", ""));
    return monthly ?? plan;
}

function formatPrice(plan: PlanResponse): string {
    if (plan.priceCents === 0) return "$0";
    const amount = (plan.priceCents / 100).toFixed(2);
    return plan.currency === "USD" ? `$${amount}` : `${amount} ${plan.currency}`;
}

/* ------------------------------------------------------------------ */
/*  Plan Feature Sheet                                                  */
/* ------------------------------------------------------------------ */

function PlanFeatureSheet({
    plan,
    allPlans,
    isCurrent,
    visible,
    onClose,
    onConfirm,
}: {
    plan: PlanResponse | null;
    allPlans: PlanResponse[];
    isCurrent: boolean;
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) {
    const { t } = useTranslation();

    // Derived — no hooks needed
    const src       = plan ? resolveSource(plan, allPlans) : null;
    const tierLabel = plan ? plan.code.replace("_ANNUAL", "") : "";

    const tierColor: Record<string, string> = {
        MAX: "#FDDEB4", PRO: "#E0C29A", BASIC: "#B4C8DC", FREE: "#998F84",
    };
    const accentColor = tierColor[tierLabel] ?? "#998F84";

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onClose}
            presentationStyle="overFullScreen"
        >
            {/*
              Layout: flex column.
              ┌──────────────────┐
              │  Pressable(flex:1)│  ← tap here → dismiss
              ├──────────────────┤
              │   Sheet body     │  ← natural height, at bottom
              └──────────────────┘
              The Pressable only covers the area ABOVE the sheet,
              so touches on the sheet never hit the Pressable.
              No onStartShouldSetResponder needed → ScrollView scrolls freely.
            */}
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)" }}>
                <Pressable style={{ flex: 1 }} onPress={onClose} />

                {/* Sheet — no touch interception needed, Pressable above
                    physically doesn't overlap with this area */}
                <View
                    style={{
                        backgroundColor: "#111111",
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        borderTopWidth: 1,
                        borderTopColor: "rgba(225,195,155,0.18)",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -8 },
                        shadowOpacity: 0.5,
                        shadowRadius: 24,
                        elevation: 24,
                    }}
                >
                    {/* Handle */}
                    <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(225,195,155,0.25)" }} />
                    </View>

                    {plan && src ? (
                        <>
                            {/* Header */}
                            <View style={{
                                paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16,
                                borderBottomWidth: 1, borderBottomColor: "rgba(77,70,60,0.3)",
                            }}>
                                <Text style={{
                                    fontFamily: "Inter-SemiBold", fontSize: 10,
                                    letterSpacing: 2.4, textTransform: "uppercase",
                                    color: accentColor, marginBottom: 4,
                                }}>
                                    {plan.name}
                                </Text>
                                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                                    <Text style={{
                                        fontFamily: "NotoSerif", fontSize: 32, lineHeight: 38,
                                        color: "#E5E2E1", letterSpacing: -0.5,
                                    }}>
                                        {formatPrice(plan)}
                                    </Text>
                                    <Text style={{ fontFamily: "Inter", fontSize: 12, color: "rgba(209,197,184,0.5)" }}>
                                        {plan.billingPeriod === "YEARLY" ? t("plans.per_year") : t("plans.per_month")}
                                    </Text>
                                </View>
                            </View>

                            {/* Feature rows — explicit maxHeight because parent has no defined
                                height (only maxHeight), so flex:1 would resolve to 0. */}
                            <ScrollView
                                style={{ maxHeight: SCREEN_H * 0.52 }}
                                contentContainerStyle={{ paddingVertical: 8 }}
                                showsVerticalScrollIndicator={false}
                                bounces
                            >
                                {(() => {
                                    let lastGroup: string | undefined;
                                    return FEATURE_ROWS.map((row) => {
                                        const tierHighlights = TIER_HIGHLIGHTS[tierLabel] ?? [];
                                        const isHighlight = tierHighlights.includes(row.key);
                                        const rawVal = resolveCell(src, row);
                                        // Force ✓ for known tier features even if backend is stale
                                        const val = isHighlight && rawVal === "—" ? "✓" : rawVal;
                                        const isCheck = val === "✓";
                                        const isDash  = val === "—";
                                        const isNew   = isCheck && isHighlight;

                                        const labelKey =
                                            plan.billingPeriod === "YEARLY" && row.labelKey === "plans.row_monthly_credits"
                                                ? "plans.row_yearly_credits"
                                                : row.labelKey;

                                        const showGroupHeader = row.groupLabelKey && row.groupLabelKey !== lastGroup;
                                        if (row.groupLabelKey) lastGroup = row.groupLabelKey;

                                        return (
                                            <View key={row.key}>
                                                {showGroupHeader && row.groupLabelKey ? (
                                                    <View style={{
                                                        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 6,
                                                        borderTopWidth: lastGroup !== row.groupLabelKey ? 0 : 1,
                                                        borderTopColor: "rgba(77,70,60,0.2)",
                                                    }}>
                                                        <Text style={{
                                                            fontFamily: "Inter-SemiBold", fontSize: 10,
                                                            letterSpacing: 1.8, textTransform: "uppercase",
                                                            color: "rgba(225,195,155,0.5)",
                                                        }}>
                                                            {t(row.groupLabelKey)}
                                                        </Text>
                                                    </View>
                                                ) : null}

                                                <View style={{
                                                    flexDirection: "row", alignItems: "center",
                                                    paddingHorizontal: isNew ? 18 : 20,
                                                    paddingVertical: 13,
                                                    marginHorizontal: 4,
                                                    borderTopWidth: 1,
                                                    borderTopColor: "rgba(77,70,60,0.12)",
                                                    borderLeftWidth: isNew ? 2 : 0,
                                                    borderLeftColor: isNew ? accentColor : "transparent",
                                                    borderRadius: isNew ? 4 : 0,
                                                    backgroundColor: isNew ? "rgba(225,195,155,0.06)" : "transparent",
                                                }}>
                                                    {isCheck ? (
                                                        <Ionicons
                                                            name="checkmark-circle"
                                                            size={18}
                                                            color={isNew ? "#A0E8B8" : "#6ECF94"}
                                                            style={{ marginRight: 12, flexShrink: 0 }}
                                                        />
                                                    ) : isDash ? (
                                                        <Ionicons
                                                            name="remove-circle-outline"
                                                            size={18}
                                                            color="rgba(120,112,103,0.4)"
                                                            style={{ marginRight: 12, flexShrink: 0 }}
                                                        />
                                                    ) : (
                                                        <View style={{ width: 18, marginRight: 12 }} />
                                                    )}

                                                    <Text style={{
                                                        flex: 1, fontFamily: isNew ? "Inter-SemiBold" : "Inter",
                                                        fontSize: 13, lineHeight: 18,
                                                        color: isDash
                                                            ? "rgba(209,197,184,0.32)"
                                                            : isNew ? "#EDE8E2" : "#C8C0B8",
                                                    }}>
                                                        {t(labelKey)}
                                                    </Text>

                                                    {/* Right side: tier badge (new feature) or value (credits/model) */}
                                                    {isNew ? (
                                                        <View style={{
                                                            paddingHorizontal: 8, paddingVertical: 3,
                                                            borderRadius: 6,
                                                            backgroundColor: "rgba(225,195,155,0.1)",
                                                            borderWidth: 1, borderColor: "rgba(225,195,155,0.3)",
                                                            marginLeft: 10, flexShrink: 0,
                                                        }}>
                                                            <Text style={{
                                                                fontFamily: "Inter-SemiBold", fontSize: 10,
                                                                letterSpacing: 1.2, textTransform: "uppercase",
                                                                color: accentColor,
                                                            }}>
                                                                {tierLabel}
                                                            </Text>
                                                        </View>
                                                    ) : (!isCheck && !isDash) ? (
                                                        <Text style={{
                                                            fontFamily: "Inter-SemiBold",
                                                            fontSize: 13, color: "#E0C29A", marginLeft: 8,
                                                        }}>
                                                            {val}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </View>
                                        );
                                    });
                                })()}
                            </ScrollView>

                            {/* CTA */}
                            <View style={{
                                paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36,
                                borderTopWidth: 1, borderTopColor: "rgba(77,70,60,0.2)",
                            }}>
                                {isCurrent ? (
                                    <View style={{
                                        height: 56, borderRadius: 16, backgroundColor: "#2A2A2A",
                                        alignItems: "center", justifyContent: "center",
                                        borderWidth: 1, borderColor: "rgba(77,70,60,0.4)",
                                    }}>
                                        <Text style={{
                                            fontFamily: "Inter-SemiBold", fontSize: 14,
                                            color: "#998F84", letterSpacing: 0.3,
                                        }}>
                                            {t("plans.current_plan")}
                                        </Text>
                                    </View>
                                ) : (
                                    <Pressable
                                        onPress={onConfirm}
                                        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
                                    >
                                        <LinearGradient
                                            colors={["#C4A882", "#A68A62"]}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                            style={{
                                                height: 56, borderRadius: 16,
                                                flexDirection: "row", alignItems: "center",
                                                justifyContent: "space-between", paddingHorizontal: 24,
                                            }}
                                        >
                                            <Text style={{
                                                fontFamily: "Inter-SemiBold", fontSize: 14,
                                                color: "#3F2D11", letterSpacing: 0.3,
                                            }}>
                                                {t("plans.confirm")}
                                            </Text>
                                            <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
                                        </LinearGradient>
                                    </Pressable>
                                )}
                            </View>
                        </>
                    ) : (
                        <View style={{ height: 200, alignItems: "center", justifyContent: "center" }}>
                            <ActivityIndicator color="#E0C29A" />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */
/*  Plan Card                                                           */
/* ------------------------------------------------------------------ */

function PlanCard({
    plan,
    isCurrent,
    isPopular,
    onPress,
    onExpand,
}: {
    plan: PlanResponse;
    isCurrent: boolean;
    isPopular: boolean;
    onPress: () => void;
    onExpand: () => void;
}) {
    const { t } = useTranslation();
    const isMaxTier = plan.code.replace("_ANNUAL", "") === "MAX";

    const tier = plan.modelTier ?? "ENTRY";
    const subtitle =
        plan.code === "FREE"
            ? t("plans.plan_subtitle_daily", { tier })
            : plan.billingPeriod === "YEARLY"
            ? t("plans.plan_subtitle_yearly", { credits: plan.monthlyCredits * 12, tier })
            : t("plans.plan_subtitle", { credits: plan.monthlyCredits, tier });

    const cta = isCurrent ? t("plans.current_plan") : t("plans.confirm");
    const isSelectable = !isCurrent && !isPopular;
    const CardWrapper: any = isSelectable ? Pressable : View;
    const baseStyle = {
        paddingVertical: 20,
        paddingHorizontal: 24,
        borderRadius: 18,
        backgroundColor: theme.color.surfaceContainerLow,
        borderWidth: 1,
    };
    const wrapperProps = isSelectable
        ? {
            onPress,
            style: ({ pressed }: { pressed: boolean }) => [
                { ...baseStyle, borderColor: pressed ? "rgba(225,195,155,0.6)" : "rgba(225,195,155,0.28)", transform: [{ scale: pressed ? 0.99 : 1 }] },
                isMaxTier && theme.elevation.goldGlowSoft,
            ],
        }
        : {
            style: [
                { ...baseStyle, borderColor: "rgba(77,70,60,0.22)" },
                isPopular && { borderColor: "rgba(225,195,155,0.45)", ...theme.elevation.md },
                isCurrent && !isPopular && { borderColor: "rgba(225,195,155,0.55)", backgroundColor: "rgba(225,195,155,0.04)" },
            ],
        };

    return (
        <CardWrapper {...wrapperProps}>
            {isMaxTier ? (
                <LinearGradient
                    colors={["rgba(253,222,181,0.10)", "rgba(225,195,155,0.02)", "rgba(253,222,181,0.08)"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    pointerEvents="none"
                    style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18 }}
                />
            ) : null}

            {(isPopular || isCurrent) ? (
                <View style={{ position: "absolute", top: -9, right: 18 }}>
                    <LinearGradient
                        colors={isCurrent ? [theme.color.goldDawn, theme.color.goldMidday] : [theme.color.goldMidday, theme.color.goldDusk]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 0.5, borderColor: "rgba(63,45,17,0.2)" }}
                    >
                        <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 9.5, color: theme.color.onGold, textTransform: "uppercase", letterSpacing: 1.6 }}>
                            {isCurrent ? t("plans.your_plan", { defaultValue: "Your Plan" }) : t("plans.most_popular")}
                        </Text>
                    </LinearGradient>
                </View>
            ) : null}

            {/* Header row — tier label left, ⓘ button right, both in flow.
                No absolute positioning: every card has identical structure
                so labels land at the same Y position regardless of border. */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <Text className="font-label text-secondary" style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>
                    {plan.name}
                </Text>
                <Pressable
                    onPress={onExpand}
                    hitSlop={12}
                    style={{
                        width: 28, height: 28, borderRadius: 14,
                        borderWidth: 1, borderColor: "rgba(225,195,155,0.3)",
                        backgroundColor: "rgba(225,195,155,0.07)",
                        alignItems: "center", justifyContent: "center",
                    }}
                >
                    <Ionicons name="information-circle-outline" size={15} color="rgba(225,195,155,0.7)" />
                </Pressable>
            </View>

            <Text className="font-body" style={{ fontSize: 13, lineHeight: 18, color: "#E0C29A", marginBottom: 16 }}>
                {subtitle}
            </Text>

            <View className="flex-row items-baseline" style={{ gap: 6, marginBottom: 20 }}>
                <Text className="font-headline text-on-surface" style={{ fontSize: 28, lineHeight: 32, letterSpacing: -0.4 }}>
                    {formatPrice(plan)}
                </Text>
                <Text className="text-secondary" style={{ fontSize: 11.5 }}>
                    {plan.billingPeriod === "YEARLY" ? t("plans.per_year") : t("plans.per_month")}
                </Text>
            </View>

            {isCurrent ? (
                <View style={{ height: 50, borderRadius: 12, backgroundColor: "#353534", alignItems: "center", justifyContent: "center" }}>
                    <Text className="font-body" style={{ fontSize: 14, fontWeight: "600", color: "#998F84", letterSpacing: 0.3 }}>{cta}</Text>
                </View>
            ) : isPopular ? (
                <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                    <LinearGradient
                        colors={["#C4A882", "#A68A62"]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ height: 50, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}
                    >
                        <Text className="font-body" style={{ fontSize: 14, fontWeight: "600", color: "#3F2D11", letterSpacing: 0.2 }}>{cta}</Text>
                        <Ionicons name="arrow-forward" size={18} color="#3F2D11" />
                    </LinearGradient>
                </Pressable>
            ) : (
                <View style={{ height: 50, borderRadius: 12, borderWidth: 1, borderColor: "rgba(225,195,155,0.4)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(225,195,155,0.06)", flexDirection: "row", gap: 8 }}>
                    <Text className="font-body" style={{ fontSize: 14, fontWeight: "600", color: "#E0C29A", letterSpacing: 0.3 }}>{cta}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#E0C29A" />
                </View>
            )}
        </CardWrapper>
    );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                              */
/* ------------------------------------------------------------------ */

export default function PlansScreen() {
    const { t } = useTranslation();
    const plans = useSubscriptionStore((s) => s.plans);
    const subscription = useSubscriptionStore((s) => s.subscription);
    const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
    const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
    const handleBack = useBackHandler("/(tabs)/profile");
    const [sheetPlan, setSheetPlan] = useState<PlanResponse | null>(null);
    const isUserOnAnnual = (subscription?.planCode ?? "").endsWith("_ANNUAL");
    const [billingMode, setBillingMode] = useState<"MONTHLY" | "ANNUAL">(
        isUserOnAnnual ? "ANNUAL" : "MONTHLY",
    );

    useEffect(() => {
        if (!plans) {
            fetchPlans().then(() => fetchSubscription()).catch(() => {});
        } else if (!subscription) {
            fetchSubscription().catch(() => {});
        }
    }, []);

    const currentCode = subscription?.planCode ?? "FREE";

    const sortedPlans = useMemo(() => {
        if (!plans) return [];
        return [...plans]
            .filter((p) => {
                if (p.code === "FREE") return billingMode === "MONTHLY";
                const isAnnual = p.code.endsWith("_ANNUAL");
                return billingMode === "ANNUAL" ? isAnnual : !isAnnual;
            })
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }, [plans, billingMode]);

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: theme.color.surface }}>
            <TopBar title={t("plans.title")} showBack onBack={handleBack} />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Headline */}
                <View style={{ marginTop: 24, marginBottom: 24 }}>
                    <Text className="font-headline text-on-surface" style={{ fontSize: 36, lineHeight: 42, marginBottom: 12 }}>
                        {t("plans.title")}
                    </Text>
                    <Text className="font-body text-secondary" style={{ fontSize: 14 }}>
                        {t("plans.subtitle")}
                    </Text>
                </View>

                {/* Monthly / Annual toggle */}
                <View style={{ marginBottom: 28 }}>
                    <View style={{
                        flexDirection: "row", padding: 5, borderRadius: 16,
                        backgroundColor: "rgba(20,19,19,0.85)",
                        borderWidth: 1, borderColor: "rgba(77,70,60,0.28)",
                        ...theme.elevation.sm,
                    }}>
                        {(["MONTHLY", "ANNUAL"] as const).map((mode) => {
                            const active = billingMode === mode;
                            const isAnnual = mode === "ANNUAL";
                            const PillWrapper: any = active ? LinearGradient : View;
                            const pillProps = active
                                ? {
                                    colors: ["rgba(253,222,181,0.18)", "rgba(225,195,155,0.10)"],
                                    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
                                    style: { flex: 1, paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(225,195,155,0.55)", flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8 },
                                }
                                : {
                                    style: { flex: 1, paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8 },
                                };
                            return (
                                <Pressable
                                    key={mode}
                                    onPress={() => setBillingMode(mode)}
                                    style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.985 : 1 }] })}
                                >
                                    <PillWrapper {...pillProps}>
                                        <Text className="font-body" style={{ fontSize: 12.5, fontWeight: active ? "700" : "500", letterSpacing: 1.6, color: active ? "#F4DDB6" : "#998F84" }}>
                                            {isAnnual ? t("plans.toggle_annual_label") : t("plans.toggle_monthly")}
                                        </Text>
                                        {isAnnual ? (
                                            <View style={{
                                                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                                                backgroundColor: active ? "rgba(63,45,17,0.85)" : "rgba(225,195,155,0.14)",
                                                borderWidth: 0.5,
                                                borderColor: active ? "rgba(244,221,182,0.3)" : "rgba(225,195,155,0.35)",
                                            }}>
                                                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 9.5, letterSpacing: 1.1, color: active ? "#F4DDB6" : "#E0C29A" }}>
                                                    {t("plans.toggle_save_badge")}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </PillWrapper>
                                </Pressable>
                            );
                        })}
                    </View>
                    {billingMode === "ANNUAL" ? (
                        <Text style={{ marginTop: 10, fontSize: 11.5, letterSpacing: 0.3, textAlign: "center", color: "rgba(225,195,155,0.7)", fontFamily: "Inter" }}>
                            {t("plans.toggle_annual_hint")}
                        </Text>
                    ) : null}
                </View>

                {/* Plan cards */}
                {sortedPlans.length === 0 ? (
                    <ActivityIndicator color="#E0C29A" style={{ marginVertical: 48 }} />
                ) : (
                    <View style={{ gap: 0, marginBottom: 36 }}>
                        {sortedPlans.map((plan) => (
                            <View key={plan.code} style={{ marginTop: 16 }}>
                            <PlanCard
                                plan={plan}
                                isCurrent={plan.code === currentCode}
                                isPopular={plan.code === "PRO" && currentCode !== "PRO"}
                                onPress={() => router.push({ pathname: "/plans/confirm", params: { planCode: plan.code } })}
                                onExpand={() => setSheetPlan(plan)}
                            />
                            </View>
                        ))}
                    </View>
                )}

                {/* Credit pack bridge */}
                <Pressable onPress={() => router.push("/credits/packs")} style={{ marginBottom: 48 }}>
                    <View className="bg-surface-container-low rounded-xl flex-row items-center" style={{ padding: 20, borderWidth: 1, borderColor: "rgba(77,70,60,0.3)" }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(224,194,154,0.1)", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
                            <Ionicons name="flash-outline" size={20} color="#E0C29A" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text className="font-body text-on-surface" style={{ fontSize: 14, fontWeight: "600", marginBottom: 2 }}>
                                {t("plans.credit_pack_bridge_title")}
                            </Text>
                            <Text className="font-body text-on-surface-variant" style={{ fontSize: 12 }}>
                                {t("plans.credit_pack_bridge_subtitle")}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#998F84" />
                    </View>
                </Pressable>
            </ScrollView>

            {/* Per-plan feature sheet */}
            <PlanFeatureSheet
                plan={sheetPlan}
                allPlans={plans ?? []}
                isCurrent={sheetPlan?.code === currentCode}
                visible={sheetPlan !== null}
                onClose={() => setSheetPlan(null)}
                onConfirm={() => {
                    const target = sheetPlan;
                    setSheetPlan(null);
                    if (target) {
                        setTimeout(() => {
                            router.push({ pathname: "/plans/confirm", params: { planCode: target.code } });
                        }, 300);
                    }
                }}
            />
        </SafeAreaView>
    );
}
