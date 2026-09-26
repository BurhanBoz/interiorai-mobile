import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { recordPaywallEvent } from "@/services/telemetry";
import {
    purchaseAlertKeys,
    reportPurchaseOutcome,
    reportPurchaseSuccess,
} from "@/services/purchaseOutcome";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useCreditPacksStore } from "@/stores/creditPacksStore";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useStorePricesStore } from "@/stores/storePricesStore";
import { formatProductPrice } from "@/utils/price";

const U = theme.umber;
import { isDummyMode } from "@/config/revenuecat";
import { TopBar } from "@/components/layout/TopBar";
import { theme } from "@/config/theme";
import { HexMark } from "@/components/brand/HexMark";
import { useWindowDimensions } from "react-native";
import type { CreditPackResponse } from "@/types/api";

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
    const storePrices = useStorePricesStore((s) => s.prices);
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
                // Softer premium frame (2026-07-14 pass): generous air
                // between cards + a rounder, calmer silhouette. Featured
                // cards carry a floating badge that hangs 10px ABOVE the
                // frame — without extra headroom it visually fuses with the
                // card above (the "nested" look the founder flagged twice).
                marginTop: pack.badgeLabel ? 14 : 0,
                marginBottom: 22,
                borderRadius: theme.radius.lg,
                // Only the featured card was reading as a card (founder
                // screenshot 2026-08-07): surfaceContainerLow (#201B15) sits
                // nine values off the page (#191510), which an OLED panel at
                // normal brightness simply does not show, and a 26%-gold hairline
                // disappeared with it. The others therefore looked like three
                // paragraphs of loose text with prices floating beside them —
                // on the one screen where the user is choosing what to buy.
                // Raising the surface one step and the border to 38% gives each
                // pack a definite edge without turning the list loud.
                backgroundColor: isFeatured
                    ? theme.color.surfaceContainerLow
                    : theme.color.surfaceContainer,
                borderWidth: 1,
                borderColor: isFeatured
                    ? pressed
                        ? "rgba(225,195,155,0.70)"
                        : "rgba(225,195,155,0.52)"
                    : pressed
                        ? "rgba(225,195,155,0.55)"
                        : "rgba(225,195,155,0.38)",
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
                        borderRadius: theme.radius.lg,
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
                            borderRadius: theme.radius.pill,
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            borderWidth: 0.5,
                            borderColor: "rgba(63,45,17,0.2)",
                        }}
                    >
                        <Text style={{
                            ...theme.text.caption,
                            color: theme.color.onGold,
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
                    paddingHorizontal: theme.space.gutter,
                    paddingVertical: 18,
                    paddingTop: pack.badgeLabel ? 22 : 18,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 18,
                }}
            >
                {/* Left: pack name + credit headline + bonus chip stacked */}
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                        style={{
                            ...theme.text.caption,
                            color: "rgba(208,197,184,0.55)",
                            marginBottom: 7,
                          }}
                        numberOfLines={1}
                    >
                        {pack.name}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5, marginBottom: hasBonus ? 8 : 4 }}>
                        <Text style={{
                            ...theme.text.headline,
                            color: theme.color.onSurface,
                            fontVariant: ["tabular-nums"],
                          }}>
                            {displayTotal}
                        </Text>
                        <Text style={{
                            ...theme.text.caption,
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
                                borderRadius: theme.radius.sm,
                                backgroundColor: isPaidPlan
                                    ? "rgba(123,179,138,0.10)"
                                    : "rgba(225,195,155,0.10)",
                                borderWidth: 0.5,
                                borderColor: isPaidPlan
                                    ? "rgba(123,179,138,0.28)"
                                    : "rgba(225,195,155,0.28)",
                                marginBottom: 8,
                            }}
                        >
                            <Ionicons
                                name="gift-outline"
                                size={10}
                                color={isPaidPlan ? theme.color.success : theme.color.goldMidday}
                            />
                            <Text
                                style={{
                                    ...theme.text.caption,
                                    color: isPaidPlan ? theme.color.success : theme.color.goldMidday,
                                  }}
                            >
                                {t("credit_packs.bonus_included", { count: loyaltyBonus })}
                            </Text>
                        </View>
                    ) : null}
                    <Text
                        style={{
                            ...theme.text.caption,
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
                            borderRadius: theme.radius.sm,
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
                            borderRadius: theme.radius.sm,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <Text
                            style={{
                                ...theme.text.caption,
                                color: theme.color.onGold,
                              }}
                        >
                            {formatProductPrice(storePrices, pack.appleProductId, pack.priceCents, pack.currency)}
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color={theme.color.onGold} />
                    </LinearGradient>
                ) : (
                    <View
                        style={{
                            paddingHorizontal: 14,
                            paddingVertical: 11,
                            borderRadius: theme.radius.sm,
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
                                ...theme.text.caption,
                                color: "#DDB477",
                              }}
                        >
                            {formatProductPrice(storePrices, pack.appleProductId, pack.priceCents, pack.currency)}
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color="#DDB477" />
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
    const { height: screenH } = useWindowDimensions();
    const subscription = useSubscriptionStore((s) => s.subscription);
    const creditPackBonusPct = useSubscriptionStore((s) => s.creditPackBonusPct);
    const getCreditCost = useSubscriptionStore((s) => s.getCreditCost);
    // Plan-aware credit cost for the pack usage hint. Read once at render
    // time; resolved against the active plan's `plan_credit_rules`.
    //
    // The HD line is gone (2026-09-01): HD meant "2 MP instead of 1" and V69
    // made 2 MP the floor, so "how many HD designs does this buy" no longer
    // describes anything a user can choose. hdCost is passed as 0, which is
    // the suppression path PackCard already had for FREE.
    const standardCost = getCreditCost("INTERIOR_REDESIGN", "STANDARD", 1);
    const hdCost = 0;

    // Set when a purchase lands, so unmount does not report a dismissal on
    // top of it. A ref, not state: it is read during teardown, when a state
    // update would already have been discarded.
    const purchasedRef = useRef(false);
    const hydrateStorePrices = useStorePricesStore((s) => s.hydrate);

    // Localized pack prices — idempotent retry in case boot hydration
    // raced an offline window.
    useEffect(() => {
        hydrateStorePrices();
    }, [hydrateStorePrices]);

    useEffect(() => {
        fetchPacks();
    }, []);

    // SHOWN gives this screen the denominator every other paywall surface
    // already had. Without it the funnel could say six people tapped a pack
    // and nothing about how many opened the screen and left — so "almost
    // nobody buys credits" and "almost nobody reaches the screen" read the
    // same, and they call for opposite fixes.
    //
    // DISMISSED fires from the teardown rather than from the back button:
    // every exit passes through unmount, but only one of them passes through
    // that button. iOS's edge-swipe would have been missing from the count,
    // and a denominator that silently drops a whole exit route is worse than
    // none — it looks trustworthy.
    useEffect(() => {
        recordPaywallEvent("SHOWN", { source: "PACKS_SCREEN" });
        return () => {
            if (!purchasedRef.current) {
                recordPaywallEvent("DISMISSED", { source: "PACKS_SCREEN" }).catch(() => {});
            }
        };
    }, []);

    const handlePurchase = async (packCode: string) => {
        // Same funnel table as the paywall (V65); this screen's sales were
        // invisible there until 2026-09-06.
        await recordPaywallEvent("PURCHASE_STARTED", { source: "PACKS_SCREEN", planCode: packCode });
        try {
            const result = await purchase(packCode);
            purchasedRef.current = true;
            reportPurchaseSuccess({ source: "PACKS_SCREEN", planCode: packCode }).catch(() => {});
            // Webhook grant hasn't reconciled within the poll window — the
            // purchase went through on Apple's side, credits land shortly.
            const pending = (result as { pending?: boolean }).pending
                || result.creditsGranted <= 0;
            Alert.alert(
                pending
                    ? t("credit_packs.credits_pending_title", { defaultValue: "Purchase received" })
                    : t("credit_packs.credits_added_title"),
                pending
                    ? t("credit_packs.credits_pending_description", {
                        defaultValue: "Your purchase went through — the credits will appear in a moment.",
                    })
                    : t("credit_packs.credits_added_description", {
                        credits: result.creditsGranted,
                        balance: result.newBalance,
                    }),
                [{ text: "OK", onPress: () => router.back() }],
            );
        } catch (e: unknown) {
            // Until 2026-09-15 this block recorded FAILED for everything,
            // cancellation included, and told the user their purchase had
            // failed when they had simply changed their mind. Six of the six
            // failures this table ever held came from this screen, and not one
            // of them recorded why.
            const result = await reportPurchaseOutcome(e, {
                source: "PACKS_SCREEN", planCode: packCode,
            });
            if (result.cancelled) {
                return;
            }
            const named = purchaseAlertKeys(result);
            if (named) {
                Alert.alert(t(named.title), t(named.body));
                return;
            }
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

    const creditPackBonusPct2 = creditPackBonusPct;
    const storePrices = useStorePricesStore((st) => st.prices);

    /**
     * Credit packs (Umber, 2026-09-19).
     *
     * <p>The old screen gave each pack a card with a "≈ N standard renders"
     * subtitle, a glow on the middle one and a MOST POPULAR badge that
     * overhung the card edge. Three near-identical decisions presented as
     * three competing objects.
     *
     * <p>They are now three rows in the paywall's shape: the amount on the
     * left, the price on the right, the row itself the button. The badge is
     * a quiet chip in the row rather than a sticker on top of it.
     *
     * <p>🔴 handlePurchase, the store call, the pending-purchase alert and the
     * dummy-mode banner are unchanged. Only the presentation moved.
     */
    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
            <View style={{ flex: 1, paddingHorizontal: 18 }}>
                {/* Ekranın üst çeyreği: marka işareti ve bakiye.
                    Burası üç satır metinle başlıyordu ve altında üç kart,
                    geri kalan yarım ekran boştu — bir alışveriş ekranından
                    çok yarım kalmış bir liste gibi duruyordu. Bakiye artık
                    sayfanın tepesinde ve TEK yerde: eski alt başlık aynı
                    sayıyı cümle içinde bir kez daha söylüyordu. */}
                <View
                    style={{
                        height: Math.round(screenH * 0.26),
                        minHeight: 180,
                        borderRadius: 24,
                        overflow: "hidden",
                        backgroundColor: U.surface,
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 10,
                        marginBottom: 22,
                    }}
                >
                    <LinearGradient
                        colors={[U.lineAccent, "transparent"]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                    />
                    {/* İşaretin arkasındaki halka — parlama yerine çizgi,
                        çünkü gölge bu zeminde çamur gibi okunuyor. */}
                    <View
                        style={{
                            width: 78, height: 78, borderRadius: 39,
                            borderWidth: 1, borderColor: U.accent,
                            alignItems: "center", justifyContent: "center",
                            marginBottom: 16,
                        }}
                    >
                        <HexMark width={30} height={33} color={U.accentBright} />
                    </View>
                    <Text style={{ fontFamily: "NotoSerif", fontSize: 46, lineHeight: 52, color: U.ink }}>
                        {balance}
                    </Text>
                    <Text style={{ ...theme.v2.caption, color: U.inkMuted, marginTop: 2 }}>
                        {t("credit_packs.credits_suffix")}
                    </Text>
                </View>

                <Text style={{ ...theme.v2.displayL, color: U.ink }}>
                    {t("credit_packs.headline")}
                </Text>
                <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted, marginTop: 8, marginBottom: 20 }}>
                    {t("credit_packs.promise_line")}
                </Text>

                {loading ? (
                    <ActivityIndicator color={U.accent} style={{ marginTop: 24 }} />
                ) : (
                    <View style={{ gap: 10 }}>
                        {packs.map((pack) => {
                            const bonus =
                                creditPackBonusPct2 > 0
                                    ? Math.floor((pack.credits * creditPackBonusPct2) / 100)
                                    : 0;
                            const total = pack.credits + bonus;
                            return (
                                <Pressable
                                    key={pack.code}
                                    onPress={() => handlePurchase(pack.code)}
                                    disabled={purchasing !== null}
                                    accessibilityRole="button"
                                    accessibilityLabel={t("credit_packs.buy_a11y", {
                                        credits: total,
                                        name: pack.name,
                                    })}
                                    style={{
                                        borderRadius: 18,
                                        borderWidth: pack.badgeLabel ? 1.5 : 1,
                                        borderColor: pack.badgeLabel ? U.accent : U.lineNeutral,
                                        backgroundColor: pack.badgeLabel ? U.surface : "transparent",
                                        paddingVertical: 15,
                                        paddingHorizontal: 16,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 12,
                                        opacity: purchasing && purchasing !== pack.code ? 0.5 : 1,
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                            <Text style={{ ...theme.v2.tier, color: pack.badgeLabel ? U.accentBright : U.inkMuted }}>
                                                {pack.name}
                                            </Text>
                                            {pack.badgeLabel ? (
                                                <View style={{
                                                    backgroundColor: U.lineAccent,
                                                    borderRadius: 4,
                                                    paddingHorizontal: 6,
                                                    paddingVertical: 2,
                                                }}>
                                                    <Text style={{ fontFamily: "Inter-Bold", fontSize: 8.5, letterSpacing: 1, color: U.accentBright }}>
                                                        {pack.badgeLabel}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                        <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted, marginTop: 3 }}>
                                            {bonus > 0
                                                ? t("credit_packs.credits_with_bonus", { total, bonus })
                                                : t("credit_packs.credits_plain", { count: pack.credits })}
                                        </Text>
                                    </View>

                                    {purchasing === pack.code ? (
                                        <ActivityIndicator color={U.accent} />
                                    ) : (
                                        <Text style={{ ...theme.v2.price, color: U.ink }}>
                                            {formatProductPrice(storePrices, pack.appleProductId, pack.priceCents, pack.currency)}
                                        </Text>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                <View style={{ flex: 1 }} />

                {/* 2.0.0: "Subscribe for up to +40% bonus credits" came off. The
                    40% belonged to the retired Max plan — live plans give
                    Base +10% and Pro +20% on packs — and the owner wants this
                    screen plain: packs and prices. */}
                <Text style={{ ...theme.v2.caption, color: U.inkMuted, textAlign: "center", marginBottom: 12 }}>
                    {t("credit_packs.secured_note")}
                </Text>
            </View>
        </SafeAreaView>
    );
}
