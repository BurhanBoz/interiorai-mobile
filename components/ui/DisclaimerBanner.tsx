import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config/theme";

interface DisclaimerBannerProps {
    text: string;
}

/**
 * In-flow notice card surfacing AI-content disclaimers (App Store 1.1.6).
 * Static and unobtrusive — informational amber, not warning red — so it sits
 * naturally inside review-style ScrollViews without competing with the
 * primary CTA. Caller passes the localized copy.
 */
export function DisclaimerBanner({ text }: DisclaimerBannerProps) {
    return (
        <View
            style={{
                flexDirection: "row",
                gap: 10,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: "rgba(214, 169, 92, 0.10)",
                borderWidth: 1,
                borderColor: "rgba(214, 169, 92, 0.28)",
            }}
        >
            <Ionicons
                name="information-circle-outline"
                size={theme.iconSize.sm}
                color="#D6A95C"
                style={{ marginTop: 1 }}
            />
            <Text
                style={{
                    flex: 1,
                    fontFamily: "Inter",
                    fontSize: 12,
                    lineHeight: 17,
                    letterSpacing: 0.1,
                    color: "#D6A95C",
                }}
            >
                {text}
            </Text>
        </View>
    );
}
