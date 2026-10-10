import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { theme, track } from "@/config/theme";

const U = theme.umber;
const V = theme.v2;
const L = theme.v2Layout;

/**
 * One design in the Gallery's two-column grid (redesign v3, 2026-10-10).
 *
 * <p>The v2 tile carried its one word on a dark pill and dropped the gradient
 * so the photograph stayed bright. v3 brings a SHORT gradient back (70 px, the
 * bottom of the card only) because the card now carries two lines — the style
 * in serif and "Room · date" under it — and a pill wide enough for both would
 * cover more of the room than the band does.
 *
 * <p>🔴 The outer Animated.View is sized explicitly ({@code width}/{@code height}).
 * An Animated wrapper without a height whose child is {@code flex: 1}
 * collapses to 0 and the grid's rows overlap — it bit us on 2026-10-09.
 *
 * <p>🔴 The Pressable takes a STATIC style. {@code style={({ pressed }) => …}}
 * is dropped whole by NativeWind here; the press shrink is an Animated value
 * driven from onPressIn/onPressOut instead.
 */
export interface GalleryCardProps {
    width: number;
    height: number;
    imageUrl: string;
    /** Only clip posters go through the authenticated proxy and need these. */
    headers?: Record<string, string>;
    kind: "image" | "video";
    qualityTier: string;
    title: string;
    caption: string;
    favorited: boolean;
    /** ms before the entrance starts, or null to render settled (no entrance). */
    enterDelay: number | null;
    reduceMotion: boolean;
    accessibilityLabel: string;
    onPress: () => void;
    onLongPress: () => void;
}

export function GalleryCard({
    width, height, imageUrl, headers, kind, qualityTier, title, caption,
    favorited, enterDelay, reduceMotion, accessibilityLabel, onPress, onLongPress,
}: GalleryCardProps) {
    const { t } = useTranslation();
    const animateIn = enterDelay !== null && !reduceMotion;
    // Initial values are read once, at mount: a card that mounts later
    // (next page, filter switch, scrolled back into the window) is settled.
    const enter = useRef(new Animated.Value(animateIn ? 0 : 1)).current;
    const press = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!animateIn) return;
        const anim = Animated.timing(enter, {
            toValue: 1,
            duration: theme.motion.duration.slow,
            delay: enterDelay ?? 0,
            easing: theme.motion.easing.enter,
            useNativeDriver: true,
        });
        anim.start();
        return () => anim.stop();
        // Mount-only on purpose — see the comment on `enter`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pressTo = (v: number) => {
        if (reduceMotion) return;
        Animated.spring(press, { toValue: v, ...theme.motion.spring.snappy, useNativeDriver: true }).start();
    };

    return (
        <Animated.View
            style={{
                width,
                height,
                opacity: enter,
                transform: [
                    { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                    { scale: press },
                ],
            }}
        >
            <Pressable
                onPress={onPress}
                onLongPress={onLongPress}
                delayLongPress={300}
                onPressIn={() => pressTo(0.97)}
                onPressOut={() => pressTo(1)}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                style={{
                    width,
                    height,
                    borderRadius: L.radius.card,
                    overflow: "hidden",
                    backgroundColor: U.sheetSurface,
                }}
            >
                <Image
                    // A picture's URL is pre-signed S3; no Authorization header
                    // (supplying one → S3 403 on the redirect target). A clip's
                    // poster comes through the authenticated proxy and needs one.
                    source={headers ? { uri: imageUrl, headers } : { uri: imageUrl }}
                    style={{ width, height }}
                    contentFit="cover"
                    transition={200}
                />

                <LinearGradient
                    colors={["rgba(19,19,19,0)", "rgba(19,19,19,0.75)"]}
                    pointerEvents="none"
                    style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70 }}
                />

                <View pointerEvents="none" style={{ position: "absolute", left: 10, right: 10, bottom: 10 }}>
                    <Text style={{ ...theme.text.title, fontSize: 15, lineHeight: 20, color: U.ink }} numberOfLines={1}>
                        {title}
                    </Text>
                    {caption ? (
                        <Text style={{ ...V.caption, color: theme.color.onSurfaceVariant }} numberOfLines={1}>
                            {caption}
                        </Text>
                    ) : null}
                </View>

                {/* Top-left: a clip wears VIDEO (gold, with a play mark — it
                    says "clip" before the tile is tapped); a picture above
                    STANDARD wears its tier. A clip's tier is its parent's. */}
                {kind === "video" ? (
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute", top: 10, left: 10,
                            flexDirection: "row", alignItems: "center", gap: 4,
                            paddingHorizontal: 9, paddingVertical: 4,
                            borderRadius: L.radius.pill,
                            backgroundColor: U.accentBright,
                        }}
                    >
                        <Ionicons name="play" size={10} color={U.buttonInk} />
                        <Text style={{ ...V.captionStrong, letterSpacing: track(1.2), color: U.buttonInk }}>
                            {t("gallery.video_badge")}
                        </Text>
                    </View>
                ) : qualityTier !== "STANDARD" ? (
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute", top: 10, left: 10,
                            paddingHorizontal: 9, paddingVertical: 4,
                            borderRadius: L.radius.pill,
                            backgroundColor: U.photoChrome,
                            borderWidth: 1,
                            borderColor: U.photoChromeBorder,
                        }}
                    >
                        <Text style={{ ...V.captionStrong, letterSpacing: track(1.2), color: U.accentBright }}>
                            {qualityTier === "ULTRA_HD" ? "4K" : "HD"}
                        </Text>
                    </View>
                ) : null}

                {/* Top-right: a state, not a control — toggling lives on the
                    result screen, as it did before v3. */}
                {favorited ? (
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute", top: 10, right: 10,
                            width: 32, height: 32, borderRadius: 16,
                            backgroundColor: U.photoChrome,
                            alignItems: "center", justifyContent: "center",
                        }}
                    >
                        <Ionicons name="heart" size={16} color={U.accentBright} />
                    </View>
                ) : null}
            </Pressable>
        </Animated.View>
    );
}

/**
 * The dashed "+ New design" cell — closes the grid, and stands alone when the
 * gallery is empty, so both states offer the identical next step.
 */
export function NewDesignCell({
    width, height, onPress,
}: { width: number; height: number; onPress: () => void }) {
    const { t } = useTranslation();
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={t("gallery.v2_new_design")}
            style={{
                width, height,
                borderRadius: L.radius.card,
                borderWidth: 1,
                borderColor: U.accent,
                borderStyle: "dashed",
                backgroundColor: U.lineAccent,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 12,
            }}
        >
            <Text style={{ ...V.row, color: U.accentBright, textAlign: "center" }} numberOfLines={2}>
                {t("gallery.v2_new_design")}
            </Text>
        </Pressable>
    );
}
