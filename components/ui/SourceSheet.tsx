import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { theme } from "@/config/theme";
import { recordAcquisitionSource, type AcquisitionSource } from "@/services/telemetry";
import { isFlagSet, setFlag } from "@/utils/oneShotFlag";

/** Asked once per identity. Keychain-backed, so a reinstall does not re-ask. */
const FLAG = "acquisition_source_asked";

/** Let the render land before asking anything. */
const DELAY_MS = 2200;

const OPTIONS: { key: AcquisitionSource; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "APP_STORE_SEARCH", labelKey: "source.app_store", icon: "search-outline" },
    { key: "INSTAGRAM", labelKey: "source.instagram", icon: "logo-instagram" },
    { key: "TIKTOK", labelKey: "source.tiktok", icon: "musical-notes-outline" },
    { key: "FRIEND", labelKey: "source.friend", icon: "people-outline" },
    { key: "WEB_SEARCH", labelKey: "source.web", icon: "globe-outline" },
    { key: "OTHER", labelKey: "source.other", icon: "ellipsis-horizontal" },
];

/**
 * "How did you hear about us?" — one tap, once per user.
 *
 * <p><b>Why it exists.</b> Apple resolves per-user attribution for Search Ads
 * and nothing else. The site, Instagram, a friend's recommendation — each of
 * those reaches App Store Connect as a count with no users attached, so a
 * channel can look like it delivered installs while we stay unable to say
 * whether those people generated anything, came back, or paid. This is the
 * only signal that ties a channel to a person we can then follow.
 *
 * <p><b>Why here and not at launch.</b> The first screen already carries the
 * paywall. A second ask there would be charged straight against activation,
 * which is the number we are trying to move — 81 generations had produced 2
 * saves when this was written. Asked after the FIRST successful render, the
 * question costs nothing: the user has just seen what the app does, so it
 * reads as curiosity rather than a toll.
 *
 * <p>Skippable, and the flag is set either way — someone who declines has
 * answered the only way that matters and must not be asked again. The flag
 * lives in the Keychain (see {@link isFlagSet}) so it shares the lifetime of
 * the guest identity rather than the app container.
 */
export function SourceSheet({ enabled }: { enabled: boolean }) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        (async () => {
            if (await isFlagSet(FLAG)) return;
            if (cancelled) return;
            timer = setTimeout(() => {
                if (!cancelled) setVisible(true);
            }, DELAY_MS);
        })();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [enabled]);

    // Marked seen on the way out, whichever exit was taken. Answering and
    // dismissing are both final: re-asking someone who skipped is the fastest
    // way to turn a harmless question into an irritation.
    const close = (answer?: AcquisitionSource) => {
        setVisible(false);
        setFlag(FLAG).catch(() => {});
        if (answer) {
            Haptics.selectionAsync();
            recordAcquisitionSource(answer).catch(() => {});
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => close()}
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
                        paddingBottom: 18,
                    }}
                >
                    <Text
                        style={{
                            ...theme.text.title,
                            color: "#F2E9DD",
                            textAlign: "center",
                        }}
                    >
                        {t("source.title")}
                    </Text>
                    <Text
                        style={{
                            ...theme.text.caption,
                            color: "#998F84",
                            textAlign: "center",
                            marginTop: 8,
                            marginBottom: 20,
                        }}
                    >
                        {t("source.subtitle")}
                    </Text>

                    {OPTIONS.map((opt) => (
                        <Pressable
                            key={opt.key}
                            onPress={() => close(opt.key)}
                            style={({ pressed }) => ({
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 14,
                                paddingVertical: 14,
                                paddingHorizontal: 16,
                                marginBottom: 8,
                                borderRadius: theme.radius.md,
                                backgroundColor: pressed
                                    ? "rgba(225,195,155,0.14)"
                                    : "rgba(255,255,255,0.04)",
                            })}
                        >
                            <Ionicons name={opt.icon} size={20} color="#E1C39B" />
                            <Text
                                style={{
                                    ...theme.text.label,
                                    color: "#E7DDD0",
                                    flex: 1,
                                }}
                            >
                                {t(opt.labelKey)}
                            </Text>
                        </Pressable>
                    ))}

                    <Pressable
                        onPress={() => close()}
                        hitSlop={12}
                        style={{ paddingVertical: 14, alignItems: "center" }}
                    >
                        <Text style={{ ...theme.text.caption, color: "#8A8078" }}>
                            {t("source.skip")}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}
