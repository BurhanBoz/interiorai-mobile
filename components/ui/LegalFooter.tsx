import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { theme } from "@/config/theme";

/**
 * Pre-login legal disclosure footer (App Store 5.1.1(ix) + GDPR Art. 13).
 *
 * Surfaces Privacy + Terms links from the unauthenticated routes (onboarding,
 * register, login). Apple specifically wants users to be able to read these
 * BEFORE creating an account.
 */
export function LegalFooter() {
    const { t } = useTranslation();

    return (
        <View
            style={{
                // No own horizontal padding — the host screen already pads
                // (onboarding = 32pt). Double-padding shrank the text box so
                // the agreement wrapped to 3-4 lines and overran the safe
                // area on small devices. Full width → 1-2 lines, always fits.
                paddingTop: 8,
                paddingBottom: 2,
                alignItems: "center",
            }}
        >
            <Text
                style={{
                    fontFamily: "Inter",
                    fontSize: 11,
                    lineHeight: 16,
                    textAlign: "center",
                    color: theme.color.onSurfaceVariant,
                    opacity: 0.7,
                }}
            >
                {t("auth.legal_agreement")}{" "}
                <Text
                    onPress={() => router.push("/settings/terms")}
                    style={{ color: theme.color.goldMidday, textDecorationLine: "underline" }}
                >
                    {t("auth.legal_terms")}
                </Text>{" "}
                {t("auth.legal_and")}{" "}
                <Text
                    onPress={() => router.push("/settings/privacy")}
                    style={{ color: theme.color.goldMidday, textDecorationLine: "underline" }}
                >
                    {t("auth.legal_privacy")}
                </Text>
                .
            </Text>
        </View>
    );
}
