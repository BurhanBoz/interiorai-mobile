import { Image } from "expo-image";
import { Dimensions, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

interface ZoomableImageProps {
    uri: string;
    /** Optional callback when user double-taps or zooms past threshold (e.g. dismiss). */
    onZoomChange?: (zoomedIn: boolean) => void;
    style?: StyleProp<ViewStyle>;
}

/**
 * Pinch-to-zoom + pan + double-tap image viewer.
 *
 * <h3>Why this exists</h3>
 *
 * <p>The default {@code <Image>} doesn't support gestures. Users naturally
 * try to pinch-zoom on generated AI renders to inspect detail (texture,
 * fabric, materials). Without zoom, they bail out to screenshot+system
 * Photos.app, breaking the experience.
 *
 * <h3>Design</h3>
 *
 * <p>Pinch + Pan composed simultaneously via {@code Gesture.Simultaneous}.
 * Reanimated 4 shared values drive native-driver transforms — no JS-thread
 * stutter during zoom even on older devices.
 *
 * <ul>
 *   <li><b>Pinch</b>: scale clamped [1.0, 6.0]. Below 1 snaps back to 1
 *       with a spring on gesture end (Apple HIG bounce).</li>
 *   <li><b>Pan</b>: only active when {@code scale > 1}. Translation
 *       clamped by saved scale × half-screen so the image edges stay
 *       reachable without going off the visible area.</li>
 *   <li><b>Double-tap</b>: toggles between 1x and 2.5x at the tap point.
 *       Matches Photos.app gesture vocabulary.</li>
 * </ul>
 *
 * <p>Constraint math runs in worklet context (UI thread). The optional
 * {@code onZoomChange} fires via {@code runOnJS} when zoom transitions
 * across the "zoomed in" threshold (scale > 1.05).
 */
export function ZoomableImage({ uri, onZoomChange, style }: ZoomableImageProps) {
    const { width: screenW, height: screenH } = Dimensions.get("window");

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const MIN_SCALE = 1;
    const MAX_SCALE = 6;
    const DOUBLE_TAP_SCALE = 2.5;

    const notifyZoomChange = (zoomedIn: boolean) => {
        onZoomChange?.(zoomedIn);
    };

    /**
     * Clamp translation so the image edge can't be dragged inside the
     * visible viewport. Limit = (scale - 1) * half-dimension.
     */
    const clampTranslation = (s: number, ty: number, tx: number) => {
        "worklet";
        const maxX = ((s - 1) * screenW) / 2;
        const maxY = ((s - 1) * screenH) / 2;
        return {
            x: Math.min(Math.max(tx, -maxX), maxX),
            y: Math.min(Math.max(ty, -maxY), maxY),
        };
    };

    const pinch = Gesture.Pinch()
        .onUpdate((e) => {
            const next = Math.min(Math.max(savedScale.value * e.scale, 0.5), MAX_SCALE);
            scale.value = next;
        })
        .onEnd(() => {
            if (scale.value < MIN_SCALE) {
                // Snap back to 1x — Apple HIG rubber-band feedback
                scale.value = withTiming(MIN_SCALE, { duration: 180 });
                translateX.value = withTiming(0, { duration: 180 });
                translateY.value = withTiming(0, { duration: 180 });
                savedScale.value = MIN_SCALE;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                runOnJS(notifyZoomChange)(false);
            } else {
                savedScale.value = scale.value;
                // Re-clamp translation against new scale ceiling
                const clamped = clampTranslation(scale.value, translateY.value, translateX.value);
                translateX.value = withTiming(clamped.x, { duration: 120 });
                translateY.value = withTiming(clamped.y, { duration: 120 });
                savedTranslateX.value = clamped.x;
                savedTranslateY.value = clamped.y;
                runOnJS(notifyZoomChange)(scale.value > 1.05);
            }
        });

    const pan = Gesture.Pan()
        // Only allow pan when zoomed in; otherwise it would conflict with
        // the modal's "tap-to-dismiss" Pressable.
        .averageTouches(true)
        .minPointers(1)
        .maxPointers(2)
        .onUpdate((e) => {
            if (savedScale.value <= 1) return;
            const clamped = clampTranslation(
                savedScale.value,
                savedTranslateY.value + e.translationY,
                savedTranslateX.value + e.translationX,
            );
            translateX.value = clamped.x;
            translateY.value = clamped.y;
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(280)
        .onEnd(() => {
            if (savedScale.value > 1.05) {
                // Zoom out
                scale.value = withTiming(MIN_SCALE, { duration: 220 });
                translateX.value = withTiming(0, { duration: 220 });
                translateY.value = withTiming(0, { duration: 220 });
                savedScale.value = MIN_SCALE;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                runOnJS(notifyZoomChange)(false);
            } else {
                // Zoom in to DOUBLE_TAP_SCALE, centred
                scale.value = withTiming(DOUBLE_TAP_SCALE, { duration: 220 });
                savedScale.value = DOUBLE_TAP_SCALE;
                runOnJS(notifyZoomChange)(true);
            }
        });

    // Pinch + Pan compose simultaneously (two fingers can drag while zooming).
    // Double-tap races against single tap; with no single-tap rival here
    // it's just a sequenced enhancement.
    const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <GestureDetector gesture={composed}>
            <Animated.View
                style={[
                    {
                        width: "100%",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                    },
                    style,
                ]}
            >
                <Animated.View style={[{ width: "100%", height: "100%" }, animatedStyle]}>
                    <Image
                        source={{ uri }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="contain"
                    />
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
}
