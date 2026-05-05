import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCreditPacksStore } from "@/stores/creditPacksStore";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { isDummyMode } from "@/config/revenuecat";
import { useBackHandler } from "@/utils/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { theme } from "@/config/theme";
import type { CreditPackResponse } from "@/types/api";

function formatPrice(cents: number, currency: string): string {
    const amount = (cents / 100).toFixed(2);
    return currency === "USD" ? `$${amount}` : `${amount} ${currency}`;
}


function PackCard({
    pack,
    onPress,
    isPurchasing,
    disabled,
    loyaltyBonusPct,
    standardCost,
    hdCost,
}: {
    pack: CreditPackResponse;
    onPress: () => void;
    isPurchasing: boolean;
    disabled: boolean;
    loyaltyBonusPct: number;
    /**
     * Plan-aware credit cost for a single STANDARD render
     * (`INTERIOR_REDESIGN` × `STANDARD` × 1 variant). 1 for FREE/BASIC, 2 for PRO,
     * 3 for MAX. Source: `plan_credit_rules` (V2 seed). Defaults to 1 when the
     * plan rules haven't loaded yet — prevents division-by-zero.
     */
    standardCost: number;
    /**
     * Plan-aware credit cost for a single HD render
     * (`HD_REDESIGN` × `HD` × 1 variant). 0 means HD is gated on this plan
     * (FREE has no HD rule); the HD line is hidden in that case.
     */
    hdCost: number;
}) {
    const { t } = useTranslation();
    const isFeatured = pack.badgeLabel != null;

    // Loyalty bonus is computed on the frontend from the subscriber tier's
    // bonus percentage (FREE 0% / BASIC 5% / PRO 20% / MAX 40%). Backend grants
    // it at purchase time but does not surface it in the listPacks payload, so
    // we reproduce the math here to show the same total the user will receive.
    const loyaltyBonus = loyaltyBonusPct > 0
        ? Math.floor((pack.credits * loyaltyBonusPct) / 100)
        : 0;
    // Only the loyalty bonus is surfaced in the card. Static `pack.bonusCredits`
    // baked into the SKU is intentionally hidden on FREE so the card stays a
    // clean 30 / 100 / 250 — no yellow "+N" pill on a tier with no real bonus.
    const displayTotal = pack.credits + loyaltyBonus;
    const hasBonus = loyaltyBonus > 0;
    const isPaidPlan = loyaltyBonusPct > 0;

    // Plan-aware "what can I do with this pack" math. STANDARD always
    // available; HD only on paid tiers (FREE has no HD_REDESIGN rule, so
    // hdCost lands as 0 and the HD line is suppressed below).
    const standardDesigns = Math.floor(displayTotal / Math.max(1, standardCost));
    const hasHd = hdCost > 0;
    const hdDesigns = hasHd ? Math.floor(displayTotal / hdCost) : 0;

    // Pack-card press wrapper — the whole card is now a single tap target
    // (mirrors the pattern we use on the plans screen). Previously the
    // non-featured "secondary" Button used onSurface-white text on a faint
    // outline, which read as decorative copy rather than a button. Making
    // the card itself the pressable element fixes both the affordance and
    // the hit-area issue at once.
    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
            style={({ pressed }) => ({
                marginBottom: 12,
                borderRadius: 14,
                backgroundColor: theme.color.surfaceContainerLow,
                borderWidth: 1,
                borderColor: isFeatured
                    ? pressed
                        ? "rgba(225,195,155,0.65)"
                        : "rgba(225,195,155,0.45)"
                    : pressed
                        ? "rgba(225,195,155,0.55)"
                        : "rgba(225,195,155,0.26)",
                opacity: disabled && !isPurchasing ? 0.55 : 1,
                transform: [{ scale: pressed && !disabled ? 0.99 : 1 }],
                ...(isFeatured ? theme.elevation.goldGlowSoft : theme.elevation.sm),
            })}
        >
            {isFeatured ? (
                <LinearGradient
                    colors={["rgba(225,195,155,0.07)", "rgba(225,195,155,0)"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: 14,
                    }}
                    pointerEvents="none"
                />
            ) : null}

            {/* Floating badge — sits above the card top edge */}
            {pack.badgeLabel ? (
                <View style={{ position: "absolute", top: -10, left: 16, zIndex: 1 }}>
                    <LinearGradient
                        colors={theme.gradient.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            borderWidth: 0.5,
                            borderColor: "rgba(63,45,17,0.2)",
                        }}
                    >
                        <Text style={{
                            fontFamily: "Inter-SemiBold",
                            fontSize: 9.5,
                            color: theme.color.onGold,
                            letterSpacing: 1.6,
                            textTransform: "uppercase",
                        }}>
                            {pack.badgeLabel}
                        </Text>
                    </LinearGradient>
                </View>
            ) : null}

            {/* Card body — single horizontal flex row puts the headline
                number and the price/CTA on the same baseline so the card
                reads in one glance instead of three stacked sections. */}
            <View
                style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    paddingTop: pack.badgeLabel ? 18 : 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                }}
            >
                {/* Left: pack name + credit headline + bonus chip stacked */}
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                        style={{
                            fontFamily: "Inter-SemiBold",
                            fontSize: 9.5,
                            letterSpacing: 1.6,
                            textTransform: "uppercase",
                            color: "rgba(208,197,184,0.55)",
                            marginBottom: 4,
                        }}
                        numberOfLines={1}
                    >
                        {pack.name}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5, marginBottom: hasBonus ? 6 : 2 }}>
                        <Text style={{
                            fontFamily: "NotoSerif",
                            fontSize: 28,
                            lineHeight: 32,
                            letterSpacing: -0.5,
                            color: theme.color.onSurface,
                            fontVariant: ["tabular-nums"],
                        }}>
                            {displayTotal}
                        </Text>
                        <Text style={{
                            fontFamily: "Inter",
                            fontSize: 11.5,
                            color: theme.color.onSurfaceVariant,
                        }}>
                            {t("credit_packs.credits_suffix")}
                        </Text>
                    </View>
                    {hasBonus ? (
                        <View
                            style={{
                                alignSelf: "flex-start",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                paddingHorizontal: 7,
                                paddingVertical: 2.5,
                                borderRadius: 6,
                                backgroundColor: isPaidPlan
                                    ? "rgba(123,179,138,0.10)"
                                    : "rgba(225,195,155,0.10)",
                                borderWidth: 0.5,
                                borderColor: isPaidPlan
                                    ? "rgba(123,179,138,0.28)"
                                    : "rgba(225,195,155,0.28)",
                                marginBottom: 6,
                            }}
                        >
                            <Ionicons
                                name="gift-outline"
                                size={10}
                                color={isPaidPlan ? theme.color.success : theme.color.goldMidday}
                            />
                            <Text
                                style={{
                                    fontFamily: "Inter-SemiBold",
                                    fontSize: 10,
                                    color: isPaidPlan ? theme.color.success : theme.color.goldMidday,
                                    letterSpacing: 0.2,
                                }}
                            >
                                {t("credit_packs.bonus_included", { count: loyaltyBonus })}
                            </Text>
                        </View>
                    ) : null}
                    <Text
                        style={{
                            fontFamily: "Inter",
                            fontSize: 11,
                            lineHeight: 15,
                            color: theme.color.onSurfaceMuted,
                        }}
                        numberOfLines={1}
                    >
                        {hasHd
                            ? t("credit_packs.usage_hint", {
                                  standard: standardDesigns,
                                  hd: hdDesigns,
                              })
                            : t("credit_packs.usage_hint_standard_only", {
                                  standard: standardDesigns,
                              })}
                    </Text>
                </View>

                {/* Right: CTA pill — gradient gold for the featured pack,
                    gold-bordered ghost for the rest. Both styles read
                    unambiguously as buttons because each carries the gold
                    accent + chevron. The wrapper Pressable handles taps,
                    so this is purely a visual affordance. */}
                {isPurchasing ? (
                    <View
                        style={{
                            minWidth: 88,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 10,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: "rgba(225,195,155,0.4)",
                            backgroundColor: "rgba(225,195,155,0.08)",
                        }}
                    >
                        <ActivityIndicator
                            size="small"
                            color={theme.color.goldMidday}
                        />
                    </View>
                ) : isFeatured ? (
                    <LinearGradient
                        colors={theme.gradient.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            paddingHorizontal: 14,
                            paddingVertical: 11,
                            borderRadius: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: "Inter-SemiBold",
                                fontSize: 13,
                                color: theme.color.onGold,
                                letterSpacing: 0.2,
                            }}
                        >
                            {formatPrice(pack.priceCents, pack.currency)}
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color={theme.color.onGold} />
                    </LinearGradient>
                ) : (
                    <View
                        style={{
                            paddingHorizontal: 14,
                            paddingVertical: 11,
                            borderRadius: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            borderWidth: 1,
                            borderColor: "rgba(225,195,155,0.4)",
                            backgroundColor: "rgba(225,195,155,0.06)",
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: "Inter-SemiBold",
                                fontSize: 13,
                                color: "#E0C29A",
                                letterSpacing: 0.2,
                            }}
                        >
                            {formatPrice(pack.priceCents, pack.currency)}
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color="#E0C29A" />
                    </View>
                )}
            </View>
        </Pressable>
    );
}

export default function CreditPacksScreen() {
    const { t } = useTranslation();
    const packs = useCreditPacksStore((s) => s.packs);
    const loading = useCreditPacksStore((s) => s.loading);
    const purchasing = useCreditPacksStore((s) => s.purchasing);
    const fetchPacks = useCreditPacksStore((s) => s.fetchPacks);
    const purchase = useCreditPacksStore((s) => s.purchase);
    const balance = useCreditStore((s) => s.balance);
    const subscription = useSubscriptionStore((s) => s.subscription);
    const creditPackBonusPct = useSubscriptionStore((s) => s.creditPackBonusPct);
    const getCreditCost = useSubscriptionStore((s) => s.getCreditCost);
    // Plan-aware credit costs for the pack usage hint. Read once at
    // render time; resolved against the active plan's `plan_credit_rules`.
    // FREE has no HD rule → hdCost = 0 → HD line is hidden in PackCard.
    const standardCost = getCreditCost("INTERIOR_REDESIGN", "STANDARD", 1);
    const hdCost = getCreditCost("HD_REDESIGN", "HD", 1);
    const handleBack = useBackHandler("/(tabs)/profile");

    useEffect(() => {
        fetchPacks();
    }, []);

    const handlePurchase = async (packCode: string) => {
        try {
            const result = await purchase(packCode);
            Alert.alert(
                t("credit_packs.credits_added_title"),
                t("credit_packs.credits_added_description", {
                    credits: result.creditsGranted,
                    balance: result.newBalance,
                }),
                [{ text: "OK", onPress: () => router.back() }],
            );
        } catch (e: unknown) {
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

    const showDevBanner = isDummyMode && __DEV__;
    const planCode = subscription?.planCode ?? "FREE";
    const planName = subscription?.planName ?? "Free";
    const hasBonusPlan = creditPackBonusPct > 0;

    return (
        <SafeAreaView
            edges={["top"]}
            style={{ flex: 1, backgroundColor: theme.color.surface }}
        >
            <TopBar
                title={t("credit_packs.title")}
                showBack
                onBack={handleBack}
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ marginTop: 12, marginBottom: 24 }}>
                    <Text style={{
                        fontFamily: "NotoSerif",
                        fontSize: 32,
                        lineHeight: 38,
                        letterSpacing: -0.3,
                        color: theme.color.onSurface,
                        marginBottom: 10,
                    }}>
                        {t("credit_packs.headline")}
                    </Text>
                    <Text style={{
                        fontFamily: "Inter",
                        fontSize: 14,
                        lineHeight: 20,
                        color: theme.color.onSurfaceVariant,
                    }}>
                        {t("credit_packs.subtitle", { balance })}
                    </Text>
                </View>

                {/* Loyalty bonus banner — shown only for paid plans */}
                {hasBonusPlan && (
                    <View style={{
                        marginBottom: 20,
                        borderRadius: 14,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: "rgba(123,179,138,0.35)",
                    }}>
                        <LinearGradient
                            colors={["rgba(123,179,138,0.12)", "rgba(123,179,138,0.05)"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 12,
                                padding: 16,
                            }}
                        >
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: "rgba(123,179,138,0.18)",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                <Ionicons name="gift-outline" size={20} color={theme.color.success} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{
                                    fontFamily: "Inter-SemiBold",
                                    fontSize: 13,
                                    color: theme.color.success,
                                    marginBottom: 2,
                                }}>
                                    {t("credit_packs.subscriber_bonus_title", { plan: planName, pct: creditPackBonusPct })}
                                </Text>
                                <Text style={{
                                    fontFamily: "Inter",
                                    fontSize: 12,
                                    lineHeight: 17,
                                    color: "rgba(208,197,184,0.65)",
                                }}>
                                    {t("credit_packs.subscriber_bonus_body", { pct: creditPackBonusPct })}
                                </Text>
                            </View>
                        </LinearGradient>
                    </View>
                )}

                {showDevBanner ? (
                    <View style={{
                        padding: 12,
                        marginBottom: 20,
                        borderRadius: 10,
                        backgroundColor: "rgba(229,181,103,0.08)",
                        borderWidth: 1,
                        borderColor: "rgba(229,181,103,0.22)",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                    }}>
                        <Ionicons name="construct-outline" size={14} color={theme.color.warning} />
                        <Text style={{
                            flex: 1,
                            fontFamily: "Inter",
                            fontSize: 11,
                            lineHeight: 15,
                            color: theme.color.warning,
                        }}>
                            {t("credit_packs.dev_mode_notice")}
                        </Text>
                    </View>
                ) : null}

                {loading && packs.length === 0 ? (
                    <ActivityIndicator
                        color={theme.color.goldMidday}
                        style={{ marginTop: 48 }}
                    />
                ) : (
                    packs.map((pack) => (
                        <PackCard
                            key={pack.id}
                            pack={pack}
                            onPress={() => handlePurchase(pack.code)}
                            isPurchasing={purchasing === pack.code}
                            disabled={purchasing !== null}
                            loyaltyBonusPct={creditPackBonusPct}
                            standardCost={standardCost}
                            hdCost={hdCost}
                        />
                    ))
                )}

                {!loading && packs.length === 0 ? (
                    <Text style={{
                        fontFamily: "Inter",
                        fontSize: 14,
                        textAlign: "center",
                        color: theme.color.onSurfaceVariant,
                        marginTop: 48,
                    }}>
                        {t("credit_packs.none_available")}
                    </Text>
                ) : null}

                {/* Trust signal */}
                {packs.length > 0 ? (
                    <View style={{ marginTop: 24, alignItems: "center", gap: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Ionicons name="lock-closed" size={12} color={theme.color.onSurfaceMuted} />
                            <Text style={{
                                fontFamily: "Inter",
                                fontSize: 11,
                                color: theme.color.onSurfaceMuted,
                                letterSpacing: 0.3,
                            }}>
                                {t("credit_packs.payments_secured")}
                            </Text>
                        </View>
                        {!hasBonusPlan && (
                            <Pressable
                                onPress={() => router.push("/plans")}
                                style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}
                            >
                                <Ionicons name="sparkles-outline" size={11} color={theme.color.goldMidday} />
                                <Text style={{
                                    fontFamily: "Inter-Medium",
                                    fontSize: 11,
                                    color: theme.color.goldMidday,
                                }}>
                                    {t("credit_packs.upsell_subscribe")}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}
