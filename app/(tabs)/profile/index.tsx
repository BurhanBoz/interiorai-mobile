import { useCallback, useState } from "react";
import { Alert, Animated, Linking, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import { theme } from "@/config/theme";
import { useAuthStore } from "@/stores/authStore";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { ConsentSheet } from "@/components/studio/ConsentSheet";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { manageSubscription } from "@/services/manageSubscription";

const U = theme.umber;
const V = theme.v2;

/** The FREE daily ceiling the progress bar is measured against (app.daily-drip.ceiling). */
const DAILY_CEILING = 3;

/**
 * Straight to the App Store's "write a review" page for Roomframe
 * (id6768418544 = com.roomframeai.mobile, checked against the lookup API).
 * The system rating sheet is rationed by iOS — three a year, shown when iOS
 * decides — so someone who wants to rate on purpose needs a door that always
 * opens (2.0.0).
 */
const APP_STORE_REVIEW_URL = "https://apps.apple.com/app/id6768418544?action=write-review";

/**
 * Settings (Umber redesign, 2026-09-19).
 *
 * <p><b>What came off.</b> The identity row used to print the account's
 * internal address — {@code guest-3f07b2aa-…@roomframe.internal} — which is
 * an implementation detail and makes a perfectly healthy account look broken.
 * A guest has a name and a plan; that is the whole of what they need to see.
 *
 * <p><b>Where the rest went.</b> Seven routed rows became four. Billing
 * history, terms, help and account deletion live on
 * {@code /settings/profile-edit}, opened by tapping your own name — one
 * account screen rather than two. 🔴 Deletion staying reachable is not a
 * preference; App Store 5.1.1(v) requires it.
 */
export default function SettingsScreen() {
    const { t, i18n } = useTranslation();
    const user = useAuthStore((s) => s.user);

    const balance = useCreditStore((s) => s.balance);
    const fetchBalance = useCreditStore((s) => s.fetchBalance);
    const subscription = useSubscriptionStore((s) => s.subscription);

    const notifPrefs = useNotificationPrefs();

    const [sheet, setSheet] = useState<null | "consent">(null);

    useFocusEffect(
        useCallback(() => {
            fetchBalance().catch(() => {});
        }, [fetchBalance]),
    );

    // `guest` is the server's own flag; the address is never read for this —
    // it is the thing this screen exists to stop showing.
    const isGuest = user?.guest === true;
    const displayName = user?.displayName?.trim() || t("profile.account_fallback_name");
    const initials =
        displayName
            .split(/\s+/)
            .map((w: string) => w[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase() || "?";

    const planLabel = subscription?.planName ?? t("profile.free_plan");
    const isFree = !subscription?.planCode || subscription.planCode === "FREE";
    const languageLabel =
        SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.nativeName ?? i18n.language;

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
                {/* Identity — and the door to everything the four rows below
                    do not carry. */}
                <Pressable
                    onPress={() => {
                        Haptics.selectionAsync();
                        router.push("/settings/profile-edit" as never);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t("profile.account_and_data")}
                    style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 18, paddingBottom: 22 }}
                >
                    <View
                        style={{
                            width: 54,
                            height: 54,
                            borderRadius: 27,
                            backgroundColor: U.lineAccent,
                            borderWidth: 1,
                            borderColor: U.accent,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text style={{ fontFamily: "NotoSerif", fontSize: 21, color: U.accentBright }}>
                            {initials}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        {/* 🔴 The name and the plan. NOT the internal address. */}
                        <Text style={{ ...V.displayS, color: U.ink }} numberOfLines={1}>
                            {displayName}
                        </Text>
                        <Text style={{ ...V.rowQuiet, color: U.inkMuted, marginTop: 2 }}>{planLabel}</Text>
                    </View>
                    <Text style={{ color: U.inkMuted, fontSize: 18 }}>›</Text>
                </Pressable>

                <CreditCard
                    balance={balance}
                    isFree={isFree}
                    onGetPro={() => router.push("/paywall?source=SETTINGS" as never)}
                    onBuyCredits={() => router.push("/credits/packs" as never)}
                    // Eski "Planını Seç" ekranı yeniden tasarlanmadı ve
                    // yükseltmeyi iki ayrı dilde anlatan iki ekran demekti.
                    // Tek satış yüzeyi paywall.
                    onManagePlan={() => router.push("/paywall?source=SETTINGS" as never)}
                />

                <View
                    style={{
                        marginTop: 22,
                        borderWidth: 1,
                        borderColor: U.lineNeutral,
                        borderRadius: 16,
                        overflow: "hidden",
                    }}
                >
                    {/* Always present, and it opens the ACCOUNT screen — name,
                        email, and for a guest the add-email upgrade. It used
                        to push /login, which asked a signed-in user to sign in
                        again and gave a guest no way to set a name at all. */}
                    <Row
                        label={t(isGuest ? "profile.sign_in_to_keep" : "profile.name_and_email")}
                        onPress={() => router.push("/settings/profile-edit" as never)}
                        chevron
                    />
                    {/* 🔴 Bu satır SUNUCUYA yazıyor. Eskiden yalnız cihazdaki
                        bir boolean'ı çeviriyordu: "Kapalı" yazıyor, sunucu
                        göndermeye devam ediyordu. Etiketi de düzeldi —
                        kapattığı şey günlük hatırlatma değil, isteğe bağlı
                        bildirimlerin tamamı. */}
                    <Row
                        label={t("profile.notifications")}
                        value={
                            notifPrefs.enabled === null
                                ? "…"
                                : t(notifPrefs.enabled ? "common.on" : "common.off")
                        }
                        valueTone={notifPrefs.enabled ? "accent" : "muted"}
                        onPress={async () => {
                            const wanted = notifPrefs.enabled === false;
                            const now = await notifPrefs.toggle();
                            // İzin reddedildiyse anahtar açılmaz; sebebini
                            // söylemeden bırakmak, dokunup hiçbir şey olmamış
                            // gibi görünmek demekti.
                            if (wanted && !now) {
                                Alert.alert(
                                    t("result.reminder_denied_title"),
                                    t("result.reminder_denied_body"),
                                );
                            }
                        }}
                    />
                    <Row
                        label={t("profile.language")}
                        value={languageLabel}
                        onPress={() => router.push("/settings/language" as never)}
                    />
                    {/* 2.0.0: the way into Apple's subscription page used to
                        live only on the plans screen, which nothing in the
                        tab bar reaches. It sits here now, and asks its one
                        question first (services/manageSubscription). */}
                    {!isFree && (
                        <Row
                            label={t("profile.manage_subscription")}
                            onPress={() => {
                                manageSubscription(
                                    subscription?.planCode ?? null,
                                    subscription?.currentPeriodEnd ?? null,
                                ).catch(() => {});
                            }}
                            chevron
                        />
                    )}
                    <Row
                        label={t("profile.rate_app")}
                        onPress={() => {
                            Linking.openURL(APP_STORE_REVIEW_URL).catch(() => {});
                        }}
                        chevron
                    />
                    <Row
                        label={t("studio.photo_and_privacy")}
                        onPress={() => setSheet("consent")}
                        chevron
                        last
                    />
                </View>
            </View>

            {sheet === "consent" && <ConsentSheet onClose={() => setSheet(null)} />}
        </SafeAreaView>
    );
}

/**
 * The wallet, as one card.
 *
 * <p>The progress bar measures against the FREE daily ceiling, so it only
 * means something on FREE — a subscriber's balance is not a fraction of three
 * and drawing it as one would be nonsense. Paid plans get the number and no bar.
 */
function CreditCard({
    balance,
    isFree,
    onGetPro,
    onBuyCredits,
    onManagePlan,
}: {
    balance: number;
    isFree: boolean;
    onGetPro: () => void;
    onBuyCredits: () => void;
    onManagePlan: () => void;
}) {
    const { t } = useTranslation();
    const ratio = Math.max(0, Math.min(1, balance / DAILY_CEILING));

    return (
        <View style={{ borderWidth: 1, borderColor: U.lineAccent, borderRadius: 18, padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
                <Text style={{ fontFamily: "NotoSerif", fontSize: 44, lineHeight: 48, color: U.accentBright }}>
                    {balance}
                </Text>
                <Text style={{ ...V.rowQuiet, color: U.inkMuted, flex: 1 }} numberOfLines={2}>
                    {isFree ? t("profile.credits_refill_line") : t("profile.credits_line")}
                </Text>
            </View>

            {isFree && (
                <View style={{ height: 5, borderRadius: 3, backgroundColor: U.lineNeutral, marginTop: 14 }}>
                    <View
                        style={{
                            height: 5,
                            borderRadius: 3,
                            backgroundColor: U.accent,
                            width: `${ratio * 100}%`,
                        }}
                    />
                </View>
            )}

            {/* 🔴 A subscriber was being sold the thing they already pay for:
                "Get Pro" rendered unconditionally, so the Pro card read
                "500 credits · Get Pro · Buy Credits". On a paid plan the
                filled button becomes the one that is actually useful — more
                credits — and Pro turns into the door to the plan itself. */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <Pressable
                    onPress={isFree ? onGetPro : onBuyCredits}
                    accessibilityRole="button"
                    style={{
                        flex: 1,
                        height: 46,
                        borderRadius: 13,
                        backgroundColor: U.buttonFill,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text style={{ fontFamily: "Inter-Bold", fontSize: 13.5, color: U.buttonInk }}>
                        {t(isFree ? "profile.get_pro" : "profile.buy_credits")}
                    </Text>
                </Pressable>
                <Pressable
                    onPress={isFree ? onBuyCredits : onManagePlan}
                    accessibilityRole="button"
                    style={{
                        flex: 1,
                        height: 46,
                        borderRadius: 13,
                        borderWidth: 1,
                        borderColor: U.accent,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text style={{ fontFamily: "Inter-Bold", fontSize: 13.5, color: U.accentBright }}>
                        {t(isFree ? "profile.buy_credits" : "profile.manage_plan")}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

function Row({
    label,
    value,
    valueTone = "muted",
    chevron,
    last,
    onPress,
}: {
    label: string;
    value?: string;
    valueTone?: "muted" | "accent";
    chevron?: boolean;
    last?: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={{
                paddingVertical: 15,
                paddingHorizontal: 16,
                borderBottomWidth: last ? 0 : 1,
                borderBottomColor: U.lineNeutral,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                minHeight: 44,
            }}
        >
            <Text style={{ ...V.row, color: U.ink, flex: 1 }} numberOfLines={1}>
                {label}
            </Text>
            {value ? (
                <Text
                    style={{
                        fontFamily: valueTone === "accent" ? "Inter-Bold" : "Inter",
                        fontSize: 13,
                        color: valueTone === "accent" ? U.accentBright : U.inkMuted,
                    }}
                >
                    {value}
                </Text>
            ) : null}
            {chevron ? <Text style={{ color: U.inkMuted, fontSize: 16 }}>›</Text> : null}
        </Pressable>
    );
}
