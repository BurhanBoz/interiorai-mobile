import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Text, View, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";

const U = theme.umber;

/**
 * First-run heroes (2026-10-05): the three onboarding pages show what the app
 * actually makes, moving, instead of three still mood shots that were never
 * outputs. Every image here is a real render of the live pipeline (Sonnet 5.5 +
 * Nano Banana 2, or the founder's own Magic Edit / Outdoor runs) — Apple 2.3
 * applies to the first screen as much as to the store page.
 *
 * <p>Each hero animates only while its page is the one on screen, and stays
 * still under Reduce Motion.
 */

const ROOM_BEFORE = require("@/assets/features/empty_before.jpg");
const ROOM_AFTER = require("@/assets/features/paywall_after.jpg");

const SHOWCASE: { image: ImageSourcePropType; modeKey: string }[] = [
    { image: require("@/assets/features/redesign_after.jpg"), modeKey: "studio.mode_redesign" },
    { image: require("@/assets/features/empty_after.jpg"), modeKey: "studio.mode_empty_room" },
    { image: require("@/assets/features/style_after.jpg"), modeKey: "studio.mode_style_transfer" },
    { image: require("@/assets/features/inpaint_after.jpg"), modeKey: "studio.mode_inpaint" },
    { image: require("@/assets/features/outdoor_after.jpg"), modeKey: "studio.mode_outdoor" },
];

const WALL_LEFT = [
    require("@/assets/features/paywall_after.jpg"),
    require("@/assets/features/style_after.jpg"),
    require("@/assets/features/outdoor_after.jpg"),
];
const WALL_RIGHT = [
    require("@/assets/features/redesign_after.jpg"),
    require("@/assets/features/inpaint_after.jpg"),
    require("@/assets/features/empty_after.jpg"),
];

function useReduceMotion() {
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        let alive = true;
        AccessibilityInfo.isReduceMotionEnabled()
            .then((r) => { if (alive) setReduce(r); })
            .catch(() => {});
        const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
        return () => { alive = false; sub.remove(); };
    }, []);
    return reduce;
}

function Tag({ label, side }: { label: string; side: "left" | "right" }) {
    return (
        <View style={{
            position: "absolute", top: 104, [side]: 18,
            backgroundColor: U.photoChrome, borderWidth: 1, borderColor: U.photoChromeBorder,
            borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5,
        }}>
            <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 12, color: "#fff" }}>{label}</Text>
        </View>
    );
}

/**
 * Page 1 — the empty room furnishes itself. A seam sweeps right-to-left
 * revealing the render, holds, and sweeps back; the before stays put while its
 * window narrows, the same construction as the result screen's slider.
 */
export function WipeHero({ width, height, active }: { width: number; height: number; active: boolean }) {
    const { t } = useTranslation();
    const reduce = useReduceMotion();
    const reveal = useRef(new Animated.Value(width)).current;

    useEffect(() => {
        if (!active || reduce) {
            reveal.setValue(reduce ? width * 0.5 : width);
            return;
        }
        reveal.setValue(width);
        const loop = Animated.loop(Animated.sequence([
            Animated.delay(700),
            Animated.timing(reveal, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
            Animated.delay(1800),
            Animated.timing(reveal, { toValue: width, duration: 1600, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [active, reduce, reveal, width]);

    return (
        <View style={{ width, height, overflow: "hidden" }}>
            <Image source={ROOM_AFTER} style={{ width, height }} contentFit="cover" />
            <Animated.View style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: reveal, overflow: "hidden" }}>
                <Image source={ROOM_BEFORE} style={{ width, height }} contentFit="cover" />
            </Animated.View>
            <Animated.View style={{
                position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: U.accentBright,
                transform: [{ translateX: Animated.subtract(reveal, 1) }],
            }} />
            <Tag label={t("result.before")} side="left" />
            <Tag label={t("result.after")} side="right" />
        </View>
    );
}

/**
 * Page 2 — "six ways": one real output per mode, cross-fading with a slow
 * push-in, the mode named on each.
 */
export function ShowcaseHero({ width, height, active }: { width: number; height: number; active: boolean }) {
    const { t } = useTranslation();
    const reduce = useReduceMotion();
    const [i, setI] = useState(0);
    const fade = useRef(new Animated.Value(1)).current;
    const zoom = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!active || reduce) return;
        zoom.setValue(1);
        const push = Animated.timing(zoom, { toValue: 1.08, duration: 2600, easing: Easing.linear, useNativeDriver: true });
        push.start();
        const timer = setTimeout(() => {
            Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
                setI((n) => (n + 1) % SHOWCASE.length);
                Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
            });
        }, 2400);
        return () => { clearTimeout(timer); push.stop(); };
    }, [active, reduce, i, fade, zoom]);

    const item = SHOWCASE[i];
    return (
        <View style={{ width, height, overflow: "hidden" }}>
            <Animated.View style={{ width, height, opacity: fade, transform: [{ scale: zoom }] }}>
                <Image source={item.image} style={{ width, height }} contentFit="cover" />
            </Animated.View>
            <Animated.View style={{
                position: "absolute", top: 104, left: 18, opacity: fade,
                backgroundColor: U.ground, borderWidth: 1, borderColor: U.accent,
                borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5,
            }}>
                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 12, color: U.accentBright }}>{t(item.modeKey)}</Text>
            </Animated.View>
            <View style={{ position: "absolute", top: 110, right: 18, flexDirection: "row", gap: 5 }}>
                {SHOWCASE.map((_, n) => (
                    <View key={n} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: n === i ? U.accentBright : "rgba(255,255,255,0.35)" }} />
                ))}
            </View>
        </View>
    );
}

/**
 * Page 3 — a wall of real designs drifting past in two columns, opposite
 * directions: "this could be your room tomorrow".
 */
export function WallHero({ width, height, active }: { width: number; height: number; active: boolean }) {
    const reduce = useReduceMotion();
    const gap = 8;
    const colW = (width - gap * 3) / 2;
    const tileH = Math.round(colW * 1.25);
    const span = (tileH + gap) * WALL_LEFT.length;
    const drift = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!active || reduce) return;
        drift.setValue(0);
        const loop = Animated.loop(
            Animated.timing(drift, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true }),
        );
        loop.start();
        return () => loop.stop();
    }, [active, reduce, drift]);

    const column = (images: ImageSourcePropType[], up: boolean, x: number) => (
        <Animated.View style={{
            position: "absolute", left: x, top: up ? 0 : -span,
            transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: up ? [0, -span] : [0, span] }) }],
        }}>
            {[...images, ...images].map((src, n) => (
                <Image key={n} source={src} contentFit="cover"
                    style={{ width: colW, height: tileH, borderRadius: 14, marginBottom: gap }} />
            ))}
        </Animated.View>
    );

    return (
        <View style={{ width, height, overflow: "hidden", backgroundColor: U.ground }}>
            {column(WALL_LEFT, true, gap)}
            {column(WALL_RIGHT, false, gap * 2 + colW)}
        </View>
    );
}
