import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { theme } from "@/config/theme";

const U = theme.umber;
const V = theme.v2;
const L = theme.v2Layout;

/**
 * A Gallery filter chip (redesign v3, 2026-10-10): gold fill with dark ink
 * when selected, a hairline outline otherwise.
 *
 * <p>🔴 Görünüm Pressable'da DEĞİL, içerideki View'da. Çip bir dönem
 * dolgusunu ({pressed}) => ({…}) fonksiyonundan alıyordu ve o stil
 * uygulanmıyordu: seçili çipin altın zemini hiç çizilmiyor, geriye yalnız o
 * zemin için seçilmiş KOYU metin kalıyordu — koyu zeminde koyu yazı. Kök
 * nedeni kanıtlanamadı (NativeWind fonksiyon stilini düşürüyor); neden aramak
 * yerine kırılamayacak biçime geçildi ve öyle kalıyor.
 *
 * <p>Motion: a light spring when a chip BECOMES selected — not on mount, so
 * the chip that arrives selected (All, or Favorites from the deep link) does
 * not bounce for no reason. Reduce Motion: none.
 */
export function GalleryFilterChip({
    label, active, onPress, badge, reduceMotion,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    /** Live count shown as a dot-badge — used by Activity for in-flight jobs. */
    badge?: number;
    reduceMotion: boolean;
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const wasActive = useRef(active);

    useEffect(() => {
        const became = active && !wasActive.current;
        wasActive.current = active;
        if (!became || reduceMotion) return;
        scale.setValue(0.94);
        Animated.spring(scale, {
            toValue: 1,
            damping: 12,
            stiffness: 260,
            mass: 0.6,
            useNativeDriver: true,
        }).start();
    }, [active, reduceMotion, scale]);

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={badge ? `${label}, ${badge}` : label}
            accessibilityState={{ selected: active }}
            // 36 pt chip + 4 pt above and below = the 44 pt target.
            hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
        >
            <Animated.View style={{ height: 36, transform: [{ scale }] }}>
                <View
                    style={{
                        height: 36,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 16,
                        borderRadius: L.radius.pill,
                        backgroundColor: active ? U.accentBright : "transparent",
                        borderWidth: 1,
                        borderColor: active ? U.accentBright : U.lineNeutral,
                    }}
                >
                    <Text
                        style={{ ...V.row, color: active ? U.buttonInk : theme.color.onSurfaceVariant }}
                        numberOfLines={1}
                    >
                        {label}
                    </Text>
                    {badge ? (
                        <View
                            style={{
                                minWidth: 18,
                                paddingHorizontal: 5,
                                paddingVertical: 1,
                                borderRadius: L.radius.pill,
                                backgroundColor: active ? U.buttonInk : U.accent,
                                alignItems: "center",
                            }}
                        >
                            <Text style={{ ...theme.text.label, color: active ? U.accentBright : U.buttonInk }}>
                                {badge}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </Animated.View>
        </Pressable>
    );
}
