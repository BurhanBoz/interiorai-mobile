import { View, Text, Pressable } from "react-native";
import { theme } from "@/config/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useCreditStore } from "@/stores/creditStore";

/**
 * Welcome bonus trial banner (V20 / Pricing Strategy V2).
 *
 * <p>Shown on the studio home screen while the user is inside their
 * 7-day MAX trial. Server evaluates trial status (
 * {@code welcomeBonusActive}) so the device clock can't drift the UI;
 * this component just reflects it.
 *
 * <p>Hides itself completely when the trial isn't active — there's no
 * "you used to have a trial" empty state. Post-trial, the paywall
 * surfaces are responsible for the next nudge.
 *
 * <p>Compact countdown variant (badge in header) lives in
 * {@link TrialCountdownBadge}; this is the full announcement card
 * shown on studio first-render only.
 */
export function WelcomeTrialBanner({ onClose }: { onClose?: () => void }) {
    const { t } = useTranslation();
    const welcomeBonusActive = useCreditStore((s) => s.welcomeBonusActive);
    const expiresAt = useCreditStore((s) => s.welcomeBonusExpiresAt);
    // Visibility lifecycle is owned by the PARENT (studio first-visit intro,
    // 2026-07 review round 2) — this card only checks trial state and
    // forwards the X to onClose. The compact TrialCountdownBadge in the
    // header stays as the persistent reminder until expiry.

    if (!welcomeBonusActive || !expiresAt) return null;

    return (
        <View
            style={{
                marginHorizontal: 24,
                marginBottom: 16,
                borderRadius: theme.radius.md,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(225,195,155,0.4)",
                shadowColor: "#E1C39B",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.18,
                shadowRadius: 8,
                elevation: 4,
            }}
        >
            <LinearGradient
                colors={["rgba(225,195,155,0.18)", "rgba(167,131,89,0.14)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 18, gap: 8 }}
            >
                <View className="flex-row items-center" style={{ gap: 10 }}>
                    <Ionicons name="sparkles" size={18} color="#E0C29A" />
                    <Text
                        className="font-headline"
                        style={{ ...theme.text.title, color: "#E5E2E1", flex: 1 }}
                    >
                        {t("studio.welcome_banner_title")}
                    </Text>
                    {onClose && (
                    <Pressable
                        onPress={onClose}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel={t("common.close")}
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: theme.radius.md,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(19,19,19,0.35)",
                        }}
                    >
                        <Ionicons name="close" size={16} color="#D0C5B8" />
                    </Pressable>
                    )}
                </View>
                <Text
                    className="font-body"
                    style={{ ...theme.text.body, color: "#D0C5B8" }}
                >
                    {t("studio.welcome_banner_body")}
                </Text>
            </LinearGradient>
        </View>
    );
}

/**
 * Compact trial countdown badge for the studio header — shows
 * remaining time as "Xd left" / "Xh left" depending on what reads
 * cleaner. Hides when trial inactive.
 */
export function TrialCountdownBadge() {
    const { t } = useTranslation();
    const welcomeBonusActive = useCreditStore((s) => s.welcomeBonusActive);
    const expiresAt = useCreditStore((s) => s.welcomeBonusExpiresAt);

    if (!welcomeBonusActive || !expiresAt) return null;

    const msLeft = new Date(expiresAt).getTime() - Date.now();
    if (msLeft <= 0) return null;

    const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
    const daysLeft = Math.floor(hoursLeft / 24);

    // Show days while >24h remaining; switch to hours for the final day
    // so the countdown reads urgently in the last 24h (where the 24h-warn
    // notification also fires).
    const remainingLabel =
        daysLeft >= 1
            ? t("studio.trial_countdown_days", { days: daysLeft })
            : t("studio.trial_countdown_hours", { hours: Math.max(1, hoursLeft) });

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: theme.radius.pill,
                backgroundColor: "rgba(225,195,155,0.14)",
                borderWidth: 1,
                borderColor: "rgba(225,195,155,0.45)",
            }}
        >
            <Ionicons name="star" size={11} color="#E0C29A" />
            <Text
                className="font-label"
                style={{
                    ...theme.text.caption,
                    color: "#E0C29A",
                  }}
            >
                {t("studio.trial_countdown_label")} · {remainingLabel}
            </Text>
        </View>
    );
}
