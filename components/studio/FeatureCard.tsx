import { View, Text, Pressable, Animated, Image } from "react-native";
import type { ImageSourcePropType } from "react-native";
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
 * <p>Media: a "pair" renders a LIVE before/after crossfade (synced
 * BEFORE/AFTER tag) — communicates what the tool does without any GIF
 * asset. Bundled stills stay sharp and cost zero extra bundle weight.
 * A "transfer" adds the reference chip on top of that crossfade, since
 * Style Transfer combines TWO inputs into the result.
 *
 * <p>Locked features (plan-gated) show a lock pill over the media; the
 * whole card stays tappable — the parent routes locked taps to /plans.
 *
 * <p>Layout rule (project-proven): the Pressable owns ONLY press feedback,
 * a plain inner View owns layout — see ListItem / AvatarMenu notes.
 */

const MEDIA_HEIGHT = 160;

/** Soft gradient at the media's bottom edge — melts the photo into the
    card body instead of a hard line; the premium "editorial fade". */
function MediaScrim() {
    return (
        <LinearGradient
            colors={["rgba(28,27,26,0)", "rgba(28,27,26,0.55)"]}
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 56,
            }}
            pointerEvents="none"
        />
    );
}

/**
 * Style Transfer's third frame. The card must read "your room + THIS
 * reference = that result", not merely "before → after". The chip carries
 * the reference photo and its gold ring ignites in step with the crossfade,
 * so the eye attributes the transformation to the reference.
 *
 * Sits bottom-RIGHT: the BEFORE/AFTER tag owns bottom-left and the plan
 * lock pill owns top-right, so nothing ever collides.
 */
function ReferenceChip({
    source,
    fade,
}: {
    source: ImageSourcePropType;
    fade: Animated.Value;
}) {
    const scale = fade.interpolate({
        inputRange: [0, 1],
        outputRange: [0.94, 1.04],
    });
    return (
        <View
            style={{
                position: "absolute",
                right: 12,
                bottom: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
            }}
        >
            <Text
                style={{
                    fontFamily: "Inter-SemiBold",
                    fontSize: 18,
                    color: theme.color.goldMidday,
                }}
            >
                +
            </Text>
            <Animated.View style={{ transform: [{ scale }] }}>
                {/* Permanent gold frame + glow — the reference is often
                    visually close to the after (that's the point of a good
                    transfer), so without a loud frame the chip camouflages
                    into the hero (2026-07-10 founder finding). */}
                <View
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        overflow: "hidden",
                        borderWidth: 2,
                        borderColor: theme.color.goldMidday,
                        shadowColor: "#E1C39B",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.55,
                        shadowRadius: 10,
                        elevation: 8,
                    }}
                >
                    <Image
                        source={source}
                        resizeMode="cover"
                        style={{ width: "100%", height: "100%" }}
                    />
                </View>
                {/* REF tag — same glass-pill language as BEFORE/AFTER
                    (those are EN by design too), overlapping the chip's
                    top edge so it reads as a labelled specimen. */}
                <View
                    style={{
                        position: "absolute",
                        top: -8,
                        alignSelf: "center",
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor: "rgba(12,11,10,0.85)",
                        borderWidth: 1,
                        borderColor: "rgba(225,195,155,0.5)",
                    }}
                >
                    <Text
                        style={{
                            fontFamily: "Inter-SemiBold",
                            fontSize: 8,
                            letterSpacing: 1.4,
                            color: theme.color.goldMidday,
                        }}
                    >
                        REF
                    </Text>
                </View>
            </Animated.View>
        </View>
    );
}

/* ───────── Before/after crossfade teaser ───────── */

function BeforeAfterTeaser({ media }: { media: FeatureMedia }) {
    const fade = useRef(new Animated.Value(0)).current;
    // Ken Burns — a barely-there push-in that breathes with the crossfade;
    // premium/soft, never busy.
    const zoom = useRef(new Animated.Value(1)).current;

    // Both "pair" and "transfer" ride the before→after crossfade.
    const isCrossfade = media.kind === "pair" || media.kind === "transfer";

    useEffect(() => {
        const zoomLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(zoom, {
                    toValue: 1.06,
                    duration: 6000,
                    easing: theme.motion.easing.standard,
                    useNativeDriver: true,
                }),
                Animated.timing(zoom, {
                    toValue: 1,
                    duration: 6000,
                    easing: theme.motion.easing.standard,
                    useNativeDriver: true,
                }),
            ]),
        );
        zoomLoop.start();
        if (!isCrossfade) return () => zoomLoop.stop();
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(2200),
                Animated.timing(fade, {
                    toValue: 1,
                    duration: 900,
                    easing: theme.motion.easing.standard,
                    useNativeDriver: true,
                }),
                Animated.delay(2200),
                Animated.timing(fade, {
                    toValue: 0,
                    duration: 900,
                    easing: theme.motion.easing.standard,
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => {
            loop.stop();
            zoomLoop.stop();
        };
    }, [fade, zoom, isCrossfade]);

    if (media.kind === "single") {
        return (
            <View style={{ width: "100%", height: MEDIA_HEIGHT, overflow: "hidden" }}>
                <Animated.Image
                    source={media.image}
                    resizeMode="cover"
                    style={{ width: "100%", height: "100%", transform: [{ scale: zoom }] }}
                />
                <MediaScrim />
            </View>
        );
    }

    return (
        <View style={{ width: "100%", height: MEDIA_HEIGHT, overflow: "hidden" }}>
            <Animated.View
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    transform: [{ scale: zoom }],
                }}
            >
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
            </Animated.View>
            <MediaScrim />

            {media.kind === "transfer" ? (
                <ReferenceChip source={media.reference} fade={fade} />
            ) : null}

            {/* Synced BEFORE/AFTER tag — bottom-left glass chip */}
            <View style={{ position: "absolute", left: 12, bottom: 12 }}>
                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                        backgroundColor: "rgba(12,11,10,0.5)",
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
                transform: [{ scale: pressed ? 0.985 : 1 }],
                opacity: pressed ? 0.92 : 1,
            })}
        >
            <View
                style={{
                    borderRadius: 22,
                    overflow: "hidden",
                    backgroundColor: theme.color.surfaceContainerLow,
                    borderWidth: 1,
                    borderColor: "rgba(225,195,155,0.12)",
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
