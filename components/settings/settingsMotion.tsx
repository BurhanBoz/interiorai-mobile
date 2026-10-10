import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";

import { useReduceMotion } from "@/hooks/useReduceMotion";

/**
 * The Settings tab's two small motions (redesign v3, 2026-10-10).
 *
 * <p><b>Rise.</b> The credit card and the two groups fade up 10 pt on the
 * first focus of the tab, 60 ms apart. Only the first: a settings screen that
 * re-animates every time you come back to it reads as slow, not alive.
 * 🔴 The wrapper has no height of its own — its child must size itself
 * (no `flex: 1` inside) or it collapses to zero.
 *
 * <p><b>Count-up.</b> The balance numeral runs from the old value to the new
 * one over ~450 ms when it changes (a refill, a purchase, a fetch landing).
 *
 * <p>Both render their end state under Reduce Motion.
 */

const STAGGER = 60;
const RISE = 10;

export function Rise({
    play,
    index,
    style,
    children,
}: {
    /** Flips true once, on first focus. */
    play: boolean;
    index: number;
    style?: StyleProp<ViewStyle>;
    children: ReactNode;
}) {
    const reduceMotion = useReduceMotion();
    const progress = useSharedValue(0);
    const done = useRef(false);

    useEffect(() => {
        if (done.current) return;
        if (reduceMotion) {
            progress.value = 1;
            done.current = true;
            return;
        }
        if (!play) return;
        done.current = true;
        progress.value = withDelay(
            index * STAGGER,
            withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
        );
    }, [play, reduceMotion, index, progress]);

    const animated = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ translateY: (1 - progress.value) * RISE }],
    }));

    return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** The value to print while a numeral counts toward `target`. */
export function useCountUp(target: number, duration = 450): number {
    const reduceMotion = useReduceMotion();
    const [shown, setShown] = useState(target);
    const from = useRef(target);

    useEffect(() => {
        const start = from.current;
        from.current = target;
        if (reduceMotion || start === target) {
            setShown(target);
            return;
        }
        let raf = 0;
        const t0 = Date.now();
        const tick = () => {
            const k = Math.min(1, (Date.now() - t0) / duration);
            const eased = 1 - Math.pow(1 - k, 3);
            setShown(Math.round(start + (target - start) * eased));
            if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, reduceMotion, duration]);

    return shown;
}
