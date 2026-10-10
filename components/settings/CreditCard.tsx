import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";
import { useCountUp } from "@/components/settings/settingsMotion";

const U = theme.umber;
const V = theme.v2;

/**
 * The wallet, as one card (redesign v3, 2026-10-10).
 *
 * <p>"CREDITS" kicker over the balance in big gold serif; the line on the right
 * says how it refills on FREE ("refills daily") and just "credits" on a paid
 * plan. The v2 progress bar is gone — the mockup has none, and it only ever
 * meant something on FREE.
 *
 * <p>Buttons split 2 : 1. 🔴 Which button does what is UNCHANGED from v2: a
 * subscriber was once sold the thing they already pay for ("500 credits · Get
 * Pro"), so on a paid plan the filled button is the useful one — more credits —
 * and the outlined one is the door to the plan itself.
 *
 * | plan | gold (2/3)            | outlined (1/3)          |
 * |------|-----------------------|-------------------------|
 * | FREE | Get Pro → paywall     | Credits → credit packs  |
 * | paid | Buy Credits → packs   | Manage Plan → paywall   |
 */
export function CreditCard({
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
    const shown = useCountUp(balance);

    const primaryLabel = t(isFree ? "profile.get_pro" : "profile.buy_credits");
    const secondaryLabel = t(isFree ? "profile.credits_label" : "profile.manage_plan");
    const sideLine = isFree
        ? t("profile.refills_daily", { defaultValue: "refills daily" })
        : t("profile.credits_line", { count: balance });

    return (
        <View
            style={{
                borderRadius: 18,
                padding: 18,
                gap: 14,
                backgroundColor: U.surface,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: U.accent,
                shadowColor: U.accent,
                shadowOpacity: 0.1,
                shadowRadius: 11,
                shadowOffset: { width: 0, height: 4 },
            }}
        >
            <View
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}
                accessible
                accessibilityLabel={`${t("profile.credits_label")}: ${balance}, ${sideLine}`}
            >
                <View style={{ gap: 2 }}>
                    <Text style={{ ...V.kicker, color: U.inkMuted }}>{t("profile.credits_label")}</Text>
                    <Text
                        style={{
                            fontFamily: "NotoSerif",
                            fontSize: 44,
                            lineHeight: 48,
                            color: U.accentBright,
                            fontVariant: ["tabular-nums"],
                        }}
                    >
                        {shown}
                    </Text>
                </View>
                <Text
                    style={{ ...V.rowQuiet, color: theme.color.onSurfaceVariant, textAlign: "right", flexShrink: 1, marginBottom: 6 }}
                    numberOfLines={2}
                >
                    {sideLine}
                </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                    onPress={isFree ? onGetPro : onBuyCredits}
                    accessibilityRole="button"
                    accessibilityLabel={primaryLabel}
                    style={{
                        flex: 2,
                        height: 48,
                        borderRadius: 16,
                        backgroundColor: U.buttonFill,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 8,
                    }}
                >
                    <Text
                        style={{ ...V.button, fontSize: 13, lineHeight: 18, color: U.buttonInk }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {primaryLabel}
                    </Text>
                </Pressable>
                <Pressable
                    onPress={isFree ? onBuyCredits : onManagePlan}
                    accessibilityRole="button"
                    accessibilityLabel={secondaryLabel}
                    style={{
                        flex: 1,
                        height: 48,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: U.lineNeutral,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 6,
                    }}
                >
                    <Text
                        style={{ ...V.row, color: U.ink }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {secondaryLabel}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
