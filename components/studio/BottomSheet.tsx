import { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, Pressable, View } from "react-native";
import { theme } from "@/config/theme";

const U = theme.umber;

/**
 * The sheet shell every composer sheet sits in.
 *
 * <p>One place for the scrim, the slide and the rounded top so three sheets
 * cannot drift into three slightly different animations — which is what
 * happened to the v1 modals, where two of them eased and one snapped.
 *
 * <p>Motion is the spec's: translateY 100%→0 over 300ms on
 * cubic-bezier(.2,.8,.2,1). The scrim fades with it rather than appearing
 * instantly, because an instant black rectangle reads as a bug on a slow
 * first frame.
 */
export function BottomSheet({
    heightRatio = 0.8,
    onClose,
    children,
}: {
    heightRatio?: number;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const screenH = Dimensions.get("window").height;
    const sheetH = Math.round(screenH * heightRatio);
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(progress, {
            toValue: 1,
            duration: 300,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
            useNativeDriver: true,
        }).start();
    }, [progress]);

    return (
        <View style={{ position: "absolute", inset: 0 }} pointerEvents="box-none">
            <Animated.View style={{ flex: 1, opacity: progress }}>
                <Pressable
                    onPress={onClose}
                    accessibilityRole="button"
                    style={{ flex: 1, backgroundColor: U.sheetScrim }}
                />
            </Animated.View>

            <Animated.View
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: sheetH,
                    backgroundColor: U.sheetSurface,
                    borderTopLeftRadius: theme.v2Layout.radius.sheet,
                    borderTopRightRadius: theme.v2Layout.radius.sheet,
                    transform: [
                        {
                            translateY: progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [sheetH, 0],
                            }),
                        },
                    ],
                }}
            >
                {children}
            </Animated.View>
        </View>
    );
}
