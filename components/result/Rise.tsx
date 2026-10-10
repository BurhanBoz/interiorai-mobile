import { useEffect, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";

/** Gap between siblings rising in, and how long each takes. */
const STAGGER_MS = 60;
const RISE_MS = 360;

/**
 * A block that rises 12pt into place and fades in once `shown` turns true
 * (redesign v3, the result screen's arrival). `index` staggers siblings by
 * 60ms. Reduce Motion: the end state at once. Never animates out — once a
 * screen's actions have arrived they stay put.
 */
export function Rise({
    shown, index, reduceMotion, style, children,
}: {
    shown: boolean;
    index: number;
    reduceMotion: boolean;
    style?: StyleProp<ViewStyle>;
    children: ReactNode;
}) {
    const p = useSharedValue(0);
    useEffect(() => {
        if (!shown) return;
        if (reduceMotion) {
            p.value = 1;
            return;
        }
        p.value = withDelay(
            index * STAGGER_MS,
            withTiming(1, { duration: RISE_MS, easing: Easing.out(Easing.cubic) }),
        );
    }, [shown, reduceMotion, index, p]);
    const a = useAnimatedStyle(() => ({
        opacity: p.value,
        transform: [{ translateY: (1 - p.value) * 12 }],
    }));
    return <Animated.View style={[style, a]}>{children}</Animated.View>;
}
