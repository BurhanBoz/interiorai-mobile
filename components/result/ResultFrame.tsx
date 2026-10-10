import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Animated, {
    Easing,
    cancelAnimation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { theme, track } from "@/config/theme";

const U = theme.umber;

/** The arrival wipe: the after over the before, left to right. */
const WIPE_MS = 700;
/** Before ⇄ after, once the user is driving it. */
const TOGGLE_MS = 240;
/**
 * How long the wipe waits for the BEFORE photo once the after has landed. The
 * before comes through the backend with an auth header and is usually the
 * slower of the two; wiping over an empty card would show nothing being
 * replaced. Past this the wipe runs over whatever is there.
 */
const BEFORE_GRACE_MS = 500;

/**
 * The framed result card (redesign v3, "4B · framed card", 2026-10-10).
 *
 * <p>Replaces the drag-to-reveal slider. The slider asked the user to find a
 * handle before they saw anything; the card shows the design whole and lets
 * one tap on BEFORE / AFTER answer "what did it change". The comparison is the
 * same two pictures — the input photo and the output — so nothing about what
 * is compared moved, only how.
 *
 * <p>The arrival is the slider's old opening sweep, made the whole point: the
 * card opens on the before, and the after wipes across it with a thin gold
 * front. It plays ONCE per visit — the screen re-reads the job on every focus
 * and the presigned URL changes with it, so "the image loaded" happens again
 * on every return; `played` keeps the wipe from replaying over a design the
 * user has already seen. Reduce Motion shows the end state.
 *
 * <p>Transform-only (a clipping window sliding right while the picture inside
 * slides left by the same amount), so the wipe runs on the UI thread and never
 * re-lays out the card.
 */
export function ResultFrame({
    beforeUrl,
    beforeHeaders,
    beforeCacheKey,
    afterUrl,
    afterCacheKey,
    height,
    reduceMotion,
    onOpen,
    onArrived,
}: {
    beforeUrl: string;
    beforeHeaders: Record<string, string>;
    beforeCacheKey?: string;
    afterUrl?: string;
    afterCacheKey?: string;
    height: number;
    reduceMotion: boolean;
    /** The existing fullscreen viewer (openFullscreen). */
    onOpen: () => void;
    /** Called once, when the after starts to show — the actions rise from it. */
    onArrived: () => void;
}) {
    const { t } = useTranslation();
    const [width, setWidth] = useState(0);
    const [showAfter, setShowAfter] = useState(true);
    const [afterLoaded, setAfterLoaded] = useState(false);
    const [beforeReady, setBeforeReady] = useState(!beforeUrl);
    const played = useRef(false);
    const arrivedRef = useRef(onArrived);
    arrivedRef.current = onArrived;

    /** 0 = only the before shows, 1 = the after covers the card. */
    const wipe = useSharedValue(0);
    /** The after layer's opacity — the toggle. */
    const afterOpacity = useSharedValue(1);
    const w = useSharedValue(0);

    const arrive = () => {
        if (played.current) return;
        played.current = true;
        arrivedRef.current();
    };

    // Reduce Motion, or a before that will never come: end state, no wipe.
    useEffect(() => {
        if (reduceMotion && !played.current) {
            wipe.value = 1;
            arrive();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reduceMotion]);

    // The before gets a short grace once the after is in, then the wipe goes.
    useEffect(() => {
        if (!afterLoaded || beforeReady) return;
        const id = setTimeout(() => setBeforeReady(true), BEFORE_GRACE_MS);
        return () => clearTimeout(id);
    }, [afterLoaded, beforeReady]);

    useEffect(() => {
        if (played.current || !afterLoaded || !beforeReady || width === 0) return;
        if (reduceMotion) {
            wipe.value = 1;
        } else {
            wipe.value = withTiming(1, { duration: WIPE_MS, easing: Easing.out(Easing.cubic) });
        }
        arrive();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [afterLoaded, beforeReady, width, reduceMotion]);

    const select = (after: boolean) => {
        if (after === showAfter) return;
        // A tap during the wipe finishes it: the user has asked for a side.
        cancelAnimation(wipe);
        wipe.value = 1;
        arrive();
        setShowAfter(after);
        const to = after ? 1 : 0;
        afterOpacity.value = reduceMotion ? to : withTiming(to, { duration: TOGGLE_MS });
    };

    const windowStyle = useAnimatedStyle(() => ({
        opacity: afterOpacity.value,
        transform: [{ translateX: -(1 - wipe.value) * w.value }],
    }));
    const innerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: (1 - wipe.value) * w.value }],
    }));
    const edgeStyle = useAnimatedStyle(() => ({
        opacity: interpolate(wipe.value, [0, 0.04, 0.85, 1], [0, 1, 1, 0]),
        transform: [{ translateX: wipe.value * w.value - 1 }],
    }));

    const hasBefore = !!beforeUrl;

    return (
        <View
            style={{
                height,
                borderRadius: theme.v2Layout.radius.card,
                backgroundColor: U.surface,
                ...theme.elevation.lg,
            }}
        >
            <View
                style={{ flex: 1, borderRadius: theme.v2Layout.radius.card, overflow: "hidden" }}
                onLayout={(e) => {
                    const lw = e.nativeEvent.layout.width;
                    setWidth(lw);
                    w.value = lw;
                }}
            >
                {/* One tap anywhere on the picture = the fullscreen viewer, as before. */}
                <Pressable
                    onPress={onOpen}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={showAfter ? t("result.after") : t("result.before")}
                    accessibilityHint={t("result.open_fullscreen")}
                    style={{ flex: 1 }}
                >
                    {hasBefore ? (
                        <Image
                            source={{ uri: beforeUrl, headers: beforeHeaders, cacheKey: beforeCacheKey }}
                            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                            contentFit="cover"
                            onLoad={() => setBeforeReady(true)}
                            onError={() => setBeforeReady(true)}
                        />
                    ) : null}

                    {afterUrl ? (
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                { position: "absolute", top: 0, left: 0, bottom: 0, width: width || "100%", overflow: "hidden" },
                                windowStyle,
                            ]}
                        >
                            <Animated.View style={[{ width: width || "100%", height: "100%" }, innerStyle]}>
                                <Image
                                    source={{ uri: afterUrl, cacheKey: afterCacheKey }}
                                    style={{ width: "100%", height: "100%" }}
                                    contentFit="cover"
                                    onLoad={() => setAfterLoaded(true)}
                                    // A broken after still lets the screen arrive — the
                                    // actions must never wait on a picture.
                                    onError={() => {
                                        wipe.value = 1;
                                        arrive();
                                    }}
                                />
                            </Animated.View>
                        </Animated.View>
                    ) : null}

                    {/* The wipe's front: a thin gold edge, gone when the wipe lands. */}
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            {
                                position: "absolute", top: 0, bottom: 0, left: 0, width: 2,
                                backgroundColor: U.accentBright,
                                shadowColor: U.accent, shadowOpacity: 0.9, shadowRadius: 8,
                                shadowOffset: { width: 0, height: 0 },
                            },
                            edgeStyle,
                        ]}
                    />

                    {!afterLoaded && afterUrl ? (
                        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                            <ActivityIndicator color={U.accentBright} />
                        </View>
                    ) : null}
                </Pressable>

                {hasBefore ? (
                    <View
                        accessibilityRole="tablist"
                        style={{
                            position: "absolute", left: 12, bottom: 12,
                            flexDirection: "row", padding: 4, gap: 4,
                            borderRadius: theme.v2Layout.radius.pill,
                            backgroundColor: U.photoChrome,
                            borderWidth: 1, borderColor: U.photoChromeBorder,
                        }}
                    >
                        <Segment label={t("result.before")} selected={!showAfter} onPress={() => select(false)} />
                        <Segment label={t("result.after")} selected={showAfter} onPress={() => select(true)} />
                    </View>
                ) : null}

                <Pressable
                    onPress={onOpen}
                    accessibilityRole="button"
                    accessibilityLabel={t("result.open_fullscreen")}
                    style={{
                        position: "absolute", right: 12, bottom: 12,
                        width: 44, height: 44, borderRadius: 22,
                        backgroundColor: U.photoChrome,
                        borderWidth: 1, borderColor: U.photoChromeBorder,
                        alignItems: "center", justifyContent: "center",
                    }}
                >
                    <Ionicons name="expand-outline" size={18} color={U.ink} />
                </Pressable>
            </View>
        </View>
    );
}

/** One half of the BEFORE / AFTER pill. 36pt tall inside a 44pt chrome. */
function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            hitSlop={{ top: 4, bottom: 4 }}
            style={{
                minHeight: 36,
                paddingHorizontal: 16,
                borderRadius: theme.v2Layout.radius.pill,
                backgroundColor: selected ? U.accentBright : "transparent",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Text
                style={{
                    fontFamily: "Inter-SemiBold",
                    fontSize: 12,
                    lineHeight: 16,
                    letterSpacing: track(1),
                    textTransform: "uppercase",
                    color: selected ? U.buttonInk : U.ink,
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}
