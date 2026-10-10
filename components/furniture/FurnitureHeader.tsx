import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config/theme";

const U = theme.umber;
const V = theme.v2;
const L = theme.v2Layout;

/**
 * The furniture picker's title block (redesign v3, 2026-10-10): the brand
 * kicker over a serif title, as on Gallery, with a round close button at the
 * top right. Static styles only — NativeWind drops Pressable style functions.
 */
export function FurnitureHeader({
    title, closeLabel, onClose,
}: {
    title: string;
    closeLabel: string;
    onClose: () => void;
}) {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
                paddingHorizontal: L.gutterWide,
                paddingTop: 10,
                paddingBottom: 16,
                gap: 12,
            }}
        >
            <View style={{ gap: 4, flexShrink: 1 }}>
                <Text style={{ ...V.brand, color: U.accent }}>ROOMFRAME</Text>
                <Text style={{ ...V.displayS, color: U.ink }} accessibilityRole="header" numberOfLines={2}>
                    {title}
                </Text>
            </View>
            <Pressable
                onPress={onClose}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    marginBottom: 1,
                    backgroundColor: U.surface,
                    borderWidth: 1,
                    borderColor: U.lineNeutral,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Ionicons name="close" size={20} color={U.ink} />
            </Pressable>
        </View>
    );
}
