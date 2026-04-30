import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { theme } from "@/config/theme";

interface SubscriptionDisclosureProps {
    /** Display name of the plan being subscribed to (e.g. "PRO"). */
    planName: string;
    /** Localized price string for the plan period (e.g. "$19.99 / month"). */
    pricePerPeriod: string;
}

/**
 * Apple App Store guideline 3.1.2 disclosure for the paywall — the legally
 * required block that shows immediately before the user commits to an
 * auto-renewing subscription. Apple Reviewer rejects builds that lack any
 * of these elements:
 *
 * <ul>
 *   <li>Subscription title + length</li>
 *   <li>Price per period</li>
 *   <li>"Auto-renews unless cancelled at least 24 hours before period end"</li>
 *   <li>"Manage / cancel in iOS Settings → Apple ID → Subscriptions"</li>
 *   <li>Functional Privacy Policy + Terms of Use links</li>
 * </ul>
 *
 * Wired into the paywall confirm screen between the primary CTA and the
 * secondary "Return" button so it sits in the user's eye line at decision
 * time, not buried in the footer.
 */
export function SubscriptionDisclosure({ planName, pricePerPeriod }: SubscriptionDisclosureProps) {
    const { t } = useTranslation();

    return (
        <View
            style={{
                marginTop: 24,
                paddingVertical: 16,
                paddingHorizontal: 4,
                gap: 8,
            }}
        >
            {/* Title + period — Apple wants subscription name + length explicit */}
            <Text
                style={{
                    fontFamily: "Inter-SemiBold",
                    fontSize: 12,
                    letterSpacing: 0.4,
                    color: theme.color.onSurface,
                    textAlign: "center",
                }}
            >
                {t("plans.disclosure_title", { plan: planName })}
            </Text>
            <Text
                style={{
                    fontFamily: "Inter",
                    fontSize: 11,
                    lineHeight: 16,
                    color: theme.color.onSurfaceVariant,
                    textAlign: "center",
                }}
            >
                {t("plans.disclosure_period", { price: pricePerPeriod })}
            </Text>

            {/* Auto-renewal + manage — Apple-required statements */}
            <Text
                style={{
                    fontFamily: "Inter",
                    fontSize: 11,
                    lineHeight: 16,
                    color: theme.color.onSurfaceVariant,
                    textAlign: "center",
                    marginTop: 4,
                }}
            >
                {t("plans.disclosure_auto_renew")}
            </Text>
            <Text
                style={{
                    fontFamily: "Inter",
                    fontSize: 11,
                    lineHeight: 16,
                    color: theme.color.onSurfaceVariant,
                    textAlign: "center",
                }}
            >
                {t("plans.disclosure_manage")}
            </Text>

            {/* Privacy + Terms links — must be functional, not just text */}
            <Text
                style={{
                    fontFamily: "Inter",
                    fontSize: 11,
                    lineHeight: 16,
                    color: theme.color.onSurfaceVariant,
                    opacity: 0.85,
                    textAlign: "center",
                    marginTop: 4,
                }}
            >
                {t("plans.disclosure_agreement_prefix")}{" "}
                <Text
                    onPress={() => router.push("/settings/terms")}
                    style={{
                        color: theme.color.goldMidday,
                        textDecorationLine: "underline",
                    }}
                >
                    {t("plans.disclosure_terms_link")}
                </Text>
                {" "}{t("plans.disclosure_and")}{" "}
                <Text
                    onPress={() => router.push("/settings/privacy")}
                    style={{
                        color: theme.color.goldMidday,
                        textDecorationLine: "underline",
                    }}
                >
                    {t("plans.disclosure_privacy_link")}
                </Text>
                .
            </Text>
        </View>
    );
}
