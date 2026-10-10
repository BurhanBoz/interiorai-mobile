import { useRef } from "react";
import { ActivityIndicator, Animated, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config/theme";

const U = theme.umber;
const V = theme.v2;
const L = theme.v2Layout;

/**
 * "Use my own photo" — the first cell of the furniture catalogue (redesign v3,
 * 2026-10-10). The dashed gold card of the Gallery's "+ New design" cell, laid
 * out as a row: a round camera well, the title, the hint, a chevron.
 *
 * <p>Static Pressable style (NativeWind drops style functions); the press
 * spring is an Animated value. Reduce Motion: no spring.
 */
export function OwnPhotoCard({
    title, hint, uploading, disabled, reduceMotion, onPress,
}: {
    title: string;
    hint: string;
    uploading: boolean;
    disabled: boolean;
    reduceMotion: boolean;
    onPress: () => void;
}) {
    const press = useRef(new Animated.Value(1)).current;
    const pressTo = (v: number) => {
        if (reduceMotion) return;
        Animated.spring(press, { toValue: v, ...theme.motion.spring.snappy, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: press }], opacity: disabled && !uploading ? 0.45 : 1 }}>
            <Pressable
                onPress={onPress}
                onPressIn={() => pressTo(0.98)}
                onPressOut={() => pressTo(1)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={title}
                accessibilityHint={hint}
                accessibilityState={{ disabled, busy: uploading }}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: L.radius.card,
                    borderWidth: 1,
                    borderColor: U.accent,
                    borderStyle: "dashed",
                    backgroundColor: U.lineAccent,
                }}
            >
                <View
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: U.surface,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {uploading ? (
                        <ActivityIndicator size="small" color={U.accent} />
                    ) : (
                        <Ionicons name="camera-outline" size={21} color={U.accentBright} />
                    )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ ...V.row, fontSize: 14, color: U.ink }} numberOfLines={1}>
                        {title}
                    </Text>
                    <Text style={{ ...V.caption, color: U.inkMuted }} numberOfLines={2}>
                        {hint}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={U.accent} />
            </Pressable>
        </Animated.View>
    );
}
