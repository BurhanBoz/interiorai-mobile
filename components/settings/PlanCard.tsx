import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";
import { useCountUp } from "@/components/settings/settingsMotion";
import { ChevronIcon } from "@/components/settings/SettingsIcons";
import { listJobs } from "@/services/jobs";

const U = theme.umber;
const V = theme.v2;

/**
 * The plan card (3.0.0, owner 20 Oct 2026) — the identity and the wallet as ONE card, with
 * the user's own last design faint behind it. Top-left: initials, name, plan. Bottom: the
 * balance in big serif with "refills daily" on FREE, and the two doors the v3 CreditCard
 * had, unchanged in what they do:
 *
 * | plan | gold                  | outlined                |
 * |------|-----------------------|-------------------------|
 * | FREE | Get Pro → paywall     | Credits → credit packs  |
 * | paid | Buy Credits → packs   | Manage Plan → paywall   |
 *
 * The identity block opens the account screen (name, email, billing, terms, deletion —
 * 🔴 deletion staying reachable is App Store 5.1.1(v)). No design yet → a plain surface.
 */
export function PlanCard({
    initials, displayName, planLabel, isFree, balance, onAccount, onGetPro, onBuyCredits, onManagePlan,
}: {
    initials: string;
    displayName: string;
    planLabel: string;
    isFree: boolean;
    balance: number;
    onAccount: () => void;
    onGetPro: () => void;
    onBuyCredits: () => void;
    onManagePlan: () => void;
}) {
    const { t } = useTranslation();
    const shown = useCountUp(balance);
    const [bg, setBg] = useState<string | null>(null);
    useEffect(() => {
        let alive = true;
        listJobs(0, 10).then((page) => {
            const done = page.content.find((j) => j.status === "COMPLETED" && j.outputs?.length);
            if (alive && done) setBg(done.outputs[0].url);
        }).catch(() => {});
        return () => { alive = false; };
    }, []);

    const primaryLabel = t(isFree ? "profile.get_pro" : "profile.buy_credits");
    const secondaryLabel = t(isFree ? "profile.credits_label" : "profile.manage_plan");
    const sideLine = isFree ? t("profile.refills_daily", { defaultValue: "refills daily" }) : "";

    return (
        <View style={{ borderRadius: 18, overflow: "hidden", backgroundColor: U.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: U.accent }}>
            {bg ? (
                <>
                    <Image source={{ uri: bg }} style={{ ...StyleSheet.absoluteFillObject, opacity: 0.55 }} contentFit="cover" transition={300} />
                    <LinearGradient
                        pointerEvents="none"
                        colors={["rgba(44,38,31,0.10)", "rgba(44,38,31,0.90)"]}
                        style={StyleSheet.absoluteFill}
                    />
                </>
            ) : null}

            <Pressable
                onPress={onAccount}
                accessibilityRole="button"
                accessibilityLabel={`${displayName}, ${planLabel}`}
                accessibilityHint={t("profile.account_and_data")}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 6 }}
            >
                <View style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: U.accent, backgroundColor: "rgba(34,28,23,0.5)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: "NotoSerif", fontSize: 16, color: U.accentBright }}>{initials}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                    {/* 🔴 The name and the plan. NOT the internal address. */}
                    <Text style={{ fontFamily: "NotoSerif", fontSize: 19, lineHeight: 24, color: U.ink }} numberOfLines={1}>{displayName}</Text>
                    <Text style={{ fontFamily: "Inter-Bold", fontSize: 11, letterSpacing: 1.6, color: isFree ? U.inkMuted : U.accentBright }} numberOfLines={1}>
                        {planLabel.toLocaleUpperCase()}
                    </Text>
                </View>
                <ChevronIcon color={U.inkMuted} size={16} />
            </Pressable>

            <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
                <View
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}
                    accessible
                    accessibilityLabel={`${t("profile.credits_label")}: ${balance}, ${sideLine}`}
                >
                    <View>
                        <Text style={{ ...V.kicker, color: U.inkMuted }}>{t("profile.credits_label")}</Text>
                        <Text style={{ fontFamily: "NotoSerif", fontSize: 40, lineHeight: 44, color: U.accentBright, fontVariant: ["tabular-nums"] }}>{shown}</Text>
                    </View>
                    {sideLine ? (
                        <Text style={{ ...V.rowQuiet, color: theme.color.onSurfaceVariant, textAlign: "right", flexShrink: 1, marginBottom: 6 }} numberOfLines={2}>
                            {sideLine}
                        </Text>
                    ) : null}
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                        onPress={isFree ? onGetPro : onBuyCredits}
                        accessibilityRole="button"
                        accessibilityLabel={primaryLabel}
                        style={{ flex: 2, height: 46, borderRadius: 14, backgroundColor: U.buttonFill, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }}
                    >
                        <Text style={{ ...V.button, fontSize: 13, lineHeight: 18, color: U.buttonInk }} numberOfLines={1} adjustsFontSizeToFit>{primaryLabel}</Text>
                    </Pressable>
                    <Pressable
                        onPress={isFree ? onBuyCredits : onManagePlan}
                        accessibilityRole="button"
                        accessibilityLabel={secondaryLabel}
                        style={{ flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: "rgba(246,241,231,0.22)", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}
                    >
                        <Text style={{ ...V.row, color: U.ink }} numberOfLines={1} adjustsFontSizeToFit>{secondaryLabel}</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
