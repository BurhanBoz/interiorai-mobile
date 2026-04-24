import { View, Text, Pressable, Platform, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import type { ComponentProps } from "react";
import { theme } from "@/config/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface TabConfig {
    name: string;
    labelKey: string;
    icon: IconName;
}

const TAB_CONFIG: TabConfig[] = [
    { name: "studio", labelKey: "tabs.studio", icon: "color-palette" },
    { name: "gallery", labelKey: "tabs.gallery", icon: "images" },
    { name: "history", labelKey: "tabs.history", icon: "time" },
    { name: "profile", labelKey: "tabs.profile", icon: "person" },
];

/**
 * The bottom tab bar. Sits on a blurred pill floating above content.
 *
 * Design notes vs. the previous version:
 *   - Active indicator is now a 20px horizontal line below the label
 *     instead of a 3×3 dot (which read as a notification badge).
 *   - Labels use sentence case, not UPPERCASE — UPPERCASE + tracked
 *     in a 10px label ends up as noise, not emphasis.
 *   - Blur intensity bumped from 55 → 88 so busy content underneath
 *     doesn't bleed through.
 *   - Icon + indicator animate together (spring) so selection feels
 *     tactile, not abrupt.
 */
export function GlassNavBar({ state, navigation }: BottomTabBarProps) {
    const { t } = useTranslation();

    return (
        <View
            style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                paddingHorizontal: 16,
                paddingBottom: 32,
            }}
        >
            <BlurView
                intensity={88}
                tint="dark"
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-around",
                    borderRadius: 20,
                    overflow: "hidden",
                    backgroundColor: "rgba(19,19,19,0.62)",
                    borderWidth: 1,
                    borderColor: "rgba(225,195,155,0.10)",
                    ...(Platform.OS === "ios" && {
                        shadowColor: "#F5F0EB",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.08,
                        shadowRadius: 40,
                    }),
                }}
            >
                {TAB_CONFIG.map((tab, index) => (
                    <TabItem
                        key={tab.name}
                        tab={tab}
                        isActive={state.index === index}
                        label={t(tab.labelKey)}
                        onPress={() => {
                            Haptics.selectionAsync();
                            navigation.navigate(tab.name);
                        }}
                    />
                ))}
            </BlurView>
        </View>
    );
}

interface TabItemProps {
    tab: TabConfig;
    isActive: boolean;
    label: string;
    onPress: () => void;
}

function TabItem({ tab, isActive, label, onPress }: TabItemProps) {
    const scale = useRef(new Animated.Value(isActive ? 1.06 : 1)).current;
    const indicatorWidth = useRef(new Animated.Value(isActive ? 18 : 0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: isActive ? 1.06 : 1,
                damping: 18,
                stiffness: 280,
                useNativeDriver: true,
            }),
            Animated.timing(indicatorWidth, {
                toValue: isActive ? 18 : 0,
                duration: theme.motion.duration.fast,
                easing: theme.motion.easing.standard,
                useNativeDriver: false,
            }),
        ]).start();
    }, [isActive, scale, indicatorWidth]);

    const color = isActive
        ? theme.color.goldMidday
        : "rgba(208,197,184,0.55)";

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                gap: 4,
            }}
        >
            <Animated.View style={{ transform: [{ scale }] }}>
                <Ionicons
                    name={isActive ? tab.icon : (`${tab.icon}-outline` as IconName)}
                    size={22}
                    color={color}
                />
            </Animated.View>
            <Text
                style={{
                    fontFamily: isActive ? "Inter-SemiBold" : "Inter-Medium",
                    fontSize: 10,
                    letterSpacing: 0.2,
                    color,
                }}
            >
                {label}
            </Text>
            <Animated.View
                style={{
                    width: indicatorWidth,
                    height: 2,
                    borderRadius: 1,
                    backgroundColor: theme.color.goldMidday,
                    marginTop: 2,
                }}
            />
        </Pressable>
    );
}
