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

/**
 * Average credits per design across the common quality tiers — used to
 * translate a pack size like "30 credits" into "~5 HD redesigns". Keeps
 * users from having to mentally divide before a purchase.
 */
const AVG_CREDITS_PER_STANDARD = 5;
const AVG_CREDITS_PER_HD = 6;

function PackCard({
    pack,
    onPress,
    isPurchasing,
    disabled,
}: {
    pack: CreditPackResponse;
    onPress: () => void;
    isPurchasing: boolean;
    disabled: boolean;
}) {
    const { t } = useTranslation();
    const isFeatured = pack.badgeLabel != null;

    const standardDesigns = Math.floor(pack.totalCredits / AVG_CREDITS_PER_STANDARD);
    const hdDesigns = Math.floor(pack.totalCredits / AVG_CREDITS_PER_HD);

    return (
        <View
            style={{
                marginBottom: 16,
                padding: 20,
                borderRadius: 18,
                backgroundColor: theme.color.surfaceContainerLow,
                borderWidth: 1,
                borderColor: isFeatured
                    ? "rgba(225,195,155,0.45)"
                    : "rgba(77,70,60,0.22)",
                ...(isFeatured ? theme.elevation.goldGlowSoft : theme.elevation.sm),
            }}
        >
            {/* Featured card: subtle gold inner wash so the "popular" card
                reads as distinct from the regular cards even before reading
                the badge. */}
            {isFeatured ? (
                <LinearGradient
                    colors={["rgba(225,195,155,0.08)", "rgba(225,195,155,0)"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 18,
                    }}
                    pointerEvents="none"
                />
            ) : null}

            {pack.badgeLabel ? (
                <View style={{ position: "absolute", top: -10, left: 20 }}>
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
                        <Text
                            style={{
                                fontFamily: "Inter-SemiBold",
                                fontSize: 10,
                                color: theme.color.onGold,
                                letterSpacing: 1.8,
                                textTransform: "uppercase",
                            }}
                        >
                            {pack.badgeLabel}
                        </Text>
                    </LinearGradient>
                </View>
            ) : null}

            <Text
                style={{
                    fontFamily: "Inter-SemiBold",
                    fontSize: 10,
                    letterSpacing: 1.8,
                    textTransform: "uppercase",
                    color: "rgba(208,197,184,0.7)",
                    marginBottom: 8,
                    marginTop: pack.badgeLabel ? 8 : 0,
                }}
            >
                {pack.name}
            </Text>

            <View
                style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 6,
                }}
            >
                <Text
                    style={{
                        fontFamily: "NotoSerif",
                        fontSize: 36,
                        lineHeight: 40,
                        letterSpacing: -0.6,
                        color: theme.color.onSurface,
                        fontVariant: ["tabular-nums"],
                    }}
                >
                    {pack.totalCredits}
                </Text>
                <Text
                    style={{
                        fontFamily: "Inter",
                        fontSize: 13,
                        color: theme.color.onSurfaceVariant,
                    }}
                >
                    {t("credit_packs.credits_suffix")}
                </Text>
                {pack.bonusCredits > 0 ? (
                    <View
                        style={{
                            marginLeft: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                            backgroundColor: "rgba(123,179,138,0.14)",
                            borderWidth: 1,
                            borderColor: "rgba(123,179,138,0.35)",
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: "Inter-SemiBold",
                                fontSize: 10,
                                color: theme.color.success,
                                letterSpacing: 1.2,
                                textTransform: "uppercase",
                            }}
                        >
                            {t("credit_packs.bonus_suffix", {
                                count: pack.bonusCredits,
                            })}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* Relatable calculation — "~X standard or Y HD designs" */}
            <Text
                style={{
                    fontFamily: "Inter",
                    fontSize: 12,
                    lineHeight: 16,
                    color: theme.color.onSurfaceMuted,
                    marginBottom: pack.description ? 6 : 18,
                }}
            >
                ≈ {standardDesigns} standard · {hdDesigns} HD designs
            </Text>

            {pack.description ? (
                <Text
                    style={{
                        fontFamily: "Inter",
                        fontSize: 12,
                        lineHeight: 16,
                        color: theme.color.onSurfaceMuted,
                        marginBottom: 18,
                    }}
                    numberOfLines={2}
                >
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
            const message =
                e instanceof Error
                    ? e.message
                    : t("credit_packs.purchase_failed_default");
            Alert.alert(t("credit_packs.purchase_failed_title"), message);
        }
    };

    // The dev banner is only ever shown in development builds. In release
    // builds __DEV__ is false even if the RevenueCat keys happen to be
    // missing, so the banner can never leak into a TestFlight / App Store
    // build. Previously this was a trust-destroying P0 in the audit.
    const showDevBanner = isDummyMode && __DEV__;

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
                <View style={{ marginTop: 12, marginBottom: 32 }}>
                    <Text
                        style={{
                            fontFamily: "NotoSerif",
                            fontSize: 32,
                            lineHeight: 38,
                            letterSpacing: -0.3,
                            color: theme.color.onSurface,
                            marginBottom: 10,
                        }}
                    >
                        {t("credit_packs.headline")}
                    </Text>
                    <Text
                        style={{
                            fontFamily: "Inter",
                            fontSize: 14,
                            lineHeight: 20,
                            color: theme.color.onSurfaceVariant,
                        }}
                    >
                        {t("credit_packs.subtitle", { balance })}
                    </Text>
                </View>

                {showDevBanner ? (
                    <View
                        style={{
                            padding: 12,
                            marginBottom: 20,
                            borderRadius: 10,
                            backgroundColor: "rgba(229,181,103,0.08)",
                            borderWidth: 1,
                            borderColor: "rgba(229,181,103,0.22)",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <Ionicons
                            name="construct-outline"
                            size={14}
                            color={theme.color.warning}
                        />
                        <Text
                            style={{
                                flex: 1,
                                fontFamily: "Inter",
                                fontSize: 11,
                                lineHeight: 15,
                                color: theme.color.warning,
                            }}
                        >
                            Dev build · RevenueCat not configured. Dummy purchases are active
                            and credits will be granted without payment.
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
                        />
                    ))
                )}

                {!loading && packs.length === 0 ? (
                    <Text
                        style={{
                            fontFamily: "Inter",
                            fontSize: 14,
                            textAlign: "center",
                            color: theme.color.onSurfaceVariant,
                            marginTop: 48,
                        }}
                    >
                        No credit packs available right now.
                    </Text>
                ) : null}

                {/* Trust signal — quiet, Apple Pay affordance */}
                {packs.length > 0 ? (
                    <View
                        style={{
                            marginTop: 24,
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            <Ionicons
                                name="lock-closed"
                                size={12}
                                color={theme.color.onSurfaceMuted}
                            />
                            <Text
                                style={{
                                    fontFamily: "Inter",
                                    fontSize: 11,
                                    color: theme.color.onSurfaceMuted,
                                    letterSpacing: 0.3,
                                }}
                            >
                                Payments secured by Apple · Taxes included
                            </Text>
                        </View>
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}
