import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "@/config/theme";
import { BottomSheet } from "./BottomSheet";

const U = theme.umber;
const V = theme.v2;

/**
 * The processing disclosure — moved, not shortened.
 *
 * <p>🔴 <b>Legally required (GDPR, EU market) and it stays in full.</b> What
 * changed is only when the user meets it: in v1 it was a full-screen wall
 * that appeared the instant a photo was picked — the highest-drop-off point
 * in the funnel, before the product had shown it worked. Here it is a
 * permanently visible "Photo & privacy" button sitting next to Generate, so
 * the statement is standing and available rather than interstitial.
 *
 * <p>🔴 <b>Confirm this placement with the DPO before shipping.</b> The intent
 * is that consent is still informed and still given before the first upload;
 * whether a standing statement satisfies that where an interstitial did is a
 * legal call, not a design one.
 *
 * <p>Three labelled paragraphs — Sent / To / Kept — because the three
 * questions a reader actually has are what leaves, who gets it, and what is
 * retained. The v1 text answered all three in prose and none of them
 * findably.
 */
export function ConsentSheet({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();
    const paragraphs = [
        { lead: t("consent.sent_lead"), body: t("consent.sent_body") },
        { lead: t("consent.to_lead"), body: t("consent.to_body") },
        { lead: t("consent.kept_lead"), body: t("consent.kept_body") },
    ];

    return (
        <BottomSheet heightRatio={0.62} onClose={onClose}>
            <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 26 }}>
                <Text style={{ ...V.displayS, color: U.ink, marginBottom: 14 }}>
                    {t("consent.title")}
                </Text>

                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {paragraphs.map((p) => (
                        <Text
                            key={p.lead}
                            style={{ fontFamily: "Archivo-400", fontSize: 13, lineHeight: 19.5,
                                     color: U.inkMuted, marginBottom: 14 }}
                        >
                            <Text style={{ fontFamily: "Archivo-700", color: U.ink }}>{p.lead} </Text>
                            {p.body}
                        </Text>
                    ))}
                    <Pressable
                        onPress={() => Linking.openURL("https://roomframeai.com/privacy.html")}
                        accessibilityRole="link"
                    >
                        <Text style={{ fontFamily: "Archivo-600", fontSize: 13, color: U.accent,
                                       textDecorationLine: "underline" }}>
                            {t("consent.privacy_policy")}
                        </Text>
                    </Pressable>
                </ScrollView>

                <Pressable
                    onPress={onClose}
                    accessibilityRole="button"
                    style={{
                        height: 56,
                        borderRadius: theme.v2Layout.radius.button,
                        backgroundColor: U.buttonFill,
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 16,
                    }}
                >
                    <Text style={{ ...V.button, color: U.buttonInk }}>{t("consent.got_it")}</Text>
                </Pressable>
            </View>
        </BottomSheet>
    );
}
