import { useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withDelay, Easing, cancelAnimation,
} from "react-native-reanimated";
import { theme } from "@/config/theme";

const U = theme.umber;

/**
 * "Walk through it" — the room-video door (redesign v3; the V183 clip button
 * in a new body).
 *
 * <p>Same three faces as the old VideoCta, from the same status: make (with
 * the price, or a lock when the plan is below the feature), in progress
 * (disabled — the clip renders on its own and the push brings the user back),
 * watch (opens the clip). The press itself is still the screen's handleVideo,
 * so every door it guards — paywall below the plan, credits paywall on an
 * empty wallet, the progress screen, a finished clip never bought twice — is
 * unchanged.
 *
 * <p>🔴 The price stays ON the control, the composer's rule for Generate:
 * nobody is charged a number they did not see. It moved from the hint line to
 * the right edge, beside the chevron.
 *
 * <p>The thumbnail is the user's own design, not the stock teaser clip the old
 * button looped: the card is about moving THIS room.
 *
 * <p><b>3.0.0 (owner, 20 Oct): "video işimiz çok sönük".</b> The card is now the loudest thing
 * under Save/Share: taller, the design as a wide poster with a GOLD play button that breathes,
 * a gold outline with a glow, and a sheen that crosses the card every few seconds. Both motions
 * stop under Reduce Motion and while the clip is in progress. Still a static style object —
 * the `({ pressed }) => …` form is dropped by this app's NativeWind setup.
 */
export function WalkThroughCard({
    state, cost, locked, busy, pushGranted, thumbUrl, thumbCacheKey, reduceMotion, onPress,
}: {
    state: "make" | "progress" | "watch";
    cost: number | null;
    locked: boolean;
    busy: boolean;
    /** False = no push will come; the hint promises the gallery instead. */
    pushGranted: boolean | null;
    thumbUrl?: string;
    thumbCacheKey?: string;
    reduceMotion?: boolean;
    onPress: () => void;
}) {
    const { t } = useTranslation();
    const title =
        state === "watch" ? t("result.video_watch")
        : state === "progress" ? t("result.video_in_progress")
        : t("result.video_walk_title");
    const sub =
        state === "progress"
            ? t(pushGranted === false ? "result.video_in_progress_hint_gallery" : "result.video_in_progress_hint")
            : t("result.video_walk_sub");
    const price =
        state === "make" && !locked && cost != null ? t("studio.credit_cost", { count: cost }) : null;
    const showLock = state === "make" && locked;
    const working = busy || state === "progress";
    const animate = !reduceMotion && !working;

    // The play button breathes; the sheen crosses left → right and rests between passes.
    const pulse = useSharedValue(1);
    const sheen = useSharedValue(-1);
    useEffect(() => {
        if (!animate) {
            cancelAnimation(pulse); cancelAnimation(sheen);
            pulse.value = 1; sheen.value = -1;
            return;
        }
        pulse.value = withRepeat(
            withSequence(withTiming(1.1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })),
            -1, false,
        );
        sheen.value = withRepeat(
            withDelay(1800, withSequence(withTiming(-1, { duration: 0 }), withTiming(2, { duration: 1300, easing: Easing.inOut(Easing.cubic) }))),
            -1, false,
        );
        return () => { cancelAnimation(pulse); cancelAnimation(sheen); };
    }, [animate, pulse, sheen]);
    const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
    const sheenStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sheen.value * 220 }, { skewX: "-18deg" }] }));

    return (
        <Pressable
            onPress={onPress}
            disabled={working}
            accessibilityRole="button"
            accessibilityState={{ disabled: working, busy: working }}
            accessibilityLabel={[title, sub, price, showLock ? t("result.video_locked_hint") : null]
                .filter(Boolean)
                .join(". ")}
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                height: 100,
                paddingHorizontal: 12,
                borderRadius: theme.v2Layout.radius.card,
                backgroundColor: U.surface,
                borderWidth: 1.5,
                borderColor: working ? U.lineAccent : "rgba(221,180,119,0.55)",
                overflow: "hidden",
                shadowColor: U.accent,
                shadowOpacity: working ? 0 : 0.35,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 0 },
            }}
        >
            <View style={{ width: 104, height: 74, borderRadius: theme.v2Layout.radius.thumb, overflow: "hidden", backgroundColor: U.ground }}>
                {thumbUrl ? (
                    <Image
                        source={{ uri: thumbUrl, cacheKey: thumbCacheKey }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                    />
                ) : null}
                <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(14,13,12,0.25)", alignItems: "center", justifyContent: "center" }}>
                    {working ? (
                        <ActivityIndicator size="small" color={U.ink} />
                    ) : (
                        <Animated.View style={[{ width: 38, height: 38, borderRadius: 19, backgroundColor: U.accentBright, alignItems: "center", justifyContent: "center", ...theme.elevation.md }, playStyle]}>
                            <Ionicons name="play" size={18} color={U.buttonInk} style={{ marginLeft: 2 }} />
                        </Animated.View>
                    )}
                </View>
            </View>

            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={{ fontFamily: "NotoSerif", fontSize: 19, lineHeight: 24, color: U.ink }} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted }} numberOfLines={2}>
                    {sub}
                </Text>
            </View>

            {price ? (
                <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: theme.v2Layout.radius.pill, backgroundColor: U.lineAccent }}>
                    <Text style={{ fontFamily: "Inter-Bold", fontSize: 12, color: U.accentBright }}>{price}</Text>
                </View>
            ) : null}
            {showLock ? (
                // A lock, not a plan name: since V187 the clip is on Base and Pro.
                <View style={{ borderWidth: 1, borderColor: U.accent, borderRadius: 5, paddingVertical: 2, paddingHorizontal: 4 }}>
                    <Ionicons name="lock-closed" size={10} color={U.accentBright} />
                </View>
            ) : null}
            {state !== "progress" ? (
                <Ionicons name="chevron-forward" size={16} color={U.accentBright} />
            ) : null}

            {animate ? (
                <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -20, bottom: -20, left: 0, width: 110 }, sheenStyle]}>
                    <LinearGradient
                        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.16)", "rgba(255,255,255,0)"]}
                        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                        style={{ flex: 1 }}
                    />
                </Animated.View>
            ) : null}
        </Pressable>
    );
}
