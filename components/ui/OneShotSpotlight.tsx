import { View, Text, Pressable, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { theme } from "@/config/theme";

/**
 * One-shot teaching spotlight — THE single pattern for first-time hints
 * (2026-07-15 founder spec: "make them all like the onboarding prompts —
 * content in focus, background dimmed, gone on X or any tap").
 *
 * Dark backdrop + centered glass card. Tapping ANYWHERE (backdrop, card,
 * or the X) calls {@link onDismiss}; pair it with `useDismissible` so the
 * dismissal persists and the hint never returns.
 *
 * Used by: Studio "Analyze your space" photo tip, the generation
 * "About this style" card, and Magic Edit's paint intro.
 */
interface OneShotSpotlightProps {
    visible: boolean;
    onDismiss: () => void;
    /** Optional lead icon rendered above the content. */
    icon?: keyof typeof Ionicons.glyphMap;
    /** Plain-text convenience — rendered as the standard hint paragraph. */
    text?: string;
    /** Free-form content (rendered after `text` when both are given). */
    children?: ReactNode;
    /**
     * "center" (default) centers content — right for short hints.
     * "stretch" left-aligns — right for richer cards like style info.
     */
    align?: "center" | "stretch";
    cardStyle?: ViewStyle;
}

export function OneShotSpotlight({
    visible,
    onDismiss,
    icon,
    text,
    children,
    align = "center",
    cardStyle,
}: OneShotSpotlightProps) {
    const { t } = useTranslation();
    if (!visible) return null;

    return (
        <Pressable
            onPress={onDismiss}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(12,11,10,0.72)",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 32,
                zIndex: 50,
            }}
        >
            <View
                style={[
                    {
                        width: "100%",
                        borderRadius: 20,
                        backgroundColor: "#1C1B1B",
                        borderWidth: 1,
                        borderColor: "rgba(225,195,155,0.35)",
                        padding: 24,
                        gap: 14,
                        alignItems: align === "center" ? "center" : "stretch",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: 0.5,
                        shadowRadius: 24,
                    },
                    cardStyle,
                ]}
            >
                <Pressable
                    onPress={onDismiss}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t("common.close")}
                    style={{ position: "absolute", top: 10, right: 10, zIndex: 1 }}
                >
                    <Ionicons name="close" size={18} color="#998F84" />
                </Pressable>
                {icon ? (
                    <Ionicons
                        name={icon}
                        size={30}
                        color={theme.color.goldMidday}
                        style={align === "stretch" ? { alignSelf: "center" } : undefined}
                    />
                ) : null}
                {text ? (
                    <Text
                        style={{
                            color: "#EDE4D7",
                            fontSize: 14.5,
                            lineHeight: 21,
                            textAlign: align === "center" ? "center" : "left",
                            fontFamily: "Inter",
                        }}
                    >
                        {text}
                    </Text>
                ) : null}
                {children}
            </View>
        </Pressable>
    );
}
