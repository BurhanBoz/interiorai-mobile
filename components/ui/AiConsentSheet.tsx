import { Modal, View, Text, Pressable, Linking, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAiConsentStore } from "@/stores/aiConsentStore";
import { theme } from "@/config/theme";

const PRIVACY_URL = "https://roomframeai.com/privacy";

/**
 * AI-processing consent sheet (App Store Guideline 5.1.2(i)).
 *
 * <p>Mounted once at the root layout; visibility is driven by
 * {@link useAiConsentStore}. Appears right before the FIRST photo pick —
 * discloses exactly what is sent (room photo, mask/reference, design
 * choices) and to whom (Replicate, Anthropic), links the Privacy Policy,
 * and blocks the upload until the user explicitly agrees. Declining just
 * dismisses — the flow that asked receives {@code false} and stops.
 */
export function AiConsentSheet() {
    const { t } = useTranslation();
    const visible = useAiConsentStore((s) => s.visible);
    const accept = useAiConsentStore((s) => s.accept);
    const decline = useAiConsentStore((s) => s.decline);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={decline}
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor: "rgba(8,7,6,0.82)",
                    justifyContent: "flex-end",
                }}
            >
                <View
                    style={{
                        margin: 16,
                        marginBottom: 32,
                        borderRadius: 28,
                        backgroundColor: "#1C1B1A",
                        borderWidth: 1,
                        borderColor: "rgba(225,195,155,0.35)",
                        paddingHorizontal: theme.space.gutter,
                        paddingTop: 26,
                        paddingBottom: 22,
                        maxHeight: "86%",
                    }}
                >
                    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                        {/* Icon + title */}
                        <View
                            style={{
                                width: 46,
                                height: 46,
                                borderRadius: theme.radius.lg,
                                backgroundColor: "rgba(225,195,155,0.1)",
                                borderWidth: 1,
                                borderColor: "rgba(225,195,155,0.35)",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: 16,
                            }}
                        >
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={22}
                                color={theme.color.goldMidday}
                            />
                        </View>
                        <Text
                            style={{
                                ...theme.text.headline,
                                color: theme.color.onSurface,
                                marginBottom: 12,
                              }}
                        >
                            {t("ai_consent.title")}
                        </Text>

                        <Text
                            style={{
                                ...theme.text.body,
                                color: "#C9BFB4",
                                marginBottom: 12,
                              }}
                        >
                            {t("ai_consent.body_what")}
                        </Text>
                        <Text
                            style={{
                                ...theme.text.body,
                                color: "#C9BFB4",
                                marginBottom: 12,
                              }}
                        >
                            {t("ai_consent.body_who")}
                        </Text>
                        <Text
                            style={{
                                ...theme.text.body,
                                color: "#C9BFB4",
                                marginBottom: 14,
                              }}
                        >
                            {t("ai_consent.body_privacy")}
                        </Text>

                        <Pressable
                            onPress={() => Linking.openURL(PRIVACY_URL)}
                            hitSlop={8}
                            style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 22 }}
                        >
                            <Text
                                style={{
                                    ...theme.text.subtitle,
                                    color: theme.color.goldMidday,
                                    textDecorationLine: "underline",
                                  }}
                            >
                                {t("ai_consent.privacy_link")}
                            </Text>
                            <Ionicons
                                name="open-outline"
                                size={13}
                                color={theme.color.goldMidday}
                            />
                        </Pressable>

                        {/* Accept — gold gradient, unmistakably the primary action */}
                        <Pressable onPress={accept} accessibilityRole="button">
                            <LinearGradient
                                colors={theme.gradient.primary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                    height: 50,
                                    borderRadius: theme.radius.md,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Text
                                    style={{
                                        ...theme.text.subtitle,
                                        color: theme.color.onGold,
                                      }}
                                >
                                    {t("ai_consent.accept")}
                                </Text>
                            </LinearGradient>
                        </Pressable>

                        <Pressable
                            onPress={decline}
                            accessibilityRole="button"
                            style={{
                                height: 46,
                                marginTop: 10,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Text
                                style={{
                                    ...theme.text.body,
                                    color: "#9A9089",
                                  }}
                            >
                                {t("ai_consent.decline")}
                            </Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
