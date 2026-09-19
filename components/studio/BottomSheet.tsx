import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Modal, Pressable, View } from "react-native";
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
    heightRatio,
    onClose,
    children,
}: {
    /**
     * Fraction of the screen the sheet occupies. Omit it and the sheet takes
     * the height of its content instead, capped at 85%.
     *
     * <p>A fixed ratio on a short sheet leaves the button stranded at the
     * bottom of an empty panel — which is what the consent sheet did at 62%
     * for four lines of text.
     */
    heightRatio?: number;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const screenH = Dimensions.get("window").height;
    const fixedH = heightRatio ? Math.round(screenH * heightRatio) : null;
    // Content-sized sheets do not know their height until they have laid out.
    // Starting the slide from one screen height is correct for both: it is
    // always at least as far as the sheet is tall, so nothing is visible
    // before the animation begins.
    const [measuredH, setMeasuredH] = useState(screenH);
    const sheetH = fixedH ?? measuredH;
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(progress, {
            toValue: 1,
            duration: 300,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
            useNativeDriver: true,
        }).start();
    }, [progress]);

    /**
     * 🔴 Wrapped in a Modal, not just absolutely positioned.
     *
     * <p>The tab bar is itself absolute and renders above sibling content, so
     * a sheet opened from a tab screen had its footer — the Privacy Policy
     * link and the GOT IT button — underneath the dock. A Modal sits above
     * every piece of app chrome, which is what a bottom sheet has to do.
     *
     * <p>animationType is "none" on purpose: the slide below is the spec's
     * (300ms, cubic-bezier(.2,.8,.2,1)) and the OS transition would run on
     * top of it.
     */
    return (
        <Modal transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <View style={{ flex: 1 }} pointerEvents="box-none">
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
                    ...(fixedH ? { height: fixedH } : { maxHeight: Math.round(screenH * 0.85) }),
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
                onLayout={(e) => {
                    if (!fixedH) setMeasuredH(e.nativeEvent.layout.height);
                }}
            >
                {children}
            </Animated.View>
            </View>
        </Modal>
    );
}
