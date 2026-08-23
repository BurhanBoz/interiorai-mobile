import { View, Text, Pressable, Animated, Image } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { useEffect, useRef, useState } from "react";
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

// 150, not 160: five cards at 276pt each meant two fit on an iPhone 13.
// Ten points of media per card plus the tightened body padding below buys a
// third card into the first paint — the difference between "here are two
// things" and "here is a product".
const MEDIA_HEIGHT = 150;

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
 * Style Transfer teaser — a 3-act story (2026-07 tester ask: "before görünsün,
 * referans üstüne biniyormuş gibi olsun, after doğsun"):
 *   act 1  hold the BEFORE room
 *   act 2  the reference photo lands on it, center-stage (polaroid drop)
 *   act 3  the reference glides to the corner as the AFTER fades in — the
 *          eye reads "this photo was applied to that room"
 * One looping native-driver value drives every layer via interpolation.
 */
function TransferTeaser({
    media,
}: {
    media: Extract<FeatureMedia, { kind: "transfer" }>;
}) {
    const { t } = useTranslation();
    // Two independent values instead of one multi-segment loop value
    // (2026-07-11 tester flash): with act-interpolation cliffs, a native-
    // driver loop seam could flash the after for a frame right as the
    // reference began to move. `after` is now touched ONLY by its own two
    // timings — it is structurally impossible for the after image to be
    // visible outside its own act, no matter how the loop resets.
    const pos = useRef(new Animated.Value(0)).current;    // 0 corner ↔ 1 center
    const after = useRef(new Animated.Value(0)).current;  // 0 hidden ↔ 1 shown
    const [mediaW, setMediaW] = useState(0);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(1500),                       // before + chip waiting in corner
                Animated.timing(pos, { toValue: 1, duration: 1300,
                    easing: theme.motion.easing.standard, useNativeDriver: true }),
                Animated.delay(1100),                       // ref center-stage on the before
                Animated.timing(pos, { toValue: 0, duration: 750,
                    easing: theme.motion.easing.standard, useNativeDriver: true }),
                Animated.timing(after, { toValue: 1, duration: 700,
                    easing: theme.motion.easing.standard, useNativeDriver: true }),
                Animated.delay(2100),                       // after holds
                Animated.timing(after, { toValue: 0, duration: 620,
                    easing: theme.motion.easing.standard, useNativeDriver: true }),
                Animated.delay(400),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [pos, after]);

    const CARD = 110;
    const cornerTX = mediaW > 0 ? mediaW / 2 - CARD * 0.51 / 2 - 12 : 0;
    const cornerTY = MEDIA_HEIGHT / 2 - CARD * 0.51 / 2 - 12;
    const afterOpacity = after;
    const refScale = pos.interpolate({ inputRange: [0, 1], outputRange: [0.51, 1] });
    const refTX = pos.interpolate({ inputRange: [0, 1], outputRange: [cornerTX, 0] });
    const refTY = pos.interpolate({ inputRange: [0, 1], outputRange: [cornerTY, 0] });
    const refRotate = pos.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-3deg"] });
    const beforeTagOpacity = after.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

    return (
        <View
            style={{ width: "100%", height: MEDIA_HEIGHT, overflow: "hidden" }}
            onLayout={(e) => setMediaW(e.nativeEvent.layout.width)}
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
                    opacity: afterOpacity,
                }}
            >
                <Image
                    source={media.after}
                    resizeMode="cover"
                    style={{ width: "100%", height: "100%" }}
                />
            </Animated.View>
            <MediaScrim />

            {/* Reference photo — lands center, settles to the corner */}
            <View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Animated.View
                    style={{
                        // Hidden for the single pre-layout frame — until
                        // mediaW lands, cornerTX is 0 and the chip would
                        // flash at center.
                        opacity: mediaW > 0 ? 1 : 0,
                        transform: [
                            { translateX: refTX },
                            { translateY: refTY },
                            { scale: refScale },
                            { rotate: refRotate },
                        ],
                    }}
                >
                    <View
                        style={{
                            width: CARD,
                            height: CARD,
                            borderRadius: theme.radius.md,
                            overflow: "hidden",
                            borderWidth: 2.5,
                            borderColor: theme.color.goldMidday,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.5,
                            shadowRadius: 16,
                            elevation: 10,
                        }}
                    >
                        <Image
                            source={media.reference}
                            resizeMode="cover"
                            style={{ width: "100%", height: "100%" }}
                        />
                    </View>
                    <View
                        style={{
                            position: "absolute",
                            top: -9,
                            alignSelf: "center",
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: theme.radius.pill,
                            backgroundColor: "rgba(12,11,10,0.85)",
                            borderWidth: 1,
                            borderColor: "rgba(225,195,155,0.5)",
                        }}
                    >
                        <Text
                            style={{
                                ...theme.text.label,
                                color: theme.color.goldMidday,
                              }}
                        >
                            REF
                        </Text>
                    </View>
                </Animated.View>
            </View>

            {/* Synced BEFORE/AFTER tag — bottom-left */}
            <View style={{ position: "absolute", left: 12, bottom: 12 }}>
                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: theme.radius.pill,
                        backgroundColor: "rgba(12,11,10,0.5)",
                        borderWidth: 1,
                        borderColor: "rgba(225,195,155,0.28)",
                    }}
                >
                    <View>
                        <Animated.Text
                            style={{
                                ...theme.text.label,
                                color: "#D0C5B8",
                                opacity: beforeTagOpacity,
                              }}
                        >
                            {t("result.before")}
                        </Animated.Text>
                        <Animated.Text
                            style={{
                                ...theme.text.label,
                                position: "absolute",
                                color: theme.color.goldMidday,
                                opacity: afterOpacity,
                              }}
                        >
                            {t("result.after")}
                        </Animated.Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

/**
 * Magic Edit teaser — performs the exact gesture the tool asks of the user:
 *   act 1  clean BEFORE room
 *   act 2  a golden brush sweep paints the sofa + coffee table (the job's
 *          REAL mask, revealed left→right like a finger stroke)
 *   act 3  the painted region becomes the AFTER
 * Two independent values (transfer-teaser lesson): `after` is touched ONLY
 * by its own two timings, and the wipe resets to 0 while fully hidden
 * behind the opaque after — a stray paint/after flash is structurally
 * impossible at the loop seam.
 */
function PaintTeaser({
    media,
}: {
    media: Extract<FeatureMedia, { kind: "paint" }>;
}) {
    const { t } = useTranslation();
    const wipe = useRef(new Animated.Value(0)).current;   // 0 unpainted ↔ 1 painted
    const after = useRef(new Animated.Value(0)).current;  // 0 hidden ↔ 1 shown
    const [mediaW, setMediaW] = useState(0);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(1400),                     // clean before
                Animated.timing(wipe, { toValue: 1, duration: 1500,
                    easing: theme.motion.easing.standard, useNativeDriver: true }),
                Animated.delay(900),                      // painted, brush lifted
                Animated.timing(after, { toValue: 1, duration: 700,
                    easing: theme.motion.easing.standard, useNativeDriver: true }),
                Animated.delay(1200),                     // after holds
                // Reset the paint while it's invisible behind the after —
                // the return to BEFORE must land on a clean room.
                Animated.timing(wipe, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.delay(900),
                Animated.timing(after, { toValue: 0, duration: 620,
                    easing: theme.motion.easing.standard, useNativeDriver: true }),
                Animated.delay(500),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [wipe, after]);

    // Wipe reveal without distortion: the OUTER window slides in from the
    // left while the INNER content slides the opposite way, so the paint
    // stays pixel-glued to the room and only its reveal edge sweeps across.
    const clipTX = wipe.interpolate({ inputRange: [0, 1], outputRange: [-mediaW, 0] });
    const paintTX = wipe.interpolate({ inputRange: [0, 1], outputRange: [mediaW, 0] });
    const afterOpacity = after;
    const beforeTagOpacity = after.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

    return (
        <View
            style={{ width: "100%", height: MEDIA_HEIGHT, overflow: "hidden" }}
            onLayout={(e) => setMediaW(e.nativeEvent.layout.width)}
        >
            <Image
                source={media.before}
                resizeMode="cover"
                style={{ position: "absolute", width: "100%", height: "100%" }}
            />

            {/* Golden paint sweep — hidden for the pre-layout frame (with
                mediaW=0 both translateX's are 0, i.e. fully painted). */}
            <View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    opacity: mediaW > 0 ? 1 : 0,
                }}
            >
                <Animated.View
                    style={{
                        width: "100%",
                        height: "100%",
                        overflow: "hidden",
                        transform: [{ translateX: clipTX }],
                    }}
                >
                    <Animated.View
                        style={{
                            width: "100%",
                            height: "100%",
                            transform: [{ translateX: paintTX }],
                        }}
                    >
                        <Image
                            source={media.paint}
                            resizeMode="cover"
                            style={{ width: "100%", height: "100%" }}
                        />
                    </Animated.View>
                </Animated.View>
            </View>

            <Animated.View
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    opacity: afterOpacity,
                }}
            >
                <Image
                    source={media.after}
                    resizeMode="cover"
                    style={{ width: "100%", height: "100%" }}
                />
            </Animated.View>
            <MediaScrim />

            {/* Synced BEFORE/AFTER tag — bottom-left glass chip */}
            <View style={{ position: "absolute", left: 12, bottom: 12 }}>
                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: theme.radius.pill,
                        backgroundColor: "rgba(12,11,10,0.5)",
                        borderWidth: 1,
                        borderColor: "rgba(225,195,155,0.28)",
                    }}
                >
                    <View>
                        <Animated.Text
                            style={{
                                ...theme.text.label,
                                color: "#D0C5B8",
                                opacity: beforeTagOpacity,
                              }}
                        >
                            {t("result.before")}
                        </Animated.Text>
                        <Animated.Text
                            style={{
                                ...theme.text.label,
                                position: "absolute",
                                color: theme.color.goldMidday,
                                opacity: afterOpacity,
                              }}
                        >
                            {t("result.after")}
                        </Animated.Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

/* ───────── Before/after crossfade teaser ───────── */

function BeforeAfterTeaser({ media }: { media: FeatureMedia }) {
    const { t } = useTranslation();
    const fade = useRef(new Animated.Value(0)).current;
    // Ken Burns — a barely-there push-in that breathes with the crossfade;
    // premium/soft, never busy.
    const zoom = useRef(new Animated.Value(1)).current;


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
        if (media.kind !== "pair") return () => zoomLoop.stop();
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
    }, [fade, zoom, media.kind]);

    if (media.kind === "transfer") {
        return <TransferTeaser media={media} />;
    }

    if (media.kind === "paint") {
        return <PaintTeaser media={media} />;
    }

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

            {/* Synced BEFORE/AFTER tag — bottom-left glass chip */}
            <View style={{ position: "absolute", left: 12, bottom: 12 }}>
                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: theme.radius.pill,
                        backgroundColor: "rgba(12,11,10,0.5)",
                        borderWidth: 1,
                        borderColor: "rgba(225,195,155,0.28)",
                    }}
                >
                    <View>
                        <Animated.Text
                            style={{
                                ...theme.text.label,
                                color: "#D0C5B8",
                                opacity: fade.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 0],
                                }),
                              }}
                        >
                            {t("result.before")}
                        </Animated.Text>
                        <Animated.Text
                            style={{
                                ...theme.text.label,
                                position: "absolute",
                                color: theme.color.goldMidday,
                                opacity: fade,
                              }}
                        >
                            {t("result.after")}
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
                borderRadius: theme.radius.lg,
                transform: [{ scale: pressed ? 0.985 : 1 }],
                opacity: pressed ? 0.92 : 1,
            })}
        >
            <View
                style={{
                    borderRadius: theme.radius.lg,
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
                                borderRadius: theme.radius.pill,
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
                                    ...theme.text.label,
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
                        paddingVertical: 13,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                ...theme.text.title,
                                color: theme.color.onSurface,
                              }}
                        >
                            {t(feature.titleKey)}
                        </Text>
                        <Text
                            style={{
                                ...theme.text.caption,
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
                            borderRadius: theme.radius.pill,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: "rgba(63,45,17,0.18)",
                        }}
                    >
                        <Text
                            style={{
                                ...theme.text.label,
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
