import { View, Text, Pressable, Platform, Animated, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
    // Route stays "profile" (renaming the folder would churn every deep
    // link); the SLOT is presented as Settings — the account hub. Quick
    // personal actions live in the top-right AvatarMenu instead.
    { name: "profile", labelKey: "drawer.settings", icon: "settings" },
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
/**
 * Total vertical space the dock claims at the screen bottom (row ~62px +
 * home-indicator inset ~34px on notch devices). Scrollable tab screens must
 * pad their content by at least this much — import it instead of hardcoding.
 */
export const TAB_BAR_HEIGHT = 96;

/**
 * Extra room a scrolling screen leaves under its last row, on top of the tab
 * bar itself. Screens were each inventing a number (128, 120, 136, 60…), so
 * some ended with their final control tucked behind the bar. Responsive for
 * the same reason the CTA gap is: a fixed 40 is generous on a 6.7" phone and
 * expensive on an SE.
 */
export const BOTTOM_SAFE_GAP = Math.round(
  Math.min(48, Math.max(32, Dimensions.get("window").height * 0.05)),
);

export function GlassNavBar({ state, navigation }: BottomTabBarProps) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    // Edge-to-edge dock seated on the very bottom (2026-07 founder call —
    // the floating pill read as "hovering"; mainstream consumer apps dock
    // the tab bar flush). The blur extends UNDER the home indicator; a
    // hairline top border separates it from content. No transparent
    // gutters anymore, so no box-none dance is needed either.
    return (
        <View
            style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
            }}
        >
            <BlurView
                intensity={88}
                tint="dark"
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-around",
                    overflow: "hidden",
                    backgroundColor: "rgba(19,19,19,0.72)",
                    borderTopWidth: 1,
                    borderTopColor: "rgba(225,195,155,0.10)",
                    paddingTop: 4,
                    paddingBottom: Math.max(insets.bottom, 10),
                    ...(Platform.OS === "ios" && {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -6 },
                        shadowOpacity: 0.25,
                        shadowRadius: 16,
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
                    ...theme.text.caption,
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
