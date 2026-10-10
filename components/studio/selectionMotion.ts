import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { useReduceMotion } from "@/hooks/useReduceMotion";

/**
 * The composer's "you picked this" motion (redesign v3, 2026-10-10).
 *
 * <p>Two values, driven separately on purpose: {@code ring} follows the
 * SELECTION (so a tile deselected because its neighbour was tapped fades out
 * too), and {@code press} follows the TAP (only the tile under the finger
 * springs). Tying the spring to the selection would make a tile that arrives
 * already selected — a choice kept from the user's previous run — bounce on
 * mount for no reason.
 *
 * <p>Reduce Motion: no spring, and the ring jumps to its end state. The ring
 * still appears — it is the selected state itself, not decoration.
 */
export function useSelectionMotion(selected: boolean) {
    const reduce = useReduceMotion();
    const ring = useSharedValue(selected ? 1 : 0);
    const scale = useSharedValue(1);

    useEffect(() => {
        ring.value = reduce ? (selected ? 1 : 0) : withTiming(selected ? 1 : 0, { duration: 220 });
    }, [selected, reduce, ring]);

    /** Call from onPress. */
    const pulse = () => {
        if (reduce) return;
        scale.value = withSequence(
            withTiming(0.96, { duration: 70 }),
            withSpring(1, { damping: 12, stiffness: 260, mass: 0.6 }),
        );
    };

    const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));

    return { pulse, scaleStyle, ringStyle };
}

/**
 * The same cross-fade for the CREATE button: 0 = muted, 1 = gold. No spring —
 * a primary button that bounces when it becomes available reads as a nag.
 */
export function useReadyFade(ready: boolean) {
    const reduce = useReduceMotion();
    const progress = useSharedValue(ready ? 1 : 0);
    useEffect(() => {
        progress.value = reduce ? (ready ? 1 : 0) : withTiming(ready ? 1 : 0, { duration: 260 });
    }, [ready, reduce, progress]);
    return useAnimatedStyle(() => ({ opacity: progress.value }));
}
