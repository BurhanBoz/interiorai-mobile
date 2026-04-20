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
}: {
    pack: CreditPackResponse;
    onPress: () => void;
    isPurchasing: boolean;
    disabled: boolean;
}) {
    const { t } = useTranslation();
    const isFeatured = pack.badgeLabel != null;
    return (
        <View
            className="bg-surface-container-low rounded-xl"
            style={[
                { padding: 24, marginBottom: 16 },
                isFeatured && {
                    borderWidth: 1,
                    borderColor: "rgba(224,194,154,0.3)",
                },
            ]}
        >
            {pack.badgeLabel && (
                <View style={{ position: "absolute", top: 12, right: 12 }}>
                    <LinearGradient
                        colors={["#C4A882", "#A68A62"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            borderRadius: 9999,
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 9,
                                fontWeight: "700",
                                color: "#3F2D11",
                                letterSpacing: 1.5,
                                textTransform: "uppercase",
                            }}
                        >
                            {pack.badgeLabel}
                        </Text>
                    </LinearGradient>
                </View>
            )}

            <Text
                className="font-label text-secondary"
                style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    marginBottom: 6,
                }}
            >
                {pack.name}
            </Text>

            <View className="flex-row items-baseline" style={{ gap: 8, marginBottom: 4 }}>
                <Text
                    className="font-headline text-on-surface"
                    style={{ fontSize: 32 }}
                >
                    {pack.totalCredits}
                </Text>
                <Text
                    className="font-body text-secondary"
                    style={{ fontSize: 13 }}
                >
                    {t("credit_packs.credits_suffix")}
                </Text>
                {pack.bonusCredits > 0 && (
                    <Text
                        className="font-label"
                        style={{
                            fontSize: 11,
                            color: "#4ade80",
                            fontWeight: "700",
                            letterSpacing: 1,
                        }}
                    >
                        {t("credit_packs.bonus_suffix", { count: pack.bonusCredits })}
                    </Text>
                )}
            </View>

            {pack.description && (
                <Text
                    className="font-body text-on-surface-variant"
                    style={{ fontSize: 12, marginBottom: 20 }}
                    numberOfLines={2}
                >
                    {pack.description}
                </Text>
            )}

            <Pressable
                onPress={onPress}
                disabled={disabled}
                style={({ pressed }) => ({
                    transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
                    opacity: disabled ? 0.5 : 1,
                })}
            >
                {isFeatured ? (
                    <LinearGradient
                        colors={["#C4A882", "#A68A62"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            height: 48,
                            borderRadius: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                        }}
                    >
                        {isPurchasing ? (
                            <ActivityIndicator color="#3F2D11" />
                        ) : (
                            <Text
                                style={{
                                    fontSize: 14,
                                    fontWeight: "700",
                                    color: "#3F2D11",
                                    letterSpacing: 1,
                                }}
                            >
                                {t("credit_packs.buy_for", { price: formatPrice(pack.priceCents, pack.currency) })}
                            </Text>
                        )}
                    </LinearGradient>
                ) : (
                    <View
                        style={{
                            height: 48,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: "#4D463C",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {isPurchasing ? (
                            <ActivityIndicator color="#E0C29A" />
                        ) : (
                            <Text
                                className="font-body text-secondary"
                                style={{ fontSize: 14, fontWeight: "600" }}
                            >
                                {t("credit_packs.buy_for", { price: formatPrice(pack.priceCents, pack.currency) })}
                            </Text>
                        )}
                    </View>
                )}
            </Pressable>
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
            const message = e instanceof Error
                ? e.message
                : t("credit_packs.purchase_failed_default");
            Alert.alert(t("credit_packs.purchase_failed_title"), message);
        }
    };

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
                    style={{
                        fontSize: 11,
                        letterSpacing: 2.2,
                        textTransform: "uppercase",
                    }}
                >
                    {t("credit_packs.title")}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ marginTop: 16, marginBottom: 32 }}>
                    <Text
                        className="font-headline text-on-surface"
                        style={{ fontSize: 32, lineHeight: 36, marginBottom: 8 }}
                    >
                        {t("credit_packs.headline")}
                    </Text>
                    <Text
                        className="font-body text-secondary"
                        style={{ fontSize: 14 }}
                    >
                        {t("credit_packs.subtitle", { balance })}
                    </Text>
                </View>

                {isDummyMode && (
                    <View
                        className="rounded-lg"
                        style={{
                            padding: 12,
                            marginBottom: 16,
                            backgroundColor: "rgba(224,194,154,0.08)",
                            borderWidth: 1,
                            borderColor: "rgba(224,194,154,0.2)",
                        }}
                    >
                        <Text
                            className="font-body text-on-surface-variant"
                            style={{ fontSize: 11 }}
                        >
                            Dev mode — RevenueCat not configured. Purchases run on the DUMMY
                            provider and credits are granted without payment.
                        </Text>
                    </View>
                )}

                {loading && packs.length === 0 ? (
                    <ActivityIndicator color="#E0C29A" style={{ marginTop: 48 }} />
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

                {!loading && packs.length === 0 && (
                    <Text
                        className="font-body text-on-surface-variant text-center"
                        style={{ marginTop: 48, fontSize: 14 }}
                    >
                        No credit packs available right now.
                    </Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
