import { useEffect, useState } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

/**
 * Top-of-screen banner that surfaces when the device loses connectivity.
 * Mounted once in the root layout, sits above everything via absolute
 * positioning. Slides down on disconnect, slides up on reconnect.
 *
 * Why this matters: the Studio wizard spawns Replicate jobs over HTTPS
 * and polls for results. Without a network signal the user taps Generate,
 * gets no feedback, and assumes the app is broken. The banner gives them
 * a clear, non-blocking reason for the silence.
 */
export function OfflineBanner() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [isOffline, setIsOffline] = useState(false);
    const [translateY] = useState(new Animated.Value(-80));

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
        Animated.timing(translateY, {
            toValue: isOffline ? 0 : -80,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [isOffline, translateY]);

    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                transform: [{ translateY }],
                paddingTop: insets.top,
                backgroundColor: "rgba(147,0,10,0.92)",
                zIndex: 9999,
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    gap: 8,
                }}
            >
                <Ionicons name="cloud-offline-outline" size={16} color="#FFEEEE" />
                <Text
                    style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#FFEEEE",
                        letterSpacing: 0.5,
                    }}
                >
                    {t("common.offline_banner")}
                </Text>
            </View>
        </Animated.View>
    );
}
