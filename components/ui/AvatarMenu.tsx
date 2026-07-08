import {
    View,
    Text,
    Pressable,
    Modal,
    Animated,
    Alert,
    StyleSheet,
} from "react-native";
import { useCallback, useRef, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { theme } from "@/config/theme";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Top-right header avatar + its anchored dropdown menu (2026-07 round 2c).
 *
 * <p>Quick personal actions live here — Favorites, Language, Sign Out —
 * while the account hub (plan, billing, privacy, delete) lives on the
 * Settings tab. Tapping the avatar no longer navigates; it opens this
 * menu, matching the avatar-menu pattern common in consumer photo apps.
 *
 * <p>Self-contained: renders the avatar button and owns the menu state,
 * so every header just drops in {@code <AvatarMenu />}. Positioning is
 * fixed to the top-right of the screen (all app headers are 56px under
 * the top inset, so one anchor works everywhere the avatar appears).
 */
export function AvatarMenu() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const logout = useAuthStore((s) => s.logout);

    const [open, setOpen] = useState(false);
    const anim = useRef(new Animated.Value(0)).current;

    const openMenu = useCallback(() => {
        Haptics.selectionAsync();
        setOpen(true);
        Animated.timing(anim, {
            toValue: 1,
            duration: 170,
            easing: theme.motion.easing.standard,
            useNativeDriver: true,
        }).start();
    }, [anim]);

    /** Fade out, unmount, then run the follow-up (navigation/alert) once
        the modal is gone — avoids the iOS modal-vs-navigation race. */
    const closeMenu = useCallback(
        (after?: () => void) => {
            Animated.timing(anim, {
                toValue: 0,
                duration: 120,
                easing: theme.motion.easing.standard,
                useNativeDriver: true,
            }).start(() => {
                setOpen(false);
                if (after) setTimeout(after, 40);
            });
        },
        [anim],
    );

    const handleSignOut = useCallback(() => {
        closeMenu(() => {
            Alert.alert(
                t("drawer.sign_out_confirm_title"),
                t("drawer.sign_out_confirm_description"),
                [
                    { text: t("common.cancel"), style: "cancel" },
                    {
                        text: t("drawer.sign_out"),
                        style: "destructive",
                        onPress: () => logout(),
                    },
                ],
            );
        });
    }, [closeMenu, logout, t]);

    const items: Array<{ icon: IconName; label: string; action: () => void }> = [
        {
            icon: "heart-outline",
            label: t("profile.curated_favorites"),
            action: () =>
                router.push({
                    pathname: "/(tabs)/gallery",
                    params: { filter: "favorites" },
                } as never),
        },
        {
            icon: "language-outline",
            label: t("settings.language_title"),
            action: () => router.push("/settings/language" as never),
        },
    ];

    const cardStyle = {
        opacity: anim,
        transform: [
            {
                translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                }),
            },
            {
                scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                }),
            },
        ],
    };

    return (
        <>
            <UserAvatar size="sm" onPress={openMenu} />

            <Modal
                visible={open}
                transparent
                animationType="none"
                statusBarTranslucent
                onRequestClose={() => closeMenu()}
            >
                {/* Scrim — light dim so the menu reads anchored, not modal */}
                <Animated.View
                    style={[
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: "rgba(0,0,0,0.35)", opacity: anim },
                    ]}
                >
                    <Pressable
                        style={StyleSheet.absoluteFillObject}
                        onPress={() => closeMenu()}
                        accessibilityLabel={t("common.close")}
                    />
                </Animated.View>

                <Animated.View
                    accessibilityRole="menu"
                    style={[
                        {
                            position: "absolute",
                            top: insets.top + 54,
                            right: 16,
                            minWidth: 228,
                            borderRadius: 16,
                            overflow: "hidden",
                            backgroundColor: "rgba(28,27,26,0.98)",
                            borderWidth: 1,
                            borderColor: "rgba(225,195,155,0.22)",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: 0.45,
                            shadowRadius: 28,
                            elevation: 16,
                            paddingVertical: 6,
                        },
                        cardStyle,
                    ]}
                >
                    {items.map((item) => (
                        <Pressable
                            key={item.label}
                            accessibilityRole="menuitem"
                            onPress={() => {
                                Haptics.selectionAsync();
                                closeMenu(item.action);
                            }}
                            style={({ pressed }) => ({
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 12,
                                paddingHorizontal: 16,
                                paddingVertical: 13,
                                backgroundColor: pressed
                                    ? "rgba(225,195,155,0.08)"
                                    : "transparent",
                            })}
                        >
                            <Ionicons
                                name={item.icon}
                                size={18}
                                color={theme.color.goldMidday}
                            />
                            <Text
                                style={{
                                    fontFamily: "Inter-Medium",
                                    fontSize: 14.5,
                                    letterSpacing: 0.1,
                                    color: theme.color.onSurface,
                                }}
                            >
                                {item.label}
                            </Text>
                        </Pressable>
                    ))}

                    <View
                        style={{
                            height: StyleSheet.hairlineWidth,
                            backgroundColor: "rgba(77,70,60,0.5)",
                            marginVertical: 6,
                            marginHorizontal: 12,
                        }}
                    />

                    <Pressable
                        accessibilityRole="menuitem"
                        onPress={handleSignOut}
                        style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 13,
                            backgroundColor: pressed
                                ? "rgba(217,138,123,0.10)"
                                : "transparent",
                        })}
                    >
                        <Ionicons
                            name="log-out-outline"
                            size={18}
                            color={theme.color.danger}
                        />
                        <Text
                            style={{
                                fontFamily: "Inter-Medium",
                                fontSize: 14.5,
                                letterSpacing: 0.1,
                                color: theme.color.danger,
                            }}
                        >
                            {t("drawer.sign_out")}
                        </Text>
                    </Pressable>
                </Animated.View>
            </Modal>
        </>
    );
}
