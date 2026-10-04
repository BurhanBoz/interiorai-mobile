import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, useWindowDimensions, AccessibilityInfo, I18nManager } from "react-native";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import Animated, {
    Easing,
    useAnimatedProps,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";
import { measureTarget, type TargetRect } from "@/components/tour/tourTargets";

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** The warm dark of the app's ground, not a neutral black — the scrim belongs to the screen it covers. */
const SCRIM = "rgba(12,10,7,0.74)";
const EDGE = 16;
const GAP = 14;
const CARD_MAX = 360;

export type TourStep = {
    /** The id an element registered with tourTarget(). A step whose target is not on screen is skipped. */
    target: string;
    title: string;
    body: string;
    /** Space between the element and the edge of the spotlight. */
    padding?: number;
    radius?: number;
};

type Hole = { x: number; y: number; width: number; height: number; radius: number };

/**
 * First-run coach marks: the screen dims, one element at a time stays lit
 * inside a soft rounded spotlight with a slow halo, and a small card beside it
 * says what that element is for.
 *
 * <p>It only points. Nothing underneath is pressed or opened — a tap anywhere
 * moves to the next step, "Skip" ends the tour, and the last step's button
 * closes it. The spotlight glides from one element to the next instead of
 * jumping, so the eye follows it. Under Reduce Motion the halo stands still
 * and every move is instant.
 *
 * <p>It runs in a transparent {@link Modal}, so it covers the tab bar too and
 * its coordinates are the window's — the same space measureInWindow reports in.
 */
export function CoachMarks({
    steps,
    visible,
    onFinish,
}: {
    steps: TourStep[];
    visible: boolean;
    onFinish: (reason: "done" | "skip") => void;
}) {
    const { t } = useTranslation();
    const { width: screenW, height: screenH } = useWindowDimensions();
    const reduceMotion = useReducedMotion();

    const [index, setIndex] = useState(0);
    const [hole, setHole] = useState<Hole | null>(null);
    const placed = useRef(false);

    const hx = useSharedValue(0);
    const hy = useSharedValue(0);
    const hw = useSharedValue(0);
    const hh = useSharedValue(0);
    const hr = useSharedValue(16);
    const cardIn = useSharedValue(0);
    const halo = useSharedValue(0);

    useEffect(() => {
        if (!visible) {
            setIndex(0);
            setHole(null);
            placed.current = false;
        }
    }, [visible]);

    const toHole = useCallback(
        (r: TargetRect, step: TourStep): Hole => {
            const pad = step.padding ?? 8;
            const x = Math.max(6, r.x - pad);
            const y = Math.max(6, r.y - pad);
            const right = Math.min(screenW - 6, r.x + r.width + pad);
            const bottom = Math.min(screenH - 6, r.y + r.height + pad);
            return { x, y, width: right - x, height: bottom - y, radius: step.radius ?? 16 };
        },
        [screenW, screenH],
    );

    // Measure the current step's element and move the spotlight onto it.
    useEffect(() => {
        if (!visible || steps.length === 0) return;
        let cancelled = false;
        const step = steps[index];
        measureTarget(step.target).then((r) => {
            if (cancelled) return;
            if (!r) {
                // The element is not on screen (a list that has not loaded,
                // a control this mode does not show) — the tour moves on
                // rather than pointing at nothing.
                if (index < steps.length - 1) setIndex(index + 1);
                else onFinish("done");
                return;
            }
            const next = toHole(r, step);
            const duration = placed.current && !reduceMotion ? 420 : 0;
            const ease = Easing.bezier(0.22, 1, 0.36, 1);
            hx.value = withTiming(next.x, { duration, easing: ease });
            hy.value = withTiming(next.y, { duration, easing: ease });
            hw.value = withTiming(next.width, { duration, easing: ease });
            hh.value = withTiming(next.height, { duration, easing: ease });
            hr.value = withTiming(next.radius, { duration, easing: ease });
            placed.current = true;
            setHole(next);

            cardIn.value = 0;
            cardIn.value = withTiming(1, { duration: reduceMotion ? 0 : 260, easing: Easing.out(Easing.cubic) });
            AccessibilityInfo.announceForAccessibility(`${step.title}. ${step.body}`);
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, index, steps]);

    // The halo: one slow breath outward, again and again. Still under Reduce Motion.
    useEffect(() => {
        if (!visible || reduceMotion) {
            halo.value = 0;
            return;
        }
        halo.value = 0;
        halo.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }),
                withTiming(0, { duration: 0 }),
            ),
            -1,
        );
    }, [visible, reduceMotion, halo]);

    const holeProps = useAnimatedProps(() => ({
        x: hx.value,
        y: hy.value,
        width: hw.value,
        height: hh.value,
        rx: hr.value,
        ry: hr.value,
    }));

    const ringStyle = useAnimatedStyle(() => ({
        left: hx.value,
        top: hy.value,
        width: hw.value,
        height: hh.value,
        borderRadius: hr.value,
    }));

    const haloStyle = useAnimatedStyle(() => ({
        left: hx.value,
        top: hy.value,
        width: hw.value,
        height: hh.value,
        borderRadius: hr.value,
        opacity: reduceMotion ? 0 : 0.55 * (1 - halo.value),
        transform: [{ scale: 1 + 0.06 * halo.value }],
    }), [reduceMotion]);

    const below = hole ? hole.y + hole.height / 2 < screenH * 0.52 : true;
    const cardStyle = useAnimatedStyle(() => ({
        opacity: cardIn.value,
        transform: [{ translateY: (1 - cardIn.value) * (below ? -8 : 8) }],
    }), [below]);

    const advance = () => {
        Haptics.selectionAsync();
        if (index < steps.length - 1) setIndex(index + 1);
        else onFinish("done");
    };
    const skip = () => {
        Haptics.selectionAsync();
        onFinish("skip");
    };

    if (!visible || steps.length === 0) return null;

    const step = steps[index];
    const last = index === steps.length - 1;
    const cardW = Math.min(screenW - EDGE * 2, CARD_MAX);
    const centerX = hole ? hole.x + hole.width / 2 : screenW / 2;
    const cardLeft = Math.min(Math.max(centerX - cardW / 2, EDGE), screenW - EDGE - cardW);
    const arrowLeft = Math.min(Math.max(centerX - cardLeft - 7, 22), cardW - 36);

    return (
        <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={skip}>
            {/* Geometry here is physical — measureInWindow reports it that way —
                but under RTL React Native swaps left and right. The overlay is
                laid out LTR; the card's content gets the reading direction back. */}
            <View style={{ flex: 1, direction: "ltr" }} accessibilityViewIsModal>
                <Pressable
                    style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
                    onPress={advance}
                    accessibilityRole="button"
                    accessibilityLabel={last ? t("tour.done") : t("tour.next")}
                >
                    <Svg width={screenW} height={screenH}>
                        <Defs>
                            <Mask id="tour-spotlight" x="0" y="0" width={screenW} height={screenH}>
                                <Rect x="0" y="0" width={screenW} height={screenH} fill="#fff" />
                                <AnimatedRect animatedProps={holeProps} fill="#000" />
                            </Mask>
                        </Defs>
                        <Rect
                            x="0"
                            y="0"
                            width={screenW}
                            height={screenH}
                            fill={SCRIM}
                            mask="url(#tour-spotlight)"
                        />
                    </Svg>
                </Pressable>

                {hole && (
                    <>
                        <Animated.View
                            pointerEvents="none"
                            style={[{ position: "absolute", borderWidth: 2, borderColor: U.accent }, haloStyle]}
                        />
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                { position: "absolute", borderWidth: 1.5, borderColor: U.accentBright },
                                ringStyle,
                            ]}
                        />

                        <Animated.View
                            style={[
                                {
                                    position: "absolute",
                                    left: cardLeft,
                                    width: cardW,
                                    ...(below
                                        ? { top: hole.y + hole.height + GAP }
                                        : { bottom: screenH - hole.y + GAP }),
                                },
                                cardStyle,
                            ]}
                        >
                            <View
                                style={{
                                    position: "absolute",
                                    left: arrowLeft,
                                    width: 14,
                                    height: 14,
                                    backgroundColor: U.sheetSurface,
                                    borderColor: U.lineAccent,
                                    borderLeftWidth: below ? 1 : 0,
                                    borderTopWidth: below ? 1 : 0,
                                    borderRightWidth: below ? 0 : 1,
                                    borderBottomWidth: below ? 0 : 1,
                                    transform: [{ rotate: "45deg" }],
                                    ...(below ? { top: -7 } : { bottom: -7 }),
                                }}
                            />
                            <View
                                style={{
                                    direction: I18nManager.isRTL ? "rtl" : "ltr",
                                    backgroundColor: U.sheetSurface,
                                    borderWidth: 1,
                                    borderColor: U.lineAccent,
                                    borderRadius: R.card,
                                    paddingTop: 16,
                                    paddingHorizontal: 18,
                                    paddingBottom: 14,
                                    shadowColor: "#000",
                                    shadowOpacity: 0.35,
                                    shadowRadius: 18,
                                    shadowOffset: { width: 0, height: 8 },
                                }}
                            >
                                <Text style={{ ...V.displayXS, color: U.ink }}>{step.title}</Text>
                                <Text
                                    style={{
                                        fontFamily: "Inter",
                                        fontSize: 13.5,
                                        lineHeight: 19,
                                        color: U.inkMuted,
                                        marginTop: 6,
                                    }}
                                >
                                    {step.body}
                                </Text>

                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        marginTop: 14,
                                        gap: 12,
                                    }}
                                >
                                    <View
                                        style={{ flexDirection: "row", gap: 5, flex: 1 }}
                                        accessibilityLabel={t("tour.step_label", {
                                            current: index + 1,
                                            total: steps.length,
                                        })}
                                    >
                                        {steps.map((s, i) => (
                                            <View
                                                key={s.target}
                                                style={{
                                                    width: i === index ? 16 : 6,
                                                    height: 6,
                                                    borderRadius: 3,
                                                    backgroundColor: i === index ? U.accent : U.lineNeutral,
                                                }}
                                            />
                                        ))}
                                    </View>

                                    {!last && (
                                        <Pressable
                                            onPress={skip}
                                            hitSlop={10}
                                            accessibilityRole="button"
                                        >
                                            <Text
                                                style={{ fontFamily: "Inter-SemiBold", fontSize: 13, color: U.inkMuted }}
                                            >
                                                {t("tour.skip")}
                                            </Text>
                                        </Pressable>
                                    )}
                                    <Pressable
                                        onPress={advance}
                                        accessibilityRole="button"
                                        style={{
                                            backgroundColor: U.buttonFill,
                                            borderRadius: R.pill,
                                            paddingVertical: 9,
                                            paddingHorizontal: 18,
                                        }}
                                    >
                                        <Text style={{ fontFamily: "Inter-Bold", fontSize: 13, color: U.buttonInk }}>
                                            {last ? t("tour.done") : t("tour.next")}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </Animated.View>
                    </>
                )}
            </View>
        </Modal>
    );
}
