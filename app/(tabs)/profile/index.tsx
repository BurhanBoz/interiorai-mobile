import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
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
import { BOTTOM_SAFE_GAP, TAB_BAR_HEIGHT } from "@/components/layout/GlassNavBar";
import { CreditCard } from "@/components/settings/CreditCard";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsList";
import { Rise } from "@/components/settings/settingsMotion";
import {
    BellIcon,
    CardIcon,
    ChevronIcon,
    GlobeIcon,
    HelpIcon,
    PersonIcon,
    ShieldIcon,
    StarIcon,
} from "@/components/settings/SettingsIcons";

const U = theme.umber;
const V = theme.v2;
/** Row icon tint — the mockup's secondary ink. */
const ICON = theme.color.onSurfaceVariant;


/**
 * Straight to the App Store's "write a review" page for Roomframe
 * (id6768418544 = com.roomframeai.mobile, checked against the lookup API).
 * The system rating sheet is rationed by iOS — three a year, shown when iOS
 * decides — so someone who wants to rate on purpose needs a door that always
 * opens (2.0.0).
 */
import { APP_STORE_REVIEW_URL } from "@/config/appStore";

/**
 * Settings (Umber redesign, 2026-09-19; v3, 2026-10-10).
 *
 * <p><b>v3.</b> Same rows, same doors, regrouped: identity, the credit card,
 * then two titled groups — ACCOUNT (what is yours) and ROOMFRAME (the app
 * itself: rate it, get help). Every row now carries a line icon and is 52 pt.
 * Help gained a row here; it used to be reachable only through the account
 * screen, which is not where anyone looks for it. The version footer and its
 * long-press tour reset stay on {@code /settings/help}. The card and the
 * groups rise in on the first focus; the balance counts when it changes.
 * Fits 390×844 without scrolling for FREE and paid; the ScrollView is there
 * for smaller phones and large Dynamic Type.
 *
 * <p><b>What came off.</b> The identity row used to print the account's
 * internal address — {@code guest-3f07b2aa-…@roomframe.internal} — which is
 * an implementation detail and makes a perfectly healthy account look broken.
 * A guest has a name and a plan; that is the whole of what they need to see.
 *
 * <p><b>Where the rest went.</b> Billing history, terms and account deletion
 * live on {@code /settings/profile-edit}, opened by tapping your own name or
 * "Account and data" — one account screen rather than two. 🔴 Deletion
 * staying reachable is not a preference; App Store 5.1.1(v) requires it.
 */
export default function SettingsScreen() {
    const { t, i18n } = useTranslation();
    const user = useAuthStore((s) => s.user);

    const balance = useCreditStore((s) => s.balance);
    const fetchBalance = useCreditStore((s) => s.fetchBalance);
    const subscription = useSubscriptionStore((s) => s.subscription);

    const notifPrefs = useNotificationPrefs();

    const [sheet, setSheet] = useState<null | "consent">(null);
    // First focus only — see settingsMotion.
    const [entered, setEntered] = useState(false);

    useFocusEffect(
        useCallback(() => {
            setEntered(true);
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
    const notifValue =
        notifPrefs.enabled === null ? "…" : t(notifPrefs.enabled ? "common.on" : "common.off");

    const openAccount = () => {
        Haptics.selectionAsync();
        router.push("/settings/profile-edit" as never);
    };

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingTop: 6,
                    paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_GAP,
                    gap: 18,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Identity — and the door to everything the rows below do
                    not carry. */}
                <Pressable
                    onPress={openAccount}
                    accessibilityRole="button"
                    accessibilityLabel={`${displayName}, ${planLabel}`}
                    accessibilityHint={t("profile.account_and_data")}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56 }}
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
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        {/* 🔴 The name and the plan. NOT the internal address. */}
                        <Text style={{ ...V.displayS, color: U.ink }} numberOfLines={1}>
                            {displayName}
                        </Text>
                        <Text style={{ ...V.rowQuiet, color: U.inkMuted }} numberOfLines={1}>
                            {planLabel}
                        </Text>
                    </View>
                    <ChevronIcon color={U.inkMuted} size={16} />
                </Pressable>

                <Rise play={entered} index={0}>
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
                </Rise>

                <Rise play={entered} index={1}>
                    <SettingsGroup label={t("profile.section_account", { defaultValue: "Account" })}>
                        {/* Always present, and it opens the ACCOUNT screen — name,
                            email, billing, terms, deletion, and for a guest the
                            add-email upgrade. It used to push /login, which asked
                            a signed-in user to sign in again and gave a guest no
                            way to set a name at all. */}
                        <SettingsRow
                            icon={<PersonIcon color={ICON} />}
                            label={t(isGuest ? "profile.sign_in_to_keep" : "profile.account_and_data")}
                            onPress={() => router.push("/settings/profile-edit" as never)}
                            chevron
                        />
                        {/* 2.0.0: the way into Apple's subscription page used to
                            live only on the plans screen, which nothing in the
                            tab bar reaches. It sits here now, and asks its one
                            question first (services/manageSubscription). */}
                        {!isFree && (
                            <SettingsRow
                                icon={<CardIcon color={ICON} />}
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
                        {/* 🔴 Bu satır SUNUCUYA yazıyor. Eskiden yalnız cihazdaki
                            bir boolean'ı çeviriyordu: "Kapalı" yazıyor, sunucu
                            göndermeye devam ediyordu. Etiketi de düzeldi —
                            kapattığı şey günlük hatırlatma değil, isteğe bağlı
                            bildirimlerin tamamı. */}
                        <SettingsRow
                            icon={<BellIcon color={ICON} />}
                            label={t("profile.notifications")}
                            value={notifValue}
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
                        <SettingsRow
                            icon={<GlobeIcon color={ICON} />}
                            label={t("profile.language")}
                            value={languageLabel}
                            onPress={() => router.push("/settings/language" as never)}
                        />
                        <SettingsRow
                            icon={<ShieldIcon color={ICON} />}
                            label={t("studio.photo_and_privacy")}
                            onPress={() => setSheet("consent")}
                            chevron
                            last
                        />
                    </SettingsGroup>
                </Rise>

                <Rise play={entered} index={2}>
                    <SettingsGroup label={t("profile.section_roomframe", { defaultValue: "Roomframe" })}>
                        <SettingsRow
                            icon={<StarIcon color={U.accentBright} />}
                            label={t("profile.rate_app")}
                            onPress={() => {
                                Linking.openURL(APP_STORE_REVIEW_URL).catch(() => {});
                            }}
                            chevron
                        />
                        {/* The version footer and its long-press tour reset
                            live on /settings/help itself, not here. */}
                        <SettingsRow
                            icon={<HelpIcon color={ICON} />}
                            label={t("profile.help")}
                            onPress={() => router.push("/settings/help" as never)}
                            chevron
                            last
                        />
                    </SettingsGroup>
                </Rise>
            </ScrollView>

            {sheet === "consent" && <ConsentSheet onClose={() => setSheet(null)} />}
        </SafeAreaView>
    );
}
