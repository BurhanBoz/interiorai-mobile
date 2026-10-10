import { useEffect, useRef, type ReactNode } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { Image as ExpoImage, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { theme, track as tracking } from "@/config/theme";

const U = theme.umber;

type IoniconName = keyof typeof Ionicons.glyphMap;

/** What the top of the paywall shows — the moment that opened it. */
export type PaywallHeroSpec =
    /** The redesigned room full-bleed, the original as an inset thumbnail. */
    | { kind: "pair"; before: ImageSource | number; after: ImageSource | number }
    /** One photograph with a label chip — the waiting room, or the design about to move. */
    | { kind: "photo"; image: ImageSource | number; chip: string; icon: IoniconName }
    /** The two Pro-only tools, side by side. */
    | { kind: "pro"; left: { image: number; label: string }; right: { image: number; label: string } };

/**
 * The full-bleed top of the v3 paywall ("5B", 2026-10-10).
 *
 * <p>The photograph runs under the status bar and fades into the ground, so
 * the headline sits ON the room rather than above a framed card. The whole
 * picture drifts (Ken Burns, 1.0 → 1.06 over 12 s and back) on the native
 * driver; with Reduce Motion it simply stands still.
 *
 * <p>The close button is NOT drawn here: the hero scrolls on small phones and
 * the X must never scroll away, so the screen pins it over everything.
 */
export function PaywallHero({
    spec, height, topInset, kicker, title, beforeLabel, reduceMotion,
}: {
    spec: PaywallHeroSpec;
    height: number;
    /** Safe-area top — the inset thumbnail and chip start below the status bar and the X. */
    topInset: number;
    kicker: string;
    title: string;
    beforeLabel: string;
    reduceMotion: boolean;
}) {
    const drift = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (reduceMotion) {
            drift.setValue(0);
            return;
        }
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(drift, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(drift, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [reduceMotion]);
    const scale = drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

    const a11yLabel = spec.kind === "pro"
        ? `${spec.left.label}, ${spec.right.label}`
        : spec.kind === "photo" ? spec.chip : `${beforeLabel} / ${title}`;

    let picture: ReactNode;
    if (spec.kind === "pro") {
        picture = (
            <View style={{ flex: 1, flexDirection: "row", gap: 2 }}>
                <ExpoImage source={spec.left.image} style={{ flex: 1 }} contentFit="cover" transition={200} />
                <ExpoImage source={spec.right.image} style={{ flex: 1 }} contentFit="cover" transition={200} />
            </View>
        );
    } else {
        picture = (
            <ExpoImage
                source={spec.kind === "pair" ? spec.after : spec.image}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
            />
        );
    }

    const insetTop = topInset + 48;

    return (
        <View
            style={{ height, width: "100%", overflow: "hidden", backgroundColor: U.surface }}
        >
            <Animated.View
                style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}
                accessible
                accessibilityRole="image"
                accessibilityLabel={a11yLabel}
            >
                {picture}
            </Animated.View>

            {/* Dark at the very top so the status bar and the X read on any
                photo, clear through the middle, and into the ground at the
                bottom so the headline sits on the room. */}
            <LinearGradient
                pointerEvents="none"
                colors={[U.overlayScrim, "transparent", "transparent", U.overlayScrim, U.ground]}
                locations={[0, 0.3, 0.5, 0.78, 1]}
                style={StyleSheet.absoluteFill}
            />

            {spec.kind === "pair" ? (
                <View
                    style={{
                        position: "absolute", left: 14, top: insetTop, width: 92, height: 116,
                        borderRadius: theme.v2Layout.radius.thumb, overflow: "hidden",
                        borderWidth: 2, borderColor: U.ink, backgroundColor: U.surface,
                        ...theme.elevation.md,
                    }}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                >
                    <ExpoImage source={spec.before} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
                    <View style={{
                        position: "absolute", left: 0, right: 0, bottom: 0, paddingVertical: 3,
                        backgroundColor: U.photoChrome, alignItems: "center",
                    }}>
                        <UpperLabel text={beforeLabel} />
                    </View>
                </View>
            ) : spec.kind === "photo" ? (
                <View style={{ position: "absolute", left: 14, top: insetTop }}>
                    <HeroChip label={spec.chip} icon={spec.icon} />
                </View>
            ) : (
                <>
                    <View style={{ position: "absolute", left: 14, top: insetTop }}>
                        <HeroChip label={spec.left.label} />
                    </View>
                    <View style={{ position: "absolute", left: "50%", marginLeft: 14, top: insetTop }}>
                        <HeroChip label={spec.right.label} />
                    </View>
                </>
            )}

            <View
                pointerEvents="none"
                style={{ position: "absolute", left: 20, right: 20, bottom: 6, gap: 4 }}
            >
                <Text style={{ ...theme.v2.kicker, color: U.accent }} accessibilityElementsHidden importantForAccessibility="no">
                    {kicker}
                </Text>
                <Text
                    style={{ ...theme.v2.displayM, color: U.ink }}
                    accessibilityRole="header"
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {title}
                </Text>
            </View>
        </View>
    );
}

/** Locale-aware capitals: Turkish "i" is "İ", not "I". */
function UpperLabel({ text }: { text: string }) {
    const { i18n } = useTranslation();
    return (
        <Text style={{ ...theme.v2.captionStrong, letterSpacing: tracking(1.2), color: U.ink }}>
            {text.toLocaleUpperCase(i18n.language)}
        </Text>
    );
}

/** A pill over a photograph: its own dark fill, whatever the photo. */
function HeroChip({ label, icon }: { label: string; icon?: IoniconName }) {
    return (
        <View style={{
            flexDirection: "row", alignItems: "center", gap: 5,
            paddingHorizontal: 9, paddingVertical: 4, borderRadius: theme.v2Layout.radius.pill,
            backgroundColor: U.photoChrome, borderWidth: 1, borderColor: U.photoChromeBorder,
        }}>
            {icon ? <Ionicons name={icon} size={12} color={U.ink} /> : null}
            <UpperLabel text={label} />
        </View>
    );
}
