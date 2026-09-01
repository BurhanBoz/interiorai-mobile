import { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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

type Option = {
    key: AcquisitionSource;
    labelKey: string;
    icon: keyof typeof Ionicons.glyphMap;
};

const OPTIONS: Option[] = [
    { key: "APP_STORE_SEARCH", labelKey: "source.app_store", icon: "search" },
    { key: "INSTAGRAM", labelKey: "source.instagram", icon: "logo-instagram" },
    { key: "TIKTOK", labelKey: "source.tiktok", icon: "logo-tiktok" },
    { key: "FRIEND", labelKey: "source.friend", icon: "chatbubble-ellipses" },
    { key: "WEB_SEARCH", labelKey: "source.web", icon: "globe-outline" },
    { key: "OTHER", labelKey: "source.other", icon: "sparkles-outline" },
];

/**
 * "How did you hear about us?" — one tap, once per user.
 *
 * <p><b>Why it exists.</b> Apple resolves per-user attribution for Search Ads
 * and nothing else. The site, Instagram, a friend's recommendation — each
 * reaches App Store Connect as a count with no users attached, so a channel can
 * look like it delivered installs while we stay unable to say whether those
 * people generated anything, came back, or paid.
 *
 * <p><b>Why after the first render.</b> The first screen already carries the
 * paywall; a second ask there would be charged against activation, the number
 * this release exists to move. Asked once the user has seen what the app does,
 * the question reads as curiosity rather than a toll.
 *
 * <p><b>Layout.</b> Two columns of cards rather than a list of rows. Six full
 * width rows made the sheet as tall as the screen for a question worth two
 * seconds, and the grid keeps every option on one glance. Each card sizes to
 * the row, so a long translation (German, Arabic) wraps inside its own card
 * instead of pushing the layout — nothing here is measured in characters.
 */
export function SourceSheet({ enabled }: { enabled: boolean }) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [chosen, setChosen] = useState<AcquisitionSource | null>(null);
    const rise = useRef(new Animated.Value(0)).current;

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

    useEffect(() => {
        if (!visible) return;
        rise.setValue(0);
        Animated.timing(rise, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [visible]);

    // Marked seen on the way out, whichever exit was taken. Answering and
    // dismissing are both final: re-asking someone who skipped is the fastest
    // way to turn a harmless question into an irritation.
    const close = (answer?: AcquisitionSource) => {
        setFlag(FLAG).catch(() => {});
        if (answer) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            recordAcquisitionSource(answer).catch(() => {});
            // Hold the selected state briefly so the tap is acknowledged before
            // the sheet leaves — a panel that vanishes on touch reads as a
            // mis-tap even when it worked.
            setChosen(answer);
            setTimeout(() => {
                setVisible(false);
                setChosen(null);
            }, 420);
            return;
        }
        setVisible(false);
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
                    backgroundColor: "rgba(8,7,6,0.86)",
                    justifyContent: "flex-end",
                }}
            >
                <Animated.View
                    style={{
                        opacity: rise,
                        transform: [
                            {
                                translateY: rise.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [28, 0],
                                }),
                            },
                        ],
                    }}
                >
                    <LinearGradient
                        colors={["#232120", "#181716"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{
                            marginHorizontal: 14,
                            marginBottom: 28,
                            borderRadius: 30,
                            borderWidth: 1,
                            borderColor: "rgba(225,195,155,0.24)",
                            paddingHorizontal: 18,
                            paddingTop: 24,
                            paddingBottom: 10,
                        }}
                    >
                        {/* Grabber — signals "this is dismissible" before the
                            user reads a word of it. */}
                        <View
                            style={{
                                alignSelf: "center",
                                width: 38,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: "rgba(225,195,155,0.28)",
                                marginBottom: 20,
                            }}
                        />

                        <Text
                            style={{
                                ...theme.text.title,
                                fontSize: 20,
                                lineHeight: 27,
                                color: "#F4EDE4",
                                textAlign: "center",
                            }}
                        >
                            {t("source.title")}
                        </Text>
                        <Text
                            style={{
                                ...theme.text.body,
                                color: "#9A9089",
                                textAlign: "center",
                                marginTop: 8,
                                marginBottom: 22,
                                paddingHorizontal: 8,
                            }}
                        >
                            {t("source.subtitle")}
                        </Text>

                        <View
                            style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                justifyContent: "space-between",
                                rowGap: 10,
                            }}
                        >
                            {OPTIONS.map((opt) => {
                                const active = chosen === opt.key;
                                return (
                                    <Pressable
                                        key={opt.key}
                                        onPress={() => close(opt.key)}
                                        disabled={chosen !== null}
                                        style={({ pressed }) => ({
                                            // Two per row with a gutter between:
                                            // percentage, not a measured width, so
                                            // it holds on every screen size.
                                            width: "48.5%",
                                            minHeight: 92,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 9,
                                            paddingVertical: 16,
                                            paddingHorizontal: 10,
                                            borderRadius: 18,
                                            borderWidth: 1,
                                            borderColor: active
                                                ? "rgba(225,195,155,0.55)"
                                                : "rgba(255,255,255,0.07)",
                                            backgroundColor: active
                                                ? "rgba(225,195,155,0.16)"
                                                : pressed
                                                    ? "rgba(225,195,155,0.10)"
                                                    : "rgba(255,255,255,0.035)",
                                        })}
                                    >
                                        <Ionicons
                                            name={active ? "checkmark-circle" : opt.icon}
                                            size={22}
                                            color={active ? "#E1C39B" : "#C6B7A4"}
                                        />
                                        <Text
                                            numberOfLines={2}
                                            style={{
                                                ...theme.text.body,
                                                fontSize: 13,
                                                lineHeight: 17,
                                                textAlign: "center",
                                                color: active ? "#F0E4D4" : "#CFC5BA",
                                            }}
                                        >
                                            {t(opt.labelKey)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Pressable
                            onPress={() => close()}
                            disabled={chosen !== null}
                            hitSlop={14}
                            style={{ paddingVertical: 18, alignItems: "center" }}
                        >
                            <Text
                                style={{
                                    ...theme.text.body,
                                    fontSize: 13,
                                    color: "#7E756D",
                                }}
                            >
                                {t("source.skip")}
                            </Text>
                        </Pressable>
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
}
