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
import { BlurView } from "expo-blur";
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
 *
 * <p>Row layout mirrors {@link ListItem}: the Pressable only carries the
 * press-flash background, and an inner View owns flexDirection — putting
 * row styles on the Pressable's style-function has rendered inconsistently
 * in this app before (see ListItem / the retired SideDrawer notes).
 */

/* ───────── MenuRow — icon tile + label, ListItem visual language ───────── */

function MenuRow({
    icon,
    label,
    destructive = false,
    onPress,
}: {
    icon: IconName;
    label: string;
    destructive?: boolean;
    onPress: () => void;
}) {
    const tint = destructive ? theme.color.danger : theme.color.goldMidday;
    return (
        <Pressable
            accessibilityRole="menuitem"
            onPress={onPress}
            style={({ pressed }) => ({
                marginHorizontal: 8,
                borderRadius: 14,
                backgroundColor: pressed
                    ? destructive
                        ? "rgba(217,138,123,0.08)"
                        : "rgba(225,195,155,0.07)"
                    : "transparent",
            })}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 11,
                }}
            >
                <View
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 11,
                        backgroundColor: destructive
                            ? "rgba(217,138,123,0.08)"
                            : "rgba(225,195,155,0.08)",
                        borderWidth: 1,
                        borderColor: destructive
                            ? "rgba(217,138,123,0.16)"
                            : "rgba(225,195,155,0.14)",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Ionicons name={icon} size={17} color={tint} />
                </View>
                <Text
                    style={{
                        fontFamily: "Inter-Medium",
                        fontSize: 15,
                        letterSpacing: 0.1,
                        color: destructive
                            ? theme.color.danger
                            : theme.color.onSurface,
                    }}
                >
                    {label}
                </Text>
            </View>
        </Pressable>
    );
}

/* ───────── AvatarMenu ───────── */

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
            duration: 180,
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
                duration: 130,
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

    const cardStyle = {
        opacity: anim,
        transform: [
            {
                translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
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
                        { backgroundColor: "rgba(10,9,8,0.4)", opacity: anim },
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
                            width: 268,
                            borderRadius: 22,
                            overflow: "hidden",
                            borderWidth: 1,
                            borderColor: "rgba(225,195,155,0.18)",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 16 },
                            shadowOpacity: 0.4,
                            shadowRadius: 32,
                            elevation: 18,
                        },
                        cardStyle,
                    ]}
                >
                    {/* Glass body — blur + warm dark wash, same recipe as the
                        tab bar pill so the two floating surfaces feel related */}
                    <BlurView
                        intensity={90}
                        tint="dark"
                        style={StyleSheet.absoluteFillObject}
                    />
                    <View
                        style={[
                            StyleSheet.absoluteFillObject,
                            { backgroundColor: "rgba(24,23,22,0.9)" },
                        ]}
                    />

                    <View style={{ paddingVertical: 10 }}>
                        <MenuRow
                            icon="heart-outline"
                            label={t("profile.curated_favorites")}
                            onPress={() => {
                                Haptics.selectionAsync();
                                closeMenu(() =>
                                    router.push({
                                        pathname: "/(tabs)/gallery",
                                        params: { filter: "favorites" },
                                    } as never),
                                );
                            }}
                        />
                        <MenuRow
                            icon="language-outline"
                            label={t("settings.language_title")}
                            onPress={() => {
                                Haptics.selectionAsync();
                                closeMenu(() =>
                                    router.push("/settings/language" as never),
                                );
                            }}
                        />

                        <View
                            style={{
                                height: StyleSheet.hairlineWidth,
                                backgroundColor: "rgba(225,195,155,0.16)",
                                marginVertical: 8,
                                marginLeft: 70,
                                marginRight: 20,
                            }}
                        />

                        <MenuRow
                            icon="log-out-outline"
                            label={t("drawer.sign_out")}
                            destructive
                            onPress={handleSignOut}
                        />
                    </View>
                </Animated.View>
            </Modal>
        </>
    );
}
