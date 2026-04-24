import { useEffect, useRef, useState } from "react";
import { View, Text, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { theme } from "@/config/theme";

/**
 * Top-of-screen banner that surfaces when the device loses connectivity.
 * Mounted once in the root layout, sits above everything.
 *
 * The banner reserves space for the status bar via safe-area insets so the
 * icon + copy never clip under the notch or time/battery glyphs. On mount
 * the banner is parked completely off-screen (translateY = -(insets.top + 64))
 * and slides down to 0 — the whole pill enters cleanly, not half-visible.
 *
 * Why this matters: the Studio wizard spawns Replicate jobs over HTTPS and
 * polls for results. Without a signal the user taps Generate, gets no
 * feedback, and assumes the app is broken. The banner gives them a clear,
 * non-blocking reason for the silence — in premium, reassuring copy.
 */
export function OfflineBanner() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [isOffline, setIsOffline] = useState(false);

    // Total height the banner needs to translate: status bar + visual height.
    // 64 covers the pill itself plus a breathing cushion so shadows don't
    // leak into view while parked.
    const bannerHeight = insets.top + 64;
    const translateY = useRef(new Animated.Value(-bannerHeight)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            // NetInfo reports `isInternetReachable === null` briefly during
            // transitions — treat that as online to avoid false positives.
            const online =
                state.isConnected !== false &&
                state.isInternetReachable !== false;
            setIsOffline(!online);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: isOffline ? 0 : -bannerHeight,
                duration: theme.motion.duration.base,
                easing: isOffline
                    ? theme.motion.easing.enter
                    : theme.motion.easing.exit,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: isOffline ? 1 : 0,
                duration: theme.motion.duration.base,
                easing: theme.motion.easing.standard,
                useNativeDriver: true,
            }),
        ]).start();
    }, [isOffline, bannerHeight, translateY, opacity]);

    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                transform: [{ translateY }],
                opacity,
                zIndex: 9999,
                // Reserve the status-bar area so the pill that follows
                // sits fully below the system UI on every device.
                paddingTop: insets.top + 8,
                paddingHorizontal: 16,
                paddingBottom: 12,
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 14,
                    // Warm, desaturated crimson — intrudes less than iOS red
                    backgroundColor: "rgba(122, 28, 25, 0.94)",
                    borderWidth: 1,
                    borderColor: "rgba(226, 150, 140, 0.22)",
                    ...theme.elevation.md,
                }}
            >
                <Ionicons
                    name="cloud-offline-outline"
                    size={theme.iconSize.sm}
                    color="#FFE4E0"
                />
                <Text
                    numberOfLines={1}
                    style={{
                        fontFamily: "Inter-SemiBold",
                        fontSize: 12,
                        letterSpacing: 0.3,
                        color: "#FFE4E0",
                    }}
                >
                    {t("common.offline_banner")}
                </Text>
            </View>
        </Animated.View>
    );
}
