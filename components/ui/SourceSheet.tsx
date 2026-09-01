import { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import * as Haptics from "expo-haptics";
import { theme } from "@/config/theme";
import { recordAcquisitionSource, type AcquisitionSource } from "@/services/telemetry";
import { isFlagSet, setFlag } from "@/utils/oneShotFlag";

/**
 * Asked once per USER, not once per device.
 *
 * <p>The first version keyed on the device alone. The flag lives in the
 * Keychain — chosen so a reinstall would not re-ask a returning user — but the
 * Keychain belongs to the bundle id, not to the account, so it also silenced
 * the question for the NEXT person on that device. Guests are the common case
 * here: logging out mints a brand new user id, and that person would never have
 * been asked at all. It also made the sheet untestable, since a skip on one
 * build muted it on every later one.
 *
 * <p>Keying by user id keeps the property that was wanted (a reinstall does not
 * re-ask the same person) and drops the one that was accidental. The same user
 * on a NEW device is asked again; the backend's per-user unique key absorbs the
 * duplicate, so the cost of that is one request, not a bad row.
 */
const flagFor = (userId: string) => `acquisition_source_asked:${userId}`;

/** Let the render land before asking anything. */
const DELAY_MS = 2200;

type Option = {
    key: AcquisitionSource;
    labelKey: string;
    icon: keyof typeof Ionicons.glyphMap;
};

/**
 * Order matters: the grid is three per row, so the first three share a row and
 * the last three share the next. Instagram, TikTok and the App Store sit
 * together because they are the three channels we can actually act on — the
 * ones a decision about where to spend effort would turn on.
 *
 * The label lives on for accessibility only. Sighted users get the icon; a
 * screen reader still hears "Instagram" rather than "button".
 */
const OPTIONS: Option[] = [
    { key: "APP_STORE_SEARCH", labelKey: "source.app_store", icon: "storefront" },
    { key: "INSTAGRAM", labelKey: "source.instagram", icon: "logo-instagram" },
    { key: "TIKTOK", labelKey: "source.tiktok", icon: "logo-tiktok" },
    { key: "FRIEND", labelKey: "source.friend", icon: "chatbubble-ellipses" },
    { key: "WEB_SEARCH", labelKey: "source.web", icon: "globe-outline" },
    { key: "OTHER", labelKey: "source.other", icon: "ellipsis-horizontal" },
];

/** Three per row — the grid derives from this, nothing is measured by hand. */
const PER_ROW = 3;

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
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const [visible, setVisible] = useState(false);
    const [chosen, setChosen] = useState<AcquisitionSource | null>(null);
    const rise = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // No identity yet means no flag to check and nobody to attribute the
        // answer to — wait rather than ask into the void.
        if (!enabled || !userId) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        (async () => {
            if (await isFlagSet(flagFor(userId))) return;
            if (cancelled) return;
            timer = setTimeout(() => {
                if (!cancelled) setVisible(true);
            }, DELAY_MS);
        })();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [enabled, userId]);

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
        if (userId) setFlag(flagFor(userId)).catch(() => {});
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
                        {/* No subtitle. The question is one line long and the
                            icons are self-evident; a sentence explaining why we
                            ask turns a two-second tap into something to read. */}
                        <View style={{ height: 22 }} />

                        {/* Icon-only grid, PER_ROW across. Chunked from OPTIONS
                            rather than hand-laid, so changing PER_ROW or adding a
                            channel needs no layout edit — and each row is padded to
                            full width with inert spacers so a final short row keeps
                            the same column positions as the one above it instead of
                            centring itself and looking crooked.

                            Labels are gone by design: six words under six icons
                            made a two-second question look like a form, and the
                            translated ones were the longest thing on the sheet.
                            They survive as accessibilityLabel, so nothing is lost
                            to a screen reader. */}
                        <View style={{ gap: 12 }}>
                            {Array.from(
                                { length: Math.ceil(OPTIONS.length / PER_ROW) },
                                (_, row) => OPTIONS.slice(row * PER_ROW, row * PER_ROW + PER_ROW),
                            ).map((rowOptions, rowIndex) => (
                                <View key={rowIndex} style={{ flexDirection: "row", gap: 12 }}>
                                    {rowOptions.map((opt) => {
                                        const active = chosen === opt.key;
                                        return (
                                            <Pressable
                                                key={opt.key}
                                                onPress={() => close(opt.key)}
                                                disabled={chosen !== null}
                                                accessibilityRole="button"
                                                accessibilityLabel={t(opt.labelKey)}
                                                style={({ pressed }) => ({
                                                    flex: 1,
                                                    aspectRatio: 1.15,
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    borderRadius: 20,
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
                                                    size={26}
                                                    color={active ? "#E1C39B" : "#C6B7A4"}
                                                />
                                            </Pressable>
                                        );
                                    })}
                                    {/* Pad a short last row so columns stay aligned. */}
                                    {Array.from(
                                        { length: PER_ROW - rowOptions.length },
                                        (_, i) => <View key={`pad-${i}`} style={{ flex: 1 }} />,
                                    )}
                                </View>
                            ))}
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
