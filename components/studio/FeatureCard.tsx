import { View, Text, Pressable, Animated, Image } from "react-native";
import { useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { FeatureMedia, StudioFeature } from "@/components/studio/featureCatalog";
import { theme } from "@/config/theme";

/**
 * Studio home feature card (2026-07 IA rework) — the "home ai"-style tool
 * card adapted to our dark editorial language: media on top, serif title +
 * one-line description below, gold "Try It" pill on the right.
 *
 * <p>Media: a "pair" renders a LIVE before/after crossfade (4.8s loop with
 * a synced BEFORE/AFTER tag) — communicates what the tool does without any
 * GIF asset. Bundled stills stay sharp and cost zero extra bundle weight.
 *
 * <p>Locked features (plan-gated) show a lock pill over the media; the
 * whole card stays tappable — the parent routes locked taps to /plans.
 *
 * <p>Layout rule (project-proven): the Pressable owns ONLY press feedback,
 * a plain inner View owns layout — see ListItem / AvatarMenu notes.
 */

const MEDIA_HEIGHT = 176;

/* ───────── Before/after crossfade teaser ───────── */

function BeforeAfterTeaser({ media }: { media: FeatureMedia }) {
    const fade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (media.kind !== "pair") return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(1600),
                Animated.timing(fade, {
                    toValue: 1,
                    duration: 800,
                    easing: theme.motion.easing.standard,
                    useNativeDriver: true,
                }),
                Animated.delay(1600),
                Animated.timing(fade, {
                    toValue: 0,
                    duration: 800,
                    easing: theme.motion.easing.standard,
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [fade, media.kind]);

    if (media.kind === "single") {
        return (
            <Image
                source={media.image}
                resizeMode="cover"
                style={{ width: "100%", height: MEDIA_HEIGHT }}
            />
        );
    }

    return (
        <View style={{ width: "100%", height: MEDIA_HEIGHT }}>
            <Image
                source={media.before}
                resizeMode="cover"
                style={{ position: "absolute", width: "100%", height: "100%" }}
            />
            <Animated.View
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    opacity: fade,
                }}
            >
                <Image
                    source={media.after}
                    resizeMode="cover"
                    style={{ width: "100%", height: "100%" }}
                />
            </Animated.View>

            {/* Synced BEFORE/AFTER tag — bottom-left glass chip */}
            <View style={{ position: "absolute", left: 12, bottom: 12 }}>
                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                        backgroundColor: "rgba(12,11,10,0.6)",
                        borderWidth: 1,
                        borderColor: "rgba(225,195,155,0.28)",
                    }}
                >
                    <View>
                        <Animated.Text
                            style={{
                                fontFamily: "Inter-SemiBold",
                                fontSize: 9,
                                letterSpacing: 1.6,
                                color: "#D0C5B8",
                                opacity: fade.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 0],
                                }),
                            }}
                        >
                            BEFORE
                        </Animated.Text>
                        <Animated.Text
                            style={{
                                position: "absolute",
                                fontFamily: "Inter-SemiBold",
                                fontSize: 9,
                                letterSpacing: 1.6,
                                color: theme.color.goldMidday,
                                opacity: fade,
                            }}
                        >
                            AFTER
                        </Animated.Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

/* ───────── Card ───────── */

interface FeatureCardProps {
    feature: StudioFeature;
    locked: boolean;
    onPress: () => void;
}

export function FeatureCard({ feature, locked, onPress }: FeatureCardProps) {
    const { t } = useTranslation();

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={t(feature.titleKey)}
            style={({ pressed }) => ({
                borderRadius: 22,
                transform: [{ scale: pressed ? 0.982 : 1 }],
                opacity: pressed ? 0.92 : 1,
            })}
        >
            <View
                style={{
                    borderRadius: 22,
                    overflow: "hidden",
                    backgroundColor: theme.color.surfaceContainerLow,
                    borderWidth: 1,
                    borderColor: "rgba(225,195,155,0.16)",
                    ...theme.elevation.goldGlowSoft,
                }}
            >
                <View>
                    <BeforeAfterTeaser media={feature.media} />

                    {/* Plan gate pill — only when actually locked for this user */}
                    {locked && feature.minPlan ? (
                        <View
                            style={{
                                position: "absolute",
                                top: 12,
                                right: 12,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 5,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: 999,
                                backgroundColor: "rgba(12,11,10,0.62)",
                                borderWidth: 1,
                                borderColor: "rgba(225,195,155,0.45)",
                            }}
                        >
                            <Ionicons
                                name="lock-closed"
                                size={10}
                                color={theme.color.goldMidday}
                            />
                            <Text
                                style={{
                                    fontFamily: "Inter-SemiBold",
                                    fontSize: 10,
                                    letterSpacing: 1.2,
                                    color: theme.color.goldMidday,
                                }}
                            >
                                {feature.minPlan}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Body — title + description left, gold CTA pill right */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                        paddingHorizontal: 18,
                        paddingVertical: 16,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontFamily: "NotoSerif",
                                fontSize: 19,
                                lineHeight: 24,
                                letterSpacing: -0.2,
                                color: theme.color.onSurface,
                            }}
                        >
                            {t(feature.titleKey)}
                        </Text>
                        <Text
                            style={{
                                fontFamily: "Inter",
                                fontSize: 12.5,
                                lineHeight: 18,
                                color: theme.color.onSurfaceVariant,
                                marginTop: 4,
                            }}
                            numberOfLines={2}
                        >
                            {t(feature.descKey)}
                        </Text>
                    </View>

                    <LinearGradient
                        colors={theme.gradient.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            paddingHorizontal: 16,
                            height: 36,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: "rgba(63,45,17,0.18)",
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: "Inter-SemiBold",
                                fontSize: 11,
                                letterSpacing: 1.2,
                                textTransform: "uppercase",
                                color: theme.color.onGold,
                            }}
                        >
                            {t("studio.feature_try")}
                        </Text>
                    </LinearGradient>
                </View>
            </View>
        </Pressable>
    );
}
