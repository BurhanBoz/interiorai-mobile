import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config/theme";

const U = theme.umber;
const V = theme.v2;
const L = theme.v2Layout;

/**
 * One piece in the furniture catalogue's three-column grid (redesign v3,
 * 2026-10-10).
 *
 * <p>A surface card holding a LIGHT well ({@code productPlate}): every
 * catalogue image is a cut-out shot against white, so a dark well would leave
 * each sofa floating on its own pale halo. Name (two lines max) and the width
 * caption sit under the well, on the card.
 *
 * <p>🔴 The outer Animated.View is sized explicitly ({@code width}). An
 * Animated wrapper without a size whose child is {@code flex: 1} collapses in
 * a FlatList row — see GalleryCard.
 *
 * <p>🔴 The Pressable takes a STATIC style; NativeWind drops
 * {@code ({ pressed }) => …}. The press spring is an Animated value driven from
 * onPressIn/onPressOut. Reduce Motion: no entrance, no spring.
 */
export function FurnitureTile({
    width, name, imageUrl, widthCm, chosen, disabled, enterDelay, reduceMotion, onPress,
}: {
    width: number;
    name: string;
    imageUrl: string;
    widthCm?: number | null;
    /** Already in this design — gold ring + check. */
    chosen: boolean;
    disabled: boolean;
    /** ms before the entrance starts, or null to render settled. */
    enterDelay: number | null;
    reduceMotion: boolean;
    onPress: () => void;
}) {
    const animateIn = enterDelay !== null && !reduceMotion;
    // Read once, at mount: a tile that mounts later (scrolled into the window)
    // is settled.
    const enter = useRef(new Animated.Value(animateIn ? 0 : 1)).current;
    const press = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!animateIn) return;
        const anim = Animated.timing(enter, {
            toValue: 1,
            duration: theme.motion.duration.slow,
            delay: enterDelay ?? 0,
            easing: theme.motion.easing.enter,
            useNativeDriver: true,
        });
        anim.start();
        return () => anim.stop();
        // Mount-only on purpose — see the comment on `enter`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pressTo = (v: number) => {
        if (reduceMotion) return;
        Animated.spring(press, { toValue: v, ...theme.motion.spring.snappy, useNativeDriver: true }).start();
    };

    const radius = L.radius.tile;
    const wellRadius = L.radius.tile - 5;

    return (
        <Animated.View
            style={{
                width,
                opacity: enter,
                transform: [
                    { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
                    { scale: press },
                ],
            }}
        >
            <Pressable
                onPress={onPress}
                onPressIn={() => pressTo(0.96)}
                onPressOut={() => pressTo(1)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={name}
                accessibilityState={{ disabled, selected: chosen }}
                style={{
                    width,
                    padding: 5,
                    borderRadius: radius,
                    backgroundColor: U.surface,
                    borderWidth: 1.5,
                    borderColor: chosen ? U.accent : U.lineNeutral,
                    opacity: disabled && !chosen ? 0.4 : 1,
                }}
            >
                <View
                    style={{
                        width: "100%",
                        aspectRatio: 1,
                        borderRadius: wellRadius,
                        overflow: "hidden",
                        backgroundColor: U.productPlate,
                    }}
                >
                    <Image
                        source={{ uri: imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="contain"
                        transition={160}
                    />
                    {chosen && (
                        <View
                            pointerEvents="none"
                            style={{
                                position: "absolute",
                                top: 6,
                                right: 6,
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: U.accentBright,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Ionicons name="checkmark" size={14} color={U.buttonInk} />
                        </View>
                    )}
                </View>
                <View style={{ paddingHorizontal: 3, paddingTop: 7, paddingBottom: 3 }}>
                    <Text
                        style={{ ...V.tile, fontFamily: "Inter-SemiBold", color: chosen ? U.accentBright : U.ink }}
                        numberOfLines={2}
                    >
                        {name}
                    </Text>
                    {/* Centimetres, because the whole point of the catalogue is
                        that the size is known rather than inferred from a
                        photograph. */}
                    {widthCm ? (
                        <Text style={{ ...V.caption, color: U.inkMuted, marginTop: 2 }} numberOfLines={1}>
                            {widthCm} cm
                        </Text>
                    ) : null}
                </View>
            </Pressable>
        </Animated.View>
    );
}
