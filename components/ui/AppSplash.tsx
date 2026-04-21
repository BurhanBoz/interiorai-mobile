import { View, Text, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { Image } from "expo-image";

/**
 * Animated brand splash shown over the native Expo splash while the app
 * bootstraps (fonts, auth hydration, initial data fetches). Staggered
 * fade-in matches the design mockup: logo card → wordmark → tagline →
 * bottom frame. Parent is responsible for unmounting after the desired
 * dwell time.
 */
export function AppSplash() {
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.92)).current;
    const wordmarkOpacity = useRef(new Animated.Value(0)).current;
    const wordmarkTranslate = useRef(new Animated.Value(12)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const frameOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.spring(logoScale, {
                    toValue: 1,
                    damping: 14,
                    stiffness: 120,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(wordmarkOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(wordmarkTranslate, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(taglineOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(frameOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, [
        logoOpacity,
        logoScale,
        wordmarkOpacity,
        wordmarkTranslate,
        taglineOpacity,
        frameOpacity,
    ]);

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "transparent",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* Logo — frameless, transparent PNG lets the splash background
                breathe around the mark; the soft gold glow stands in for the
                old card border and gives the gold content a halo. */}
            <Animated.View
                style={{
                    opacity: logoOpacity,
                    transform: [{ scale: logoScale }],
                    marginBottom: 48,
                    shadowColor: "#E0C29A",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.25,
                    shadowRadius: 40,
                }}
            >
                <Image
                    source={require("../../assets/logo.png")}
                    style={{ width: 160, height: 160 }}
                    contentFit="contain"
                />
            </Animated.View>

            {/* Wordmark — two-line serif, wide tracking */}
            <Animated.View
                style={{
                    opacity: wordmarkOpacity,
                    transform: [{ translateY: wordmarkTranslate }],
                    alignItems: "center",
                    marginBottom: 20,
                }}
            >
                <Text
                    style={{
                        fontFamily: "NotoSerif",
                        fontSize: 24,
                        lineHeight: 34,
                        color: "#E0C29A",
                        letterSpacing: 6,
                        textAlign: "center",
                    }}
                >
                    ARCHITECTURAL{"\n"}LENS
                </Text>
            </Animated.View>

            {/* Tagline */}
            <Animated.View style={{ opacity: taglineOpacity }}>
                <Text
                    style={{
                        fontFamily: "Inter",
                        fontSize: 12,
                        color: "#998F84",
                        letterSpacing: 4,
                    }}
                >
                    DIGITAL CURATOR
                </Text>
            </Animated.View>

            {/* Bottom frame — hairline + positioning label */}
            <Animated.View
                style={{
                    opacity: frameOpacity,
                    position: "absolute",
                    bottom: 72,
                    alignItems: "center",
                }}
            >
                <View
                    style={{
                        width: 40,
                        height: 1,
                        backgroundColor: "rgba(224,194,154,0.35)",
                        marginBottom: 18,
                    }}
                />
                <Text
                    style={{
                        fontFamily: "Inter",
                        fontSize: 11,
                        color: "#6E6864",
                        letterSpacing: 3,
                    }}
                >
                    PREMIUM INTERIOR DESIGN
                </Text>
            </Animated.View>
        </View>
    );
}
