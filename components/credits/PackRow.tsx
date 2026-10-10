import { useEffect, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";

const U = theme.umber;

/**
 * One credit pack in the paywall's row shape (redesign v3, 2026-10-10).
 *
 * <p>Same silhouette as {@link PaywallPlanRow}: radio on the left, the pack
 * name and its badge, the credits it carries under it, and the price on the
 * right. Picking a row SELECTS it — the gold button under the list buys — so
 * the row springs (0.97 → 1) and its gold ring fades in. Under Reduce Motion
 * the ring simply appears.
 *
 * <p>Still a pack and a price and nothing else (owner, 26 Sep): no
 * "≈ N designs", no per-credit price, no feature list.
 *
 * <p>🔴 Static style objects only — NativeWind drops Pressable's
 * `({ pressed }) => …` style function (see app/result/[jobId].tsx).
 */
export function PackRow({
    name, creditsLine, price, badge, selected, busy, dimmed, disabled, a11yLabel, onPress, reduceMotion,
}: {
    name: string;
    /** "100 credits" or "120 credits · 20 bonus". */
    creditsLine: string;
    price: string;
    badge: string | null;
    selected: boolean;
    /** This pack's purchase is in flight. */
    busy: boolean;
    /** Another pack's purchase is in flight. */
    dimmed: boolean;
    disabled: boolean;
    a11yLabel: string;
    onPress: () => void;
    reduceMotion: boolean;
}) {
    const { i18n } = useTranslation();
    const upper = (s: string) => s.toLocaleUpperCase(i18n.language);

    const ring = useSharedValue(selected ? 1 : 0);
    const scale = useSharedValue(1);
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            ring.value = selected ? 1 : 0;
            return;
        }
        if (reduceMotion) {
            ring.value = selected ? 1 : 0;
            scale.value = 1;
            return;
        }
        ring.value = withTiming(selected ? 1 : 0, {
            duration: theme.motion.duration.base,
            easing: Easing.out(Easing.quad),
        });
        if (selected) {
            scale.value = 0.97;
            scale.value = withSpring(1, theme.motion.spring.snappy);
        }
    }, [selected, reduceMotion]);

    const rowStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={a11yLabel}
            accessibilityState={{ checked: selected, disabled, busy }}
        >
            <Animated.View
                style={[
                    {
                        minHeight: 72, borderRadius: theme.v2Layout.radius.card,
                        paddingVertical: 12, paddingHorizontal: 16,
                        borderWidth: 1.5, borderColor: U.lineNeutral,
                        backgroundColor: U.surface,
                        flexDirection: "row", alignItems: "center", gap: 14,
                        opacity: dimmed ? 0.5 : 1,
                    },
                    rowStyle,
                ]}
            >
                {/* The gold ring: its own layer so it fades on the UI thread. */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        {
                            position: "absolute", top: -1.5, left: -1.5, right: -1.5, bottom: -1.5,
                            borderRadius: theme.v2Layout.radius.card,
                            borderWidth: 1.5, borderColor: U.accent,
                            ...theme.elevation.goldGlow, shadowOpacity: 0.18,
                        },
                        ringStyle,
                    ]}
                />

                <View style={{
                    width: 20, height: 20, borderRadius: 10,
                    borderWidth: selected ? 6 : 1.5,
                    borderColor: selected ? U.accentBright : U.inkMuted,
                }} />

                <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Text style={{ ...theme.v2.tier, color: U.ink }} numberOfLines={1}>{upper(name)}</Text>
                        {badge ? (
                            <View style={{
                                paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.v2Layout.radius.pill,
                                backgroundColor: U.accentBright,
                            }}>
                                <Text style={{ ...theme.v2.captionStrong, color: U.buttonInk }}>{upper(badge)}</Text>
                            </View>
                        ) : null}
                    </View>
                    <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted }} numberOfLines={1}>
                        {creditsLine}
                    </Text>
                </View>

                {busy ? (
                    <ActivityIndicator color={U.accent} />
                ) : (
                    <Text style={{ ...theme.v2.displayS, color: U.ink }}>{price}</Text>
                )}
            </Animated.View>
        </Pressable>
    );
}
