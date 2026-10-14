import { useEffect, useState } from "react";
import { View, Text, StyleSheet, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
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
}) {
    const [width, setWidth] = useState(0);
    const w = useSharedValue(0);
    const pos = useSharedValue(initial);
    const start = useSharedValue(initial);
    const touched = useSharedValue(false);

    useEffect(() => {
        if (!autoSweep || reduceMotion || touched.value) {
            cancelAnimation(pos);
            if (!autoSweep || reduceMotion) pos.value = initial;
            return;
        }
        pos.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
                withDelay(900, withTiming(0.2, { duration: 2600, easing: Easing.inOut(Easing.ease) })),
                withDelay(900, withTiming(initial, { duration: 0 })),
            ),
            -1,
            false,
        );
        return () => cancelAnimation(pos);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoSweep, reduceMotion, initial]);

    const stop = () => {
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
                <Animated.View
                    pointerEvents="none"
                    style={[{ position: "absolute", top: 0, left: 0, bottom: 0, width: width || "100%", overflow: "hidden" }, windowStyle]}
                >
                    <Animated.View style={[{ width: width || "100%", height: "100%" }, innerStyle]}>
                        <Image source={before as never} style={{ width: "100%", height: "100%" }} contentFit="cover" onLoad={onBeforeLoad} />
                    </Animated.View>
                </Animated.View>

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
                    {interactive && (
                        <View
                            style={{
                                width: 34, height: 34, borderRadius: 17,
                                backgroundColor: U.accentBright,
                                alignItems: "center", justifyContent: "center",
                                shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
                            }}
                        >
                            <Text style={{ fontFamily: "Inter-Bold", fontSize: 11, color: U.buttonInk, letterSpacing: -1 }}>◂ ▸</Text>
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
