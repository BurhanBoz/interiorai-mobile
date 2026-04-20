import { Pressable, Text, View, ActivityIndicator, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";

/**
 * The signature "soft-premium" gold gradient CTA used across the app.
 *
 * Visual contract (matches Studio "Continue to Architecture" / Step 1 of 4):
 *   - height 56, radius 16, 1px warm border
 *   - warm tan gradient #C4A882 → #A68A62
 *   - uppercase label, 14px, weight 700, letterSpacing 1.5, color #3F2D11
 *   - right-aligned caret icon (overrideable)
 *   - scale 0.98 on press for tactile feedback
 *
 * Use this for every primary call-to-action so the app reads as one product.
 * If you need a secondary look (outline / text-only) don't override here —
 * build a sibling component instead.
 */
type IconName = ComponentProps<typeof Ionicons>["name"];

interface PrimaryButtonProps {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    /** Right-side icon. Pass `null` to hide completely. Defaults to arrow-forward. */
    icon?: IconName | null;
    /** Put the icon on the left and hide the default right icon. */
    leftIcon?: IconName;
    /** Extra margin/width overrides. Avoid overriding the visual contract here. */
    style?: ViewStyle;
    /** Rare override for the accent palette (e.g. destructive — red). Default stays. */
    colors?: readonly [string, string];
    /** Slot for custom content above the label (e.g. sub-label). */
    children?: ReactNode;
}

const DEFAULT_COLORS: readonly [string, string] = ["#C4A882", "#A68A62"];

export function PrimaryButton({
    label,
    onPress,
    disabled = false,
    loading = false,
    icon = "arrow-forward",
    leftIcon,
    style,
    colors = DEFAULT_COLORS,
    children,
}: PrimaryButtonProps) {
    const isDisabled = disabled || loading;

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => ({
                opacity: isDisabled ? 0.55 : 1,
                transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
                ...style,
            })}
        >
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    height: 56,
                    borderRadius: 16,
                    paddingHorizontal: 24,
                    borderWidth: 1,
                    borderColor: "rgba(196,168,130,0.3)",
                }}
            >
                <View className="flex-row items-center flex-1" style={{ gap: 12 }}>
                    {leftIcon && <Ionicons name={leftIcon} size={20} color="#3F2D11" />}
                    <View style={{ flex: 1 }}>
                        {children}
                        <Text
                            numberOfLines={1}
                            style={{
                                fontSize: 14,
                                fontWeight: "700",
                                letterSpacing: 1.5,
                                textTransform: "uppercase",
                                color: "#3F2D11",
                            }}
                        >
                            {label}
                        </Text>
                    </View>
                </View>
                {loading ? (
                    <ActivityIndicator color="#3F2D11" />
                ) : icon && !leftIcon ? (
                    <Ionicons name={icon} size={20} color="#3F2D11" />
                ) : null}
            </LinearGradient>
        </Pressable>
    );
}

export default PrimaryButton;
