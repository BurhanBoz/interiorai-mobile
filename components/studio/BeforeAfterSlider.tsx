import { useEffect, useState } from "react";
import { View, Text, StyleSheet, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    Easing,
    cancelAnimation,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { theme } from "@/config/theme";

const U = theme.umber;
const R = theme.v2Layout.radius;

export type SliderSource = ImageSourcePropType | { uri: string; cacheKey?: string; headers?: Record<string, string> };

/**
 * Before/after with a handle (build 114, owner 14 Oct: "before/after slider'ları").
 *
 * <p>The before sits over the after, clipped to the left of {@code position} (0 = all after,
 * 1 = all before). Three ways to drive it: a finger on the handle or anywhere on the picture
 * ({@code interactive}), an {@code autoSweep} that drifts between the two ends until the first
 * touch (the Studio's hero tile), or a fixed {@code initial} for a still tile. Transform-only
 * (clip window + counter-translate), so a drag never re-lays out the pictures. Under Reduce
 * Motion the auto sweep is off and the handle still works.
 */
export function BeforeAfterSlider({
    before,
    after,
    height,
    radius = R.card,
    beforeLabel,
    afterLabel,
    initial = 0.5,
    interactive = true,
    autoSweep = false,
    reduceMotion = false,
    onInteract,
    onBeforeLoad,
    onAfterLoad,
    sweep = [0.2, 0.8],
    glow = false,
}: {
    before: SliderSource;
    after: SliderSource;
    height?: number;
    radius?: number;
    beforeLabel?: string;
    afterLabel?: string;
    initial?: number;
    interactive?: boolean;
    /** Drift the handle between ~0.2 and ~0.8 until the first touch. */
    autoSweep?: boolean;
    reduceMotion?: boolean;
    /** First touch on the handle — the caller may hide a hint. */
    onInteract?: () => void;
    onBeforeLoad?: () => void;
    onAfterLoad?: () => void;
    /** The two ends the auto sweep drifts between (first-run screens open it almost fully). */
    sweep?: [number, number];
    /**
     * First-run shine (17 Oct): a soft gold halo behind the seam, the grip pulsing until the
     * first touch, and a light sheen that crosses the result as the handle reveals it.
     */
    glow?: boolean;
}) {
    const [width, setWidth] = useState(0);
    const w = useSharedValue(0);
    const pos = useSharedValue(initial);
    const start = useSharedValue(initial);
    const touched = useSharedValue(false);
    const pulse = useSharedValue(0);
    const sheen = useSharedValue(-1);

    useEffect(() => {
        if (!autoSweep || reduceMotion || touched.value) {
            cancelAnimation(pos);
            if (!autoSweep || reduceMotion) pos.value = initial;
            return;
        }
        // Reveal first (toward lo = more AFTER), hold, drift back, hold — and loop from there
        // without ever snapping to the start: the old sequence jumped back to `initial` at the
        // end of each pass, which the first-run pages made visible (simulator, 17 Oct).
        const [lo, hi] = sweep;
        pos.value = withRepeat(
            withSequence(
                withTiming(lo, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
                withDelay(1100, withTiming(hi, { duration: 2400, easing: Easing.inOut(Easing.ease) })),
                withDelay(700, withTiming(hi, { duration: 0 })),
            ),
            -1,
            false,
        );
        return () => cancelAnimation(pos);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoSweep, reduceMotion, initial, sweep[0], sweep[1]]);

    useEffect(() => {
        if (!glow || reduceMotion) {
            cancelAnimation(pulse); cancelAnimation(sheen);
            pulse.value = 0; sheen.value = -1;
            return;
        }
        pulse.value = withRepeat(
            withSequence(withTiming(1, { duration: 900, easing: Easing.out(Easing.ease) }), withTiming(0, { duration: 900, easing: Easing.in(Easing.ease) })),
            -1,
            false,
        );
        // The sheen crosses once per sweep, a little after the handle starts moving.
        sheen.value = withRepeat(
            withSequence(withDelay(600, withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) })), withDelay(4000, withTiming(-1, { duration: 0 }))),
            -1,
            false,
        );
        return () => { cancelAnimation(pulse); cancelAnimation(sheen); };
    }, [glow, reduceMotion, pulse, sheen]);

    const stop = () => {
        cancelAnimation(pulse);
        pulse.value = withTiming(0, { duration: 200 });
        cancelAnimation(sheen);
        sheen.value = -1;
        onInteract?.();
    };

    const pan = Gesture.Pan()
        .enabled(interactive)
        // Inside a vertical ScrollView: claim a horizontal drag early, let a vertical one scroll.
        .activeOffsetX([-6, 6])
        .failOffsetY([-14, 14])
        .onBegin(() => {
            if (!touched.value) {
                touched.value = true;
                cancelAnimation(pos);
                runOnJS(stop)();
            }
            start.value = pos.value;
        })
        .onUpdate((e) => {
            if (w.value === 0) return;
            const p = start.value + e.translationX / w.value;
            pos.value = Math.min(1, Math.max(0, p));
        });

    const tap = Gesture.Tap()
        .enabled(interactive)
        .onBegin((e) => {
            if (w.value === 0) return;
            if (!touched.value) {
                touched.value = true;
                cancelAnimation(pos);
                runOnJS(stop)();
            }
            pos.value = withTiming(Math.min(1, Math.max(0, e.x / w.value)), { duration: 180 });
        });

    const windowStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -(1 - pos.value) * w.value }],
    }));
    const innerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: (1 - pos.value) * w.value }],
    }));
    const handleStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: pos.value * w.value - 1 }],
    }));
    const haloStyle = useAnimatedStyle(() => ({
        opacity: 0.18 + pulse.value * 0.22,
        transform: [{ translateX: pos.value * w.value - 9 }],
    }));
    const gripStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 + pulse.value * 0.16 }],
        shadowOpacity: 0.35 + pulse.value * 0.4,
    }));
    const ringStyle = useAnimatedStyle(() => ({
        opacity: (1 - pulse.value) * 0.55,
        transform: [{ scale: 1 + pulse.value * 0.9 }],
    }));
    const sheenStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: sheen.value * (w.value + 160) }, { skewX: "-18deg" }],
        opacity: glow && !reduceMotion ? 1 : 0,
    }));

    return (
        <GestureDetector gesture={Gesture.Simultaneous(pan, tap)}>
            <View
                style={{ height, flex: height ? undefined : 1, borderRadius: radius, overflow: "hidden", backgroundColor: U.surface }}
                onLayout={(e) => {
                    const lw = e.nativeEvent.layout.width;
                    setWidth(lw);
                    w.value = lw;
                }}
            >
                {/* The after is the base and the BEFORE is the clipped window on the left, so the
                    picture reads the way the pills say: before on the left of the handle, after on the
                    right (simulator, 14 Oct: the first build had them the other way round). */}
                <Image source={after as never} style={StyleSheet.absoluteFill} contentFit="cover" onLoad={onAfterLoad} />
                {/* The sheen lives over the AFTER and under the before window: the light only ever
                    touches the result, as the handle uncovers it. */}
                {glow && (
                    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -40, bottom: -40, left: -80, width: 160 }, sheenStyle]}>
                        <LinearGradient
                            colors={["rgba(255,236,200,0)", "rgba(255,236,200,0.28)", "rgba(255,236,200,0)"]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={{ flex: 1 }}
                        />
                    </Animated.View>
                )}
                <Animated.View
                    pointerEvents="none"
                    style={[{ position: "absolute", top: 0, left: 0, bottom: 0, width: width || "100%", overflow: "hidden" }, windowStyle]}
                >
                    <Animated.View style={[{ width: width || "100%", height: "100%" }, innerStyle]}>
                        <Image source={before as never} style={{ width: "100%", height: "100%" }} contentFit="cover" onLoad={onBeforeLoad} />
                    </Animated.View>
                </Animated.View>

                {/* A soft gold halo behind the seam, breathing with the grip. */}
                {glow && (
                    <Animated.View
                        pointerEvents="none"
                        style={[{ position: "absolute", top: 0, bottom: 0, left: 0, width: 18, backgroundColor: U.accentBright }, haloStyle]}
                    />
                )}
                {/* The handle: a 2pt gold line with a round grip in the middle. */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        {
                            position: "absolute", top: 0, bottom: 0, left: 0, width: 2,
                            backgroundColor: U.accentBright,
                            shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
                            alignItems: "center", justifyContent: "center",
                        },
                        handleStyle,
                    ]}
                >
                    {(interactive || glow) && (
                        <View style={{ alignItems: "center", justifyContent: "center" }}>
                            {/* An expanding ring that fades as it grows: "this moves, touch it". */}
                            {glow && (
                                <Animated.View
                                    style={[{ position: "absolute", width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: U.accentBright }, ringStyle]}
                                />
                            )}
                            <Animated.View
                                style={[
                                    {
                                        width: 34, height: 34, borderRadius: 17,
                                        backgroundColor: U.accentBright,
                                        alignItems: "center", justifyContent: "center",
                                        shadowColor: glow ? U.accentBright : "#000", shadowOpacity: 0.35, shadowRadius: glow ? 10 : 5, shadowOffset: { width: 0, height: glow ? 0 : 2 },
                                    },
                                    gripStyle,
                                ]}
                            >
                                <Text style={{ fontFamily: "Inter-Bold", fontSize: 11, color: U.buttonInk, letterSpacing: -1 }}>◂ ▸</Text>
                            </Animated.View>
                        </View>
                    )}
                </Animated.View>

                {beforeLabel ? <Pill text={beforeLabel} left /> : null}
                {afterLabel ? <Pill text={afterLabel} gold /> : null}
            </View>
        </GestureDetector>
    );
}

function Pill({ text, gold, left }: { text: string; gold?: boolean; left?: boolean }) {
    return (
        <View
            pointerEvents="none"
            style={{
                position: "absolute", top: 10, [left ? "left" : "right"]: 10,
                paddingHorizontal: 9, paddingVertical: 4, borderRadius: R.pill,
                backgroundColor: gold ? U.accentBright : U.photoChrome,
                borderWidth: gold ? 0 : 1, borderColor: U.photoChromeBorder,
            }}
        >
            <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 10, letterSpacing: 1.3, color: gold ? U.buttonInk : "#fff" }}>
                {text.toLocaleUpperCase()}
            </Text>
        </View>
    );
}
