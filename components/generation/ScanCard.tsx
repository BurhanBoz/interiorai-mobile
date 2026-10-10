import { useEffect } from "react";
import { View } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { theme } from "@/config/theme";

const U = theme.umber;
const CARD_W = 210;
const CARD_H = 260;
const SWEEP_MS = 2400;

/** `#RRGGBB` token at an alpha — keeps the scan band on the palette, not on new literals. */
export function tint(hex: string, alpha: number): string {
    const n = parseInt(hex.slice(1, 7), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

interface ScanCardProps {
    /** The room photo, sharp. Null while nothing is known yet — the card shows its surface. */
    source: ImageSource | null;
    /** Sweep loops while true; stops (band hidden) on error. */
    scanning: boolean;
    /** COMPLETED: the card brightens once, inside the 700 ms before the result opens. */
    ready: boolean;
    /** Reduce Motion: no loop — the band rests at `progress` (0–100) instead. */
    reduceMotion: boolean;
    progress: number;
    accessibilityLabel?: string;
}

/**
 * The room under a gold scan line (redesign v3, 2026-10-10).
 *
 * <p>A full-card gradient band whose bottom edge is a bright gold line is
 * translated from above the card to its bottom edge and clipped by the card,
 * which reads the same as the mockup's growing `height: n%` band but stays on
 * the UI thread (transform, not layout).
 */
export function ScanCard({ source, scanning, ready, reduceMotion, progress, accessibilityLabel }: ScanCardProps) {
    const sweep = useSharedValue(0); // 0 = band above the card, 1 = line at the bottom
    const flash = useSharedValue(0);

    useEffect(() => {
        if (!scanning) {
            cancelAnimation(sweep);
            return;
        }
        if (reduceMotion) {
            cancelAnimation(sweep);
            sweep.value = Math.max(0.08, Math.min(1, progress / 100));
            return;
        }
        sweep.value = 0;
        sweep.value = withRepeat(
            withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.ease) }),
            -1,
            false,
        );
        return () => cancelAnimation(sweep);
        // progress only matters for the static (Reduce Motion) band.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning, reduceMotion, reduceMotion ? progress : 0]);

    useEffect(() => {
        if (!ready || reduceMotion) return;
        flash.value = withSequence(withTiming(1, { duration: 220 }), withTiming(0.55, { duration: 420 }));
    }, [ready, reduceMotion, flash]);

    const bandStyle = useAnimatedStyle(() => ({
        opacity: scanning ? 1 : 0,
        transform: [{ translateY: (sweep.value - 1) * CARD_H }],
    }));
    const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.28 }));

    return (
        <View
            accessible={!!accessibilityLabel}
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabel}
            style={{
                width: CARD_W,
                height: CARD_H,
                borderRadius: theme.v2Layout.radius.card,
                borderWidth: 1,
                borderColor: ready ? tint(U.accentBright, 0.7) : tint(U.accent, 0.35),
                backgroundColor: U.surface,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
            }}
        >
            <View style={{ flex: 1, borderRadius: theme.v2Layout.radius.card - 1, overflow: "hidden" }}>
                {source ? (
                    <Image source={source} contentFit="cover" transition={300} style={{ width: "100%", height: "100%" }} />
                ) : null}
                <Animated.View
                    pointerEvents="none"
                    style={[{ position: "absolute", left: 0, right: 0, top: 0, height: CARD_H }, bandStyle]}
                >
                    <LinearGradient
                        colors={[tint(U.accentBright, 0), tint(U.accentBright, 0.22), tint(U.accentBright, 0.9)]}
                        locations={[0, 0.92, 1]}
                        style={{ flex: 1 }}
                    />
                    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1.5, backgroundColor: U.accentBright }} />
                </Animated.View>
                <Animated.View
                    pointerEvents="none"
                    style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: U.accentBright }, flashStyle]}
                />
            </View>
        </View>
    );
}
