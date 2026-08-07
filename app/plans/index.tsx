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
import { useStorePricesStore } from "@/stores/storePricesStore";
import { useBackHandler } from "@/utils/navigation";
import { planTier } from "@/utils/planTier";
import { formatProductPrice, type StorePriceMap } from "@/utils/price";
import { openManageSubscriptions } from "@/services/iap";
import { TopBar } from "@/components/layout/TopBar";
import { theme } from "@/config/theme";
import type { PlanResponse } from "@/types/api";

const { height: SCREEN_H } = Dimensions.get("window");

/* ------------------------------------------------------------------ */
/*  Feature rows                                                        */
/* ------------------------------------------------------------------ */

type FeatureRowType =
    | "credits"
    | "feature"
    | "permission"
    | "watermark"
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
    { labelKey: "plans.row_no_watermark",      key: "watermark",                type: "watermark",  groupLabelKey: "plans.group_quality" },
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
    BASE: ["HD_REDESIGN", "allow_custom_prompt", "allow_commercial_spaces"],
    PRO:  ["INPAINT", "STYLE_TRANSFER", "ULTRA_HD_UPSCALE", "advanced_controls"],
};

function resolveCell(plan: PlanResponse, row: FeatureRow): string {
    switch (row.type) {
        case "credits":
            // V41: FREE has no recurring credits — a one-time 15-credit
            // welcome grant lives in the subtitle copy, not this row.
            if (plan.code === "FREE") return "—";
            if (plan.billingPeriod === "YEARLY") return String(plan.monthlyCredits * 12);
            return String(plan.monthlyCredits);
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

/**
 * StoreKit-first price label: the storefront-localized string when store
 * prices are loaded (₺/€/¥ — what Apple's payment sheet will show), backend
 * USD until then. FREE has no store product → localized "Free" word instead
 * of a currency-claiming "$0".
 */
function priceLabel(
    plan: PlanResponse,
    storePrices: StorePriceMap,
    t: (key: string) => string,
): string {
    if (plan.priceCents === 0) return t("plans.free");
    return formatProductPrice(storePrices, plan.appleProductId, plan.priceCents, plan.currency);
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
    const storePrices = useStorePricesStore((s) => s.prices);

    // Derived — no hooks needed
    const src       = plan ? resolveSource(plan, allPlans) : null;
    const tierLabel = plan ? plan.code.replace("_ANNUAL", "") : "";

    const tierColor: Record<string, string> = {
        PRO: "#FDDEB4", BASE: "#E0C29A", FREE: "#998F84",
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
                                paddingHorizontal: theme.space.gutter, paddingTop: 10, paddingBottom: 16,
                                borderBottomWidth: 1, borderBottomColor: "rgba(77,70,60,0.3)",
                            }}>
                                <Text style={{
                                    ...theme.text.label,
                                    color: accentColor,
 marginBottom: 4,
                                  }}>
                                    {plan.name}
                                </Text>
                                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                                    <Text style={{
                                        ...theme.text.display,
                                        color: "#E5E2E1",
                                      }}>
                                        {priceLabel(plan, storePrices, t)}
                                    </Text>
                                    {plan.priceCents > 0 && (
                                        <Text style={{ ...theme.text.caption, color: "rgba(209,197,184,0.5)" }}>
                                            {plan.billingPeriod === "YEARLY" ? t("plans.per_year") : t("plans.per_month")}
                                        </Text>
                                    )}
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
                                                        paddingHorizontal: theme.space.gutter, paddingTop: 16, paddingBottom: 6,
                                                        borderTopWidth: lastGroup !== row.groupLabelKey ? 0 : 1,
                                                        borderTopColor: "rgba(77,70,60,0.2)",
                                                    }}>
                                                        <Text style={{
                                                            ...theme.text.caption,
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
                                                        ...theme.text.body,
                                                        flex: 1,
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
                                                                ...theme.text.label,
                                                                color: accentColor,
                                                              }}>
                                                                {tierLabel}
                                                            </Text>
                                                        </View>
                                                    ) : (!isCheck && !isDash) ? (
                                                        <Text style={{
                                                            ...theme.text.subtitle,
 color: "#E0C29A",
 marginLeft: 8,
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
                                paddingHorizontal: theme.space.gutter, paddingTop: 14, paddingBottom: 36,
                                borderTopWidth: 1, borderTopColor: "rgba(77,70,60,0.2)",
                            }}>
                                {isCurrent ? (
                                    <View style={{
                                        height: 56, borderRadius: theme.radius.md, backgroundColor: "#2A2A2A",
                                        alignItems: "center", justifyContent: "center",
                                        borderWidth: 1, borderColor: "rgba(77,70,60,0.4)",
                                    }}>
                                        <Text style={{
                                            ...theme.text.subtitle,
                                            color: "#998F84",
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
                                                height: 56, borderRadius: theme.radius.md,
                                                flexDirection: "row", alignItems: "center",
                                                justifyContent: "space-between", paddingHorizontal: theme.space.gutter,
                                            }}
                                        >
                                            <Text style={{
                                                ...theme.text.subtitle,
                                                color: "#3F2D11",
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
    const storePrices = useStorePricesStore((s) => s.prices);

    const tier = plan.modelTier ?? "ENTRY";
    // Annual plans grant the SAME monthly allocation every month for the
    // year (Pricing V2 — 150/mo, not a 1,800 lump). Show "150 credits/month
    // · billed yearly" rather than a misleading "1,800 credits/year".
    const subtitle =
        plan.code === "FREE"
            ? t("plans.plan_subtitle_daily")
            : plan.billingPeriod === "YEARLY"
            ? t("plans.plan_subtitle_yearly", { credits: plan.monthlyCredits })
            : t("plans.plan_subtitle", { credits: plan.monthlyCredits });

    const cta = isCurrent ? t("plans.current_plan") : t("plans.confirm");
    const isTopTier = planTier(plan.code) === "PRO";

    // ONE wrapper for every card: a single Pressable with a PLAIN OBJECT
    // style. The previous View-vs-Pressable + function-returning-array
    // split was exactly why only the PRO card (View + plain object)
    // rendered the gold border while the others (Pressable + fn→array)
    // did not. A plain object style on the same wrapper type for all cards
    // matches that working path everywhere. The active plan is conveyed by
    // the disabled "Current Plan" button — not by the frame.
    const baseStyle = {
        paddingVertical: 22,
        paddingHorizontal: theme.space.gutter,
        // Softer premium frame (2026-07-11 polish): larger radius + a
        // hairline border reads calmer than the previous 1.5px/18.
        borderRadius: theme.radius.lg,
        backgroundColor: theme.color.surfaceContainerLow,
        borderWidth: 1,
        borderColor: theme.color.goldDusk,
    };

    // Corner badge ONLY for PRO (Most Popular) and MAX (Best Value).
    // BASIC / FREE get no badge at all (no empty pill).
    const badge =
        planTier(plan.code) === "BASE"
            ? t("plans.most_popular")
            : planTier(plan.code) === "PRO"
                ? t("plans.best_value", { defaultValue: "Best Value" })
                : null;

    return (
        <Pressable
            onPress={isCurrent ? undefined : onPress}
            disabled={isCurrent}
            style={baseStyle}
        >
            {isTopTier ? (
                <LinearGradient
                    colors={["rgba(253,222,181,0.10)", "rgba(225,195,155,0.02)", "rgba(253,222,181,0.08)"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    pointerEvents="none"
                    style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: theme.radius.lg }}
                />
            ) : null}

            {badge ? (
                <View style={{ position: "absolute", top: -9, left: 18 }}>
                    <LinearGradient
                        colors={[theme.color.goldMidday, theme.color.goldDusk]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 0.5, borderColor: "rgba(63,45,17,0.2)" }}
                    >
                        <Text style={{ ...theme.text.label, color: theme.color.onGold }}>
                            {badge}
                        </Text>
                    </LinearGradient>
                </View>
            ) : null}

            {/* Header row — tier label left, ⓘ button right, both in flow.
                No absolute positioning: every card has identical structure
                so labels land at the same Y position regardless of border. */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text className="font-label text-secondary" style={{ ...theme.text.label }}>
                    {plan.name}
                </Text>
                <Pressable
                    onPress={onExpand}
                    hitSlop={12}
                    style={{
                        width: 28, height: 28, borderRadius: theme.radius.md,
                        borderWidth: 1, borderColor: "rgba(225,195,155,0.3)",
                        backgroundColor: "rgba(225,195,155,0.07)",
                        alignItems: "center", justifyContent: "center",
                    }}
                >
                    <Ionicons name="information-circle-outline" size={15} color="rgba(225,195,155,0.7)" />
                </Pressable>
            </View>

            <Text className="font-body" style={{ ...theme.text.caption, color: "#E0C29A", marginBottom: 18 }}>
                {subtitle}
            </Text>

            <View className="flex-row items-baseline" style={{ gap: 6, marginBottom: 22 }}>
                <Text className="font-headline text-on-surface" style={{ ...theme.text.headline }}>
                    {priceLabel(plan, storePrices, t)}
                </Text>
                {plan.priceCents > 0 && (
                    <Text className="text-secondary" style={{ ...theme.text.caption }}>
                        {plan.billingPeriod === "YEARLY" ? t("plans.per_year") : t("plans.per_month")}
                    </Text>
                )}
            </View>

            {isCurrent ? (
                <View style={{ height: 48, borderRadius: theme.radius.md, backgroundColor: "#353534", alignItems: "center", justifyContent: "center" }}>
                    <Text className="font-body" style={{ ...theme.text.body, color: "#998F84" }}>{cta}</Text>
                </View>
            ) : isPopular ? (
                // Visual only — the whole card Pressable handles navigation.
                <LinearGradient
                    colors={["#C4A882", "#A68A62"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ height: 48, borderRadius: theme.radius.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.space.gutter }}
                >
                    <Text className="font-body" style={{ ...theme.text.body, color: "#3F2D11" }}>{cta}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#3F2D11" />
                </LinearGradient>
            ) : (
                <View style={{ height: 48, borderRadius: theme.radius.md, borderWidth: 1, borderColor: "rgba(225,195,155,0.4)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(225,195,155,0.06)", flexDirection: "row", gap: 8 }}>
                    <Text className="font-body" style={{ ...theme.text.body, color: "#E0C29A" }}>{cta}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#E0C29A" />
                </View>
            )}
        </Pressable>
    );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                              */
/* ------------------------------------------------------------------ */

/** Half the toggle track, minus the gap. Static so nothing can drop it. */
const PILL_SLOT = { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 } as const;

export default function PlansScreen() {
    const { t, i18n } = useTranslation();
    const plans = useSubscriptionStore((s) => s.plans);
    const subscription = useSubscriptionStore((s) => s.subscription);
    const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
    const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
    const hydrateStorePrices = useStorePricesStore((s) => s.hydrate);

    // Localized store prices — normally already hydrated at boot; this is
    // the retry path (offline boot, RC hiccup). Idempotent.
    useEffect(() => {
        hydrateStorePrices();
    }, [hydrateStorePrices]);
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

    // Pricing V3 launches monthly-only; the Monthly/Annual toggle renders
    // only when the backend actually ships an annual SKU again. Zero-code
    // reactivation: seed *_ANNUAL plans in a migration and the toggle is back.
    const hasAnnualPlans = useMemo(
        () => (plans ?? []).some((p) => p.code.endsWith("_ANNUAL")),
        [plans],
    );

    const sortedPlans = useMemo(() => {
        if (!plans) return [];
        const mode = hasAnnualPlans ? billingMode : "MONTHLY";
        return [...plans]
            .filter((p) => {
                // FREE is auto-assigned at signup and never purchasable —
                // showing it on the paywall only dilutes the Base/Pro choice.
                // The user's balance/trial state lives on Profile & Settings.
                if (p.code === "FREE") return false;
                const isAnnual = p.code.endsWith("_ANNUAL");
                return mode === "ANNUAL" ? isAnnual : !isAnnual;
            })
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }, [plans, billingMode, hasAnnualPlans]);

    return (
        <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: theme.color.surface }}>
            <TopBar title={t("plans.title")} showBack onBack={handleBack} />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: theme.space.gutter, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Headline */}
                <View style={{ marginTop: 24, marginBottom: 24 }}>
                    <Text className="font-headline text-on-surface" style={{ ...theme.text.display, marginBottom: 12 }}>
                        {t("plans.title")}
                    </Text>
                    <Text className="font-body text-secondary" style={{ ...theme.text.body }}>
                        {t("plans.subtitle")}
                    </Text>
                </View>

                {/* Apple-deferred change in flight — say WHEN the new plan
                    starts, or the successful purchase reads as a silent
                    failure (founder bug 2026-07-16). */}
                {subscription?.scheduledPlanCode
                    && subscription.scheduledPlanCode !== subscription.planCode && (
                    <View style={{
                        flexDirection: "row", alignItems: "center", gap: 10,
                        marginBottom: 24, paddingVertical: 14, paddingHorizontal: 16,
                        borderRadius: theme.radius.md, borderWidth: 1,
                        borderColor: "rgba(225,195,155,0.35)",
                        backgroundColor: "rgba(225,195,155,0.07)",
                    }}>
                        <Ionicons name="time-outline" size={18} color={theme.color.goldMidday} />
                        <Text className="font-body" style={{ ...theme.text.body, flex: 1, color: "#EDE4D7" }}>
                            {t("plans.scheduled_banner", {
                                plan: (plans ?? []).find(
                                    (p) => p.code === subscription.scheduledPlanCode,
                                )?.name ?? subscription.scheduledPlanCode,
                                date: (() => {
                                    const iso = subscription.scheduledChangeAt
                                        ?? subscription.currentPeriodEnd;
                                    try {
                                        return new Date(iso).toLocaleDateString(i18n.language, {
                                            day: "numeric", month: "long", year: "numeric",
                                        });
                                    } catch {
                                        return (iso ?? "").slice(0, 10);
                                    }
                                })(),
                            })}
                        </Text>
                    </View>
                )}

                {/* Monthly / Annual toggle — hidden until annual SKUs exist */}
                {hasAnnualPlans && (
                <View style={{ marginBottom: 28 }}>
                    {/* The two pills split this track evenly. They used to hug
                        their labels on the left with dead space to the right
                        (founder screenshot 2026-08-07): `flex: 1` alone lets a
                        child fall back to content width, so the share is stated
                        explicitly on both the Pressable and the pill below. */}
                    <View style={{
                        flexDirection: "row", alignSelf: "stretch", gap: 6,
                        padding: 5, borderRadius: theme.radius.md,
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
                                    style: { alignSelf: "stretch" as const, paddingVertical: 13, paddingHorizontal: 12, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: "rgba(225,195,155,0.55)", flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8 },
                                }
                                : {
                                    style: { alignSelf: "stretch" as const, paddingVertical: 13, paddingHorizontal: 10, borderRadius: theme.radius.sm, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 6 },
                                };
                            return (
                                <Pressable
                                    key={mode}
                                    onPress={() => setBillingMode(mode)}
                                    // STATIC, not a style callback: the callback
                                    // form is being dropped somewhere in this app's
                                    // render path, which left the Pressable sized to
                                    // its content — so the 100%-wide pill inside it
                                    // ran off the right edge and clipped "SAVE 30%"
                                    // (founder screenshot, 2026-08-07).
                                    style={PILL_SLOT}
                                >
                                    <PillWrapper {...pillProps}>
                                        {/* flexShrink + single-line auto-fit: the TR strings
                                            ("YILLIK" + "%30 TASARRUF" badge) overflowed the
                                            pill on narrower screens and clipped mid-word
                                            (founder report 2026-07-18). The label yields
                                            first; the badge never shrinks. */}
                                        <Text
                                            className="font-body"
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.72}
                                            style={{ ...theme.text.caption, flexShrink: 1, color: active ? "#F4DDB6" : "#998F84" }}
                                        >
                                            {isAnnual ? t("plans.toggle_annual_label") : t("plans.toggle_monthly")}
                                        </Text>
                                        {isAnnual ? (
                                            <View style={{
                                                // Was flexShrink:0 — an unshrinkable badge next to
                                                // an unshrinkable pill is what pushed ANNUAL past the
                                                // track edge. It may now give ground; the label
                                                // auto-fits first, so the badge only yields on the
                                                // narrowest screens and longest locales.
                                                flexShrink: 1,
                                                paddingHorizontal: 7, paddingVertical: 3, borderRadius: theme.radius.pill,
                                                backgroundColor: active ? "rgba(63,45,17,0.85)" : "rgba(225,195,155,0.14)",
                                                borderWidth: 0.5,
                                                borderColor: active ? "rgba(244,221,182,0.3)" : "rgba(225,195,155,0.35)",
                                            }}>
                                                <Text style={{ ...theme.text.caption, color: active ? "#F4DDB6" : "#E0C29A" }}>
                                                    {t("plans.toggle_save_badge")}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </PillWrapper>
                                </Pressable>
                            );
                        })}
                    </View>
                    {/* The "save up to 30%" hint under the toggle is gone
                        (founder call, 2026-08-07): the ANNUAL pill already
                        carries a SAVE 30% badge, so the line repeated itself
                        — and because it only appeared on one of the two
                        states, switching tabs shifted every card below it. */}
                </View>
                )}

                {/* Plan cards */}
                {sortedPlans.length === 0 ? (
                    <ActivityIndicator color="#E0C29A" style={{ marginVertical: 48 }} />
                ) : (
                    <View style={{ gap: 0, marginBottom: 36 }}>
                        {sortedPlans.map((plan) => (
                            <View key={plan.code} style={{ marginTop: 20 }}>
                            <PlanCard
                                plan={plan}
                                isCurrent={plan.code === currentCode}
                                // PRO (monthly & annual) always gets the
                                // premium gradient CTA — unless it's the
                                // user's current plan (then it's disabled).
                                isPopular={planTier(plan.code) === "BASE" && plan.code !== currentCode}
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
                        <View style={{ width: 40, height: 40, borderRadius: theme.radius.lg, backgroundColor: "rgba(224,194,154,0.1)", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
                            <Ionicons name="flash-outline" size={20} color="#E0C29A" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text className="font-body text-on-surface" style={{ ...theme.text.body, marginBottom: 2 }}>
                                {t("plans.credit_pack_bridge_title")}
                            </Text>
                            <Text className="font-body text-on-surface-variant" style={{ ...theme.text.caption }}>
                                {t("plans.credit_pack_bridge_subtitle")}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#998F84" />
                    </View>
                </Pressable>

                {/* Manage / cancel — only for active paid subscribers. Apple
                    forbids in-app cancellation, so this deep-links to the
                    native StoreKit manage sheet (Guideline 3.1.1 compliant).
                    Hidden for FREE/trial users who have nothing to manage. */}
                {planTier(currentCode) !== "FREE" ? (
                    <Pressable
                        onPress={() => openManageSubscriptions()}
                        style={({ pressed }) => ({
                            marginBottom: 16,
                            opacity: pressed ? 0.6 : 1,
                        })}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                paddingVertical: 14,
                            }}
                        >
                            <Ionicons name="settings-outline" size={15} color="#998F84" />
                            <Text
                                style={{
                                    ...theme.text.subtitle,
                                    color: "#998F84",
                                  }}
                            >
                                {t("plans.manage_subscription", {
                                    defaultValue: "Manage or cancel subscription",
                                })}
                            </Text>
                        </View>
                    </Pressable>
                ) : null}
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
