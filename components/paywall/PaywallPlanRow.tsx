import { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";

const U = theme.umber;

/**
 * One billing period of Pro, with what it charges TODAY (v3 "5B", 2026-10-10).
 *
 * <p>Left: radio, the tier, the offer badge and — under an introductory price —
 * "then $7.99/week", so the regular price never leaves the row the offer is
 * on. Right: the amount Apple's sheet will charge now, and the period it buys.
 *
 * <p>Three states, as before: selectable, selected, and not for sale. The last
 * is drawn dimmed but KEEPS its price — a subscriber should see what their own
 * plan costs; the plan they are on is labelled so the dim row does not read as
 * "sold out". Still a plan and a price and nothing else (owner, 26 Sep): no
 * credit counts, no per-credit price, no feature list.
 *
 * <p>Picking a row springs it (0.97 → 1) and fades its gold ring in; with
 * Reduce Motion the ring simply appears.
 */
export function PaywallPlanRow({
    label, price, period, then, badge, selected, current, locked, currentLabel, a11yLabel, onPress, reduceMotion,
}: {
    /** "Pro · Weekly" — the tier and the period, as one line. */
    label: string;
    /** Null while the store price is on its way — drawn as a skeleton. */
    price: string | null;
    /** "first week" under an introductory price, "/week" otherwise. */
    period: string;
    /** "then $8.99/week" under an introductory price; null otherwise. */
    then: string | null;
    /** The first-period offer (or the monthly saving), computed from real store prices. */
    badge: string | null;
    selected: boolean; current: boolean; locked: boolean;
    currentLabel: string; a11yLabel: string;
    onPress: () => void;
    reduceMotion: boolean;
}) {
    const { i18n } = useTranslation();
    const upper = (s: string) => s.toLocaleUpperCase(i18n.language);

    const ring = useRef(new Animated.Value(selected ? 1 : 0)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            ring.setValue(selected ? 1 : 0);
            return;
        }
        if (reduceMotion) {
            ring.setValue(selected ? 1 : 0);
            return;
        }
        Animated.timing(ring, {
            toValue: selected ? 1 : 0, duration: theme.motion.duration.base,
            easing: Easing.out(Easing.quad), useNativeDriver: true,
        }).start();
        if (selected) {
            scale.setValue(0.97);
            Animated.spring(scale, { toValue: 1, ...theme.motion.spring.snappy, useNativeDriver: true }).start();
        }
    }, [selected, reduceMotion]);

    return (
        <Pressable
            onPress={onPress}
            disabled={locked}
            accessibilityRole="radio"
            accessibilityLabel={a11yLabel}
            accessibilityState={{ checked: selected, disabled: locked }}
        >
            <Animated.View
                style={{
                    minHeight: 72, borderRadius: theme.v2Layout.radius.card,
                    paddingVertical: 12, paddingHorizontal: 16,
                    borderWidth: 1.5, borderColor: current && !selected ? U.lineAccent : U.lineNeutral,
                    backgroundColor: U.surface,
                    flexDirection: "row", alignItems: "center", gap: 14,
                    // Üstünde olunan plan sönmez — o bir bilgi, bir kısıt değil.
                    opacity: locked && !current ? 0.45 : 1,
                    transform: [{ scale }],
                }}
            >
                {/* The gold ring: its own layer so it can fade on the native driver. */}
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: "absolute", top: -1.5, left: -1.5, right: -1.5, bottom: -1.5,
                        borderRadius: theme.v2Layout.radius.card,
                        borderWidth: 1.5, borderColor: U.accent,
                        ...theme.elevation.goldGlow, shadowOpacity: 0.18,
                        opacity: ring,
                    }}
                />

                <View style={{
                    width: 20, height: 20, borderRadius: 10,
                    borderWidth: selected ? 6 : 1.5,
                    borderColor: selected ? U.accentBright : U.inkMuted,
                }} />

                <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Text style={{ ...theme.v2.tier, color: U.ink }}>{upper(label)}</Text>
                        {current ? (
                            <View style={{
                                paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.v2Layout.radius.pill,
                                backgroundColor: U.lineAccent, borderWidth: 1, borderColor: U.accent,
                            }}>
                                <Text style={{ ...theme.v2.captionStrong, color: U.accentBright }}>
                                    {upper(currentLabel)}
                                </Text>
                            </View>
                        ) : badge ? (
                            <View style={{
                                paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.v2Layout.radius.pill,
                                backgroundColor: U.accentBright,
                            }}>
                                <Text style={{ ...theme.v2.captionStrong, color: U.buttonInk }}>{badge}</Text>
                            </View>
                        ) : null}
                    </View>
                    {then ? (
                        <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted }}>{then}</Text>
                    ) : null}
                </View>

                <View style={{ alignItems: "flex-end" }}>
                    {price ? (
                        <Text style={{ ...theme.v2.displayS, color: U.ink }}>{price}</Text>
                    ) : (
                        <PriceSkeleton />
                    )}
                    <Text style={{ ...theme.v2.caption, color: U.inkMuted }}>{period}</Text>
                </View>
            </Animated.View>
        </Pressable>
    );
}

/** A price that has not arrived yet: a quiet bar, never a wrong number. */
export function PriceSkeleton() {
    const pulse = useRef(new Animated.Value(0.35)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 0.7, duration: 650, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0.35, duration: 650, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <Animated.View
            style={{ width: 66, height: 24, borderRadius: 6, backgroundColor: U.lineAccent, opacity: pulse, marginBottom: 4 }}
        />
    );
}

/**
 * Text that cross-fades when it changes — the price on the buy button as the
 * plan changes. A quick fade-up of the new value; nothing under Reduce Motion.
 */
export function FadeSwapText({
    text, style, reduceMotion,
}: { text: string; style: object; reduceMotion: boolean }) {
    const fade = useRef(new Animated.Value(1)).current;
    const last = useRef(text);
    useEffect(() => {
        if (last.current === text) return;
        last.current = text;
        if (reduceMotion) {
            fade.setValue(1);
            return;
        }
        fade.setValue(0);
        Animated.timing(fade, {
            toValue: 1, duration: theme.motion.duration.fast,
            easing: Easing.out(Easing.quad), useNativeDriver: true,
        }).start();
    }, [text, reduceMotion]);
    const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [4, 0] });
    return (
        <Animated.Text style={[style, { opacity: fade, transform: [{ translateY }] }]} numberOfLines={1}>
            {text}
        </Animated.Text>
    );
}
