import { useEffect, useRef, useState } from "react";
import {
    Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";
import { recordCancellationFeedback, type CancelReason } from "@/services/telemetry";
import { useCancelSurveyStore } from "@/stores/cancelSurveyStore";
import { track } from "@/services/analytics";

/**
 * "Why are you leaving?" — one tap, always skippable (2.0.0, V189).
 *
 * <p>Same shape as the acquisition sheet on purpose: a card from the bottom,
 * a grabber, one question. The difference is that these answers are sentences
 * — "the results weren't what I wanted" does not survive being an icon.
 *
 * <p>The sheet never stands between a person and their cancellation. Skipping
 * is one tap, it is recorded as SKIPPED (so the response rate can be read),
 * and for the MANAGE trigger Apple's page opens whichever way the sheet closes.
 */
const REASONS: { key: Exclude<CancelReason, "SKIPPED">; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "PRICE", icon: "pricetag-outline" },
    { key: "RESULTS", icon: "image-outline" },
    { key: "NOT_ENOUGH_CREDITS", icon: "flash-outline" },
    { key: "ONE_TIME", icon: "checkmark-done-outline" },
    { key: "HOW_TO_USE", icon: "help-circle-outline" },
    { key: "TECHNICAL", icon: "warning-outline" },
    { key: "OTHER", icon: "chatbubble-ellipses-outline" },
];

/** Answers with an honest, useful reply; the rest just get a thank-you. */
const REPLIES: Partial<Record<CancelReason, string>> = {
    PRICE: "cancel_survey.reply_PRICE",
    RESULTS: "cancel_survey.reply_RESULTS",
    HOW_TO_USE: "cancel_survey.reply_HOW_TO_USE",
};

export function CancelReasonSheet() {
    const { t } = useTranslation();
    const visible = useCancelSurveyStore((s) => s.visible);
    const trigger = useCancelSurveyStore((s) => s.trigger);
    const planCode = useCancelSurveyStore((s) => s.planCode);
    const close = useCancelSurveyStore((s) => s.close);

    const [chosen, setChosen] = useState<CancelReason | null>(null);
    const [writing, setWriting] = useState(false);
    const [detail, setDetail] = useState("");
    const [reply, setReply] = useState<string | null>(null);
    const rise = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;
        track("cancel_survey_shown", { trigger });
        setChosen(null);
        setWriting(false);
        setDetail("");
        setReply(null);
        rise.setValue(0);
        Animated.timing(rise, {
            toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }).start();
    }, [visible]);

    const send = (reason: CancelReason, text?: string) => {
        recordCancellationFeedback(reason, { trigger, planCode, detail: text ?? null }).catch(() => {});
    };

    const answer = (reason: Exclude<CancelReason, "SKIPPED">) => {
        if (chosen) return;
        if (reason === "OTHER" && !writing) {
            setWriting(true);
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setChosen(reason);
        send(reason, reason === "OTHER" ? detail : undefined);
        setReply(t(REPLIES[reason] ?? "cancel_survey.thanks"));
    };

    const skip = () => {
        if (!chosen) send("SKIPPED");
        close();
    };

    const done = () => close();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={skip}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1, backgroundColor: "rgba(8,7,6,0.86)", justifyContent: "flex-end" }}
            >
                <Animated.View
                    style={{
                        opacity: rise,
                        transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
                    }}
                >
                    <LinearGradient
                        colors={["#232120", "#181716"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{
                            marginHorizontal: 14, marginBottom: 28, borderRadius: 30,
                            borderWidth: 1, borderColor: "rgba(225,195,155,0.24)",
                            paddingHorizontal: 18, paddingTop: 22, paddingBottom: 12,
                        }}
                    >
                        <View style={{
                            alignSelf: "center", width: 38, height: 4, borderRadius: 2,
                            backgroundColor: "rgba(225,195,155,0.28)", marginBottom: 18,
                        }} />

                        {reply ? (
                            <View style={{ alignItems: "center", paddingBottom: 6 }}>
                                <Ionicons name="checkmark-circle" size={34} color="#DDB477" />
                                <Text style={{
                                    ...theme.text.title, fontSize: 18, lineHeight: 25, color: "#F4EDE4",
                                    textAlign: "center", marginTop: 12,
                                }}>
                                    {t("cancel_survey.thanks_title")}
                                </Text>
                                <Text style={{
                                    fontFamily: "Inter", fontSize: 14.5, lineHeight: 21, color: "#CFC0AC",
                                    textAlign: "center", marginTop: 8, paddingHorizontal: 6,
                                }}>
                                    {reply}
                                </Text>
                                <Pressable
                                    onPress={done}
                                    accessibilityRole="button"
                                    style={{
                                        marginTop: 20, height: 50, alignSelf: "stretch", borderRadius: 14,
                                        backgroundColor: "rgba(225,195,155,0.14)", borderWidth: 1,
                                        borderColor: "rgba(225,195,155,0.4)", alignItems: "center", justifyContent: "center",
                                    }}
                                >
                                    <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 15, color: "#F4EDE4" }}>
                                        {t(trigger === "MANAGE" ? "cancel_survey.continue_manage" : "cancel_survey.close")}
                                    </Text>
                                </Pressable>
                            </View>
                        ) : (
                            <>
                                <Text style={{
                                    ...theme.text.title, fontSize: 19, lineHeight: 26, color: "#F4EDE4", textAlign: "center",
                                }}>
                                    {t(trigger === "MANAGE" ? "cancel_survey.title_manage" : "cancel_survey.title_detected")}
                                </Text>
                                <Text style={{
                                    fontFamily: "Inter", fontSize: 13.5, lineHeight: 19, color: "#A99A87",
                                    textAlign: "center", marginTop: 8, marginBottom: 16, paddingHorizontal: 8,
                                }}>
                                    {t("cancel_survey.body")}
                                </Text>

                                {writing ? (
                                    <View style={{ gap: 10 }}>
                                        <TextInput
                                            value={detail}
                                            onChangeText={setDetail}
                                            placeholder={t("cancel_survey.other_placeholder")}
                                            placeholderTextColor="#7E7263"
                                            maxLength={300}
                                            multiline
                                            autoFocus
                                            accessibilityLabel={t("cancel_survey.other_placeholder")}
                                            style={{
                                                minHeight: 88, maxHeight: 140, borderRadius: 14, borderWidth: 1,
                                                borderColor: "rgba(225,195,155,0.28)", backgroundColor: "rgba(255,255,255,0.045)",
                                                color: "#F4EDE4", fontFamily: "Inter", fontSize: 15,
                                                paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, textAlignVertical: "top",
                                            }}
                                        />
                                        <Pressable
                                            onPress={() => answer("OTHER")}
                                            accessibilityRole="button"
                                            style={{
                                                height: 50, borderRadius: 14, backgroundColor: "#DDB477",
                                                alignItems: "center", justifyContent: "center",
                                            }}
                                        >
                                            <Text style={{ fontFamily: "Inter-Bold", fontSize: 15, color: "#1A1511" }}>
                                                {t("cancel_survey.send")}
                                            </Text>
                                        </Pressable>
                                    </View>
                                ) : (
                                    <View style={{ gap: 8 }}>
                                        {REASONS.map((r) => (
                                            <Pressable
                                                key={r.key}
                                                onPress={() => answer(r.key)}
                                                accessibilityRole="button"
                                                style={{
                                                    flexDirection: "row", alignItems: "center", gap: 12,
                                                    minHeight: 48, paddingHorizontal: 14, borderRadius: 14,
                                                    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
                                                    backgroundColor: "rgba(255,255,255,0.045)",
                                                }}
                                            >
                                                <Ionicons name={r.icon} size={19} color="#CFC0AC" />
                                                <Text style={{ flex: 1, fontFamily: "Inter-Medium", fontSize: 14.5, color: "#F4EDE4" }}>
                                                    {t(`cancel_survey.reason_${r.key}`)}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}

                                <Pressable onPress={skip} hitSlop={12} accessibilityRole="button"
                                    style={{ paddingTop: 18, paddingBottom: 8, alignItems: "center" }}>
                                    <Text style={{ ...theme.text.label, color: "#A99A87" }}>
                                        {t(trigger === "MANAGE" ? "cancel_survey.skip_manage" : "cancel_survey.skip")}
                                    </Text>
                                </Pressable>
                            </>
                        )}
                    </LinearGradient>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
