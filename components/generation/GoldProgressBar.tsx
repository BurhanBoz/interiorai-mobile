import { useEffect } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { theme } from "@/config/theme";

const U = theme.umber;
const BAR_W = 220;

interface GoldProgressBarProps {
    /** 0–100. The bar eases to each new value; it never invents its own. */
    value: number;
    error?: boolean;
    reduceMotion: boolean;
    /** Spoken with the value — the live phase ("AI is rendering your room"). */
    accessibilityLabel: string;
}

/** Thin gold progress bar (redesign v3, 2026-10-10). 220 × 4, pill ends. */
export function GoldProgressBar({ value, error, reduceMotion, accessibilityLabel }: GoldProgressBarProps) {
    const clamped = Math.max(0, Math.min(100, value));
    const width = useSharedValue(0);

    useEffect(() => {
        const target = (clamped / 100) * BAR_W;
        width.value = reduceMotion
            ? target
            : withTiming(target, { duration: theme.motion.duration.glacial, easing: Easing.out(Easing.cubic) });
    }, [clamped, reduceMotion, width]);

    const fillStyle = useAnimatedStyle(() => ({ width: width.value }));

    return (
        <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={accessibilityLabel}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
            style={{
                width: BAR_W,
                height: 4,
                borderRadius: theme.v2Layout.radius.pill,
                backgroundColor: U.lineNeutral,
                overflow: "hidden",
            }}
        >
            <Animated.View style={[{ height: "100%" }, fillStyle]}>
                <LinearGradient
                    colors={error ? ["#93000A", "#FFB4AB"] : [U.accentBright, U.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1, borderRadius: theme.v2Layout.radius.pill }}
                />
            </Animated.View>
        </View>
    );
}
