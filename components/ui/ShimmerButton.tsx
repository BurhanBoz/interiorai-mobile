import { useEffect, useState, type ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { theme } from "@/config/theme";

const U = theme.umber;
const R = theme.v2Layout.radius;

/**
 * The gold button of the first-run screens, with a light that sweeps across it (17 Oct,
 * owner: "animasyonu, ışıltıyı ve al beniliği artıralım").
 *
 * <p>A diagonal sheen crosses the face every few seconds and the button breathes very
 * slightly; a press squeezes it. Nothing else changes: same height, same gold, same
 * children, so every screen keeps its layout. Still under Reduce Motion, where it is the
 * plain button it replaces.
 */
export function ShimmerButton({
    onPress,
    disabled,
    reduceMotion,
    style,
    accessibilityLabel,
    children,
}: {
    onPress: () => void;
    disabled?: boolean;
    reduceMotion?: boolean;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
    children: ReactNode;
}) {
    const [width, setWidth] = useState(0);
    const sheen = useSharedValue(-1);
    const breath = useSharedValue(1);
    const press = useSharedValue(1);

    useEffect(() => {
        if (reduceMotion || disabled || width === 0) {
            cancelAnimation(sheen); cancelAnimation(breath);
            sheen.value = -1; breath.value = 1;
            return;
        }
        sheen.value = -1;
        sheen.value = withRepeat(
            withSequence(withDelay(1400, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) })), withTiming(-1, { duration: 0 })),
            -1,
            false,
        );
        breath.value = withRepeat(
            withSequence(withTiming(1.015, { duration: 1300, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) })),
            -1,
            false,
        );
        return () => { cancelAnimation(sheen); cancelAnimation(breath); };
    }, [reduceMotion, disabled, width, sheen, breath]);

    const sheenStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: sheen.value * (width + 120) }, { skewX: "-20deg" }],
    }));
    const faceStyle = useAnimatedStyle(() => ({
        transform: [{ scale: breath.value * press.value }],
    }));

    return (
        <Animated.View style={[faceStyle, style]}>
            <Pressable
                onPress={onPress}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                onPressIn={() => { press.value = withSpring(0.97, { damping: 18, stiffness: 300 }); }}
                onPressOut={() => { press.value = withSpring(1, { damping: 14, stiffness: 260 }); }}
                onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
                style={{ borderRadius: R.button, overflow: "hidden", opacity: disabled ? 0.6 : 1 }}
            >
                <LinearGradient colors={[U.accentBright, U.buttonFill, U.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 56, justifyContent: "center" }}>
                    {/* The sheen: a soft white band, skewed, sliding over the face. */}
                    {!reduceMotion && width > 0 && (
                        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -20, bottom: -20, left: -60, width: 120 }, sheenStyle]}>
                            <LinearGradient
                                colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={{ flex: 1 }}
                            />
                        </Animated.View>
                    )}
                    <View>{children}</View>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}
