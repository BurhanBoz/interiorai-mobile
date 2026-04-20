import { View, Text, ViewStyle, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/authStore";

/**
 * The signature dark-surface + gold-initials avatar used across the app.
 *
 * Replaces every hardcoded pravatar.cc URL. Always shows the current user's
 * initials when available, falling back to a gentle person icon when they
 * haven't set a display name.
 *
 * Sizes:
 *   - "sm"  (32x32, circle)  — header corner
 *   - "md"  (48x48, circle)  — card avatars
 *   - "hero" (100x120, r-xl) — big profile hero avatar
 *
 * All sizes share the same palette so the app feels cohesive. Once the user
 * adds real profile photos later, only this component needs to change.
 */
export type UserAvatarSize = "sm" | "md" | "hero";

interface UserAvatarProps {
    size?: UserAvatarSize;
    /** Optional override (useful for other people's avatars in reviews/comments). */
    initialsOverride?: string | null;
    /** Optional style override for the outer container. */
    style?: ViewStyle;
    /**
     * When provided, wraps the avatar in a Pressable. Pass `true` to use the
     * default behavior of navigating to the profile tab — a common UX pattern
     * for top-right header avatars across the app.
     */
    onPress?: (() => void) | true;
}

const SIZE_MAP = {
    sm: {
        width: 32,
        height: 32,
        borderRadius: 16,
        iconSize: 14,
        fontSize: 11,
    },
    md: {
        width: 48,
        height: 48,
        borderRadius: 24,
        iconSize: 20,
        fontSize: 14,
    },
    hero: {
        width: 100,
        height: 120,
        borderRadius: 12,
        iconSize: 42,
        fontSize: 36,
    },
} as const;

export function UserAvatar({ size = "sm", initialsOverride, style, onPress }: UserAvatarProps) {
    const user = useAuthStore((s) => s.user);

    const initials = useMemo(() => {
        if (initialsOverride !== undefined) return initialsOverride;
        if (!user?.displayName) return null;
        return (
            user.displayName
                .split(" ")
                .filter((w) => w.length > 0)
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || null
        );
    }, [user?.displayName, initialsOverride]);

    const dims = SIZE_MAP[size];

    const containerStyle: ViewStyle[] = [
        {
            width: dims.width,
            height: dims.height,
            borderRadius: dims.borderRadius,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.20)",
            backgroundColor: "#2A2A2A",
            alignItems: "center",
            justifyContent: "center",
        },
    ];
    if (size === "hero") {
        containerStyle.push({
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 12,
        } as ViewStyle);
    }
    if (style) containerStyle.push(style);

    const inner = initials ? (
        <Text
            className={size === "hero" ? "font-headline" : "font-label"}
            style={{
                fontSize: dims.fontSize,
                color: "#E0C29A",
                fontWeight: size === "hero" ? "400" : "700",
                letterSpacing: size === "hero" ? 2 : 0.5,
            }}
        >
            {initials}
        </Text>
    ) : (
        <Ionicons name="person" size={dims.iconSize} color="#998F84" />
    );

    if (onPress) {
        const handler = onPress === true
            ? () => router.push("/(tabs)/profile")
            : onPress;
        return (
            <Pressable
                onPress={handler}
                hitSlop={8}
                style={({ pressed }) => [
                    ...containerStyle,
                    pressed && { opacity: 0.7 },
                ]}
            >
                {inner}
            </Pressable>
        );
    }

    return <View style={containerStyle}>{inner}</View>;
}

export default UserAvatar;
