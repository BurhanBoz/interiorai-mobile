import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

/**
 * Free plan brand pill — bottom-right corner of an image, solid enough to
 * stay legible on any background but small enough not to compete with the
 * design itself. Previously we covered the whole image with a tiled
 * watermark which made Free outputs feel unusable; this replaces that with
 * a subtle corner mark a user might even tolerate in a screenshot.
 *
 * Position is absolute, so parent must be `position: relative` with a fixed
 * aspect ratio container. Pass `size="sm"` for gallery tiles.
 */
export function FreeWatermark({
    size = "md",
}: {
    size?: "sm" | "md";
}) {
    const isSmall = size === "sm";
    return (
        <View
            style={{
                position: "absolute",
                right: isSmall ? 8 : 12,
                bottom: isSmall ? 8 : 12,
                borderRadius: 999,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(225,195,155,0.45)",
            }}
            pointerEvents="none"
        >
            <BlurView intensity={40} tint="dark">
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: isSmall ? 4 : 6,
                        paddingHorizontal: isSmall ? 8 : 12,
                        paddingVertical: isSmall ? 4 : 6,
                        backgroundColor: "rgba(19,19,19,0.72)",
                    }}
                >
                    <Ionicons
                        name="sparkles"
                        size={isSmall ? 10 : 12}
                        color="#E0C29A"
                    />
                    <Text
                        style={{
                            fontSize: isSmall ? 9 : 10,
                            fontWeight: "700",
                            letterSpacing: isSmall ? 1 : 1.5,
                            textTransform: "uppercase",
                            color: "#E0C29A",
                        }}
                    >
                        Interior AI
                    </Text>
                </View>
            </BlurView>
        </View>
    );
}
