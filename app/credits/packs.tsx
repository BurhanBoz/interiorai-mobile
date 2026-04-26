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
import { Button } from "@/components/ui/Button";
import { theme } from "@/config/theme";
import type { CreditPackResponse } from "@/types/api";

function formatPrice(cents: number, currency: string): string {
    const amount = (cents / 100).toFixed(2);
    return currency === "USD" ? `$${amount}` : `${amount} ${currency}`;
}

// Average credits consumed per design — used to translate "30 credits" into
// "~5 HD redesigns" so users don't have to do mental math before purchasing.
const AVG_CREDITS_PER_STANDARD = 5;
const AVG_CREDITS_PER_HD = 6;


function PackCard({
    pack,
    onPress,
    isPurchasing,
    disabled,
    planName,
}: {
    pack: CreditPackResponse;
    onPress: () => void;
    isPurchasing: boolean;
    disabled: boolean;
    planName: string;
}) {
    const { t } = useTranslation();
    const isFeatured = pack.badgeLabel != null;
    const hasBonus = pack.bonusCredits > 0;

    const standardDesigns = Math.floor(pack.totalCredits / AVG_CREDITS_PER_STANDARD);
    const hdDesigns = Math.floor(pack.totalCredits / AVG_CREDITS_PER_HD);

    return (
        <View
            style={{
                marginBottom: 16,
                borderRadius: 18,
                backgroundColor: theme.color.surfaceContainerLow,
                borderWidth: 1,
                borderColor: isFeatured
                    ? "rgba(225,195,155,0.45)"
                    : "rgba(77,70,60,0.22)",
                ...(isFeatured ? theme.elevation.goldGlowSoft : theme.elevation.sm),
            }}
        >
            {isFeatured ? (
                <LinearGradient
                    colors={["rgba(225,195,155,0.08)", "rgba(225,195,155,0)"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: 18,
                    }}
                    pointerEvents="none"
                />
            ) : null}

            {/* Floating badge — sits above the card top edge */}
            {pack.badgeLabel ? (
                <View style={{ position: "absolute", top: -11, left: 20, zIndex: 1 }}>
                    <LinearGradient
                        colors={theme.gradient.primary}
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
                        <Text style={{
                            fontFamily: "Inter-SemiBold",
                            fontSize: 10,
                            color: theme.color.onGold,
                            letterSpacing: 1.8,
                            textTransform: "uppercase",
                        }}>
                            {pack.badgeLabel}
                        </Text>
                    </LinearGradient>
                </View>
            ) : null}

            {/* Card body */}
            <View style={{ padding: 20, paddingTop: pack.badgeLabel ? 26 : 20 }}>
                {/* Pack name */}
                <Text style={{
                    fontFamily: "Inter-SemiBold",
                    fontSize: 10,
                    letterSpacing: 1.8,
                    textTransform: "uppercase",
                    color: "rgba(208,197,184,0.55)",
                    marginBottom: 10,
                }}>
                    {pack.name}
                </Text>

                {/* ── Credits — main headline number ── */}
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 7, marginBottom: hasBonus ? 9 : 4 }}>
                    <Text style={{
                        fontFamily: "NotoSerif",
                        fontSize: 42,
                        lineHeight: 46,
                        letterSpacing: -1,
                        color: theme.color.onSurface,
                        fontVariant: ["tabular-nums"],
                    }}>
                        {pack.totalCredits}
                    </Text>
                    <Text style={{
                        fontFamily: "Inter",
                        fontSize: 13,
                        color: theme.color.onSurfaceVariant,
                        marginBottom: 5,
                    }}>
                        {t("credit_packs.credits_suffix")}
                    </Text>
                </View>

                {/* ── Bonus breakdown ── */}
                {hasBonus && (
                    <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                    }}>
                        <Text style={{
                            fontFamily: "Inter",
                            fontSize: 11,
                            color: "rgba(208,197,184,0.38)",
                        }}>
                            {pack.credits} base
                        </Text>
                        <View style={{
                            width: 1,
                            height: 10,
                            backgroundColor: "rgba(208,197,184,0.14)",
                        }} />
                        {/* Bonus pill: green for loyalty plans, warm amber for pack-level promos */}
                        <View style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                            borderRadius: 7,
                            backgroundColor: planName !== "Free"
                                ? "rgba(123,179,138,0.11)"
                                : "rgba(225,195,155,0.10)",
                            borderWidth: 0.5,
                            borderColor: planName !== "Free"
                                ? "rgba(123,179,138,0.28)"
                                : "rgba(225,195,155,0.28)",
                        }}>
                            <Ionicons
                                name="gift-outline"
                                size={11}
                                color={planName !== "Free" ? theme.color.success : theme.color.goldMidday}
                            />
                            <Text style={{
                                fontFamily: "Inter-SemiBold",
                                fontSize: 11,
                                color: planName !== "Free" ? theme.color.success : theme.color.goldMidday,
                                letterSpacing: 0.2,
                            }}>
                                {planName !== "Free"
                                    ? `+${pack.bonusCredits} ${planName}`
                                    : `+${pack.bonusCredits} included`}
                            </Text>
                        </View>
                    </View>
                )}

                {/* ── Relatable usage hint ── */}
                <Text style={{
                    fontFamily: "Inter",
                    fontSize: 12,
                    lineHeight: 17,
                    color: theme.color.onSurfaceMuted,
                    marginBottom: pack.description ? 6 : 16,
                }}>
                    ≈ {standardDesigns} standard · {hdDesigns} HD designs
                </Text>

                {pack.description ? (
                    <Text style={{
                        fontFamily: "Inter",
                        fontSize: 12,
                        lineHeight: 17,
                        color: theme.color.onSurfaceMuted,
                        marginBottom: 16,
                    }} numberOfLines={2}>
                        {pack.description}
                    </Text>
                ) : null}

                <Button
                    title={t("credit_packs.buy_for", {
                        price: formatPrice(pack.priceCents, pack.currency),
                    })}
                    variant={isFeatured ? "primary" : "secondary"}
                    size="sm"
                    onPress={onPress}
                    disabled={disabled}
                    loading={isPurchasing}
                    fullWidth
                />
            </View>
        </View>
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
                                    {planName} subscriber bonus — +{creditPackBonusPct}%
                                </Text>
                                <Text style={{
                                    fontFamily: "Inter",
                                    fontSize: 12,
                                    lineHeight: 17,
                                    color: "rgba(208,197,184,0.65)",
                                }}>
                                    You earn {creditPackBonusPct}% extra credits on every pack purchase as a thank-you for subscribing.
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
                            Dev build · RevenueCat not configured. Dummy purchases are active and credits will be granted without payment.
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
                            planName={planName}
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
                        No credit packs available right now.
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
                                Payments secured by Apple · Taxes included
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
                                    Subscribe to get up to +40% bonus credits
                                </Text>
                            </Pressable>
                        )}
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}
