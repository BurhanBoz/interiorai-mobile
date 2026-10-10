import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * True while iOS "Reduce Motion" is on (redesign v3, 2026-10-10).
 *
 * <p>Every entrance, sweep and spring added in the v3 screens reads this and
 * renders its end state instead of animating. Starts `false` and updates once
 * the setting is read, so a first frame may animate for a user who has it on —
 * the same trade the existing pulses on the Studio screen made.
 */
export function useReduceMotion(): boolean {
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        let alive = true;
        AccessibilityInfo.isReduceMotionEnabled()
            .then((v) => {
                if (alive) setReduce(v);
            })
            .catch(() => {});
        const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
        return () => {
            alive = false;
            sub.remove();
        };
    }, []);
    return reduce;
}
