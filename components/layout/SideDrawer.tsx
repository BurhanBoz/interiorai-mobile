import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  useWindowDimensions,
  Alert,
  StyleSheet,
} from "react-native";
import { useRef, useEffect, useCallback } from "react";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { UserAvatar } from "@/components/ui/UserAvatar";

const MENU_ITEMS = [
  {
    icon: "cube-outline" as const,
    labelKey: "tabs.studio",
    route: "/(tabs)/studio" as const,
    match: "/studio",
  },
  {
    icon: "grid-outline" as const,
    labelKey: "tabs.gallery",
    route: "/(tabs)/gallery" as const,
    match: "/gallery",
  },
  {
    icon: "time-outline" as const,
    labelKey: "tabs.history",
    route: "/(tabs)/history" as const,
    match: "/history",
  },
  {
    icon: "person-outline" as const,
    labelKey: "tabs.profile",
    route: "/(tabs)/profile" as const,
    match: "/profile",
  },
] as const;

const SETTINGS_ITEMS = [
  {
    icon: "language-outline" as const,
    labelKey: "drawer.language",
    route: "/settings/language" as const,
  },
  {
    icon: "help-circle-outline" as const,
    labelKey: "drawer.help",
    route: "/settings/help" as const,
  },
] as const;

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function SideDrawer({ visible, onClose }: SideDrawerProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const drawerWidth = width * 0.8;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pathname = usePathname();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const subscription = useSubscriptionStore((s) => s.subscription);

  const tierLabel = subscription?.planName ?? t("profile.free");

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 200,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -drawerWidth,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const navigate = useCallback(
    (route: string) => {
      Haptics.selectionAsync();
      onClose();
      setTimeout(() => router.push(route as any), 150);
    },
    [onClose],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert(
      t("drawer.sign_out_confirm_title"),
      t("drawer.sign_out_confirm_description"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("drawer.sign_out"),
          style: "destructive",
          onPress: async () => {
            onClose();
            await logout();
          },
        },
      ],
    );
  }, [onClose, logout, t]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(19,19,19,0.8)",
          opacity: fadeAnim,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: drawerWidth,
          transform: [{ translateX: slideAnim }],
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 16,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
          borderRightWidth: 1,
          borderRightColor: "rgba(77,70,60,0.1)",
          shadowColor: "#000",
          shadowOffset: { width: 8, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 24,
          elevation: 24,
          overflow: "hidden",
        }}
      >
        <BlurView
          intensity={80}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(28,27,27,0.85)" },
          ]}
        />
        {/* Profile Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            paddingHorizontal: 32,
            marginBottom: 48,
          }}
        >
          {/* Avatar with tier badge */}
          <View style={{ position: "relative" }}>
            <UserAvatar
              size="md"
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                borderWidth: 2,
                borderColor: "rgba(225,195,155,0.3)",
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                backgroundColor: "#FEDFB5",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
              }}
            >
              <Text
                className="font-label"
                style={{
                  fontSize: 8,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "#3F2D11",
                }}
              >
                {tierLabel}
              </Text>
            </View>
          </View>

          {/* Name & membership */}
          <View style={{ flex: 1 }}>
            <Text
              className="font-headline text-on-surface"
              style={{
                fontSize: user?.displayName ? 20 : 16,
                fontWeight: "700",
                lineHeight: 22,
              }}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {user?.displayName || user?.email || t("drawer.architect")}
            </Text>
            <View
              style={{
                marginTop: 6,
                backgroundColor: "rgba(88,67,37,0.3)",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 4,
                alignSelf: "flex-start",
              }}
            >
              <Text
                className="font-label"
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  color: "#E0C29A",
                }}
              >
                {t("drawer.premium_member")}
              </Text>
            </View>
          </View>
        </View>

        {/* Navigate Section Label */}
        <View style={{ paddingHorizontal: 34, marginBottom: 12 }}>
          <Text
            className="font-label"
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "rgba(224,194,154,0.6)",
            }}
          >
            {t("drawer.navigate")}
          </Text>
        </View>

        {/* Navigation Items */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32, flex: 1 }}>
          {MENU_ITEMS.map((item) => {
            const isActive = pathname.includes(item.match);
            const label = t(item.labelKey);
            return (
              <Pressable
                key={item.labelKey}
                onPress={() => navigate(item.route)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 22,
                  borderRadius: 8,
                  backgroundColor: isActive
                    ? "rgba(225,195,155,0.08)"
                    : pressed
                      ? "rgba(42,42,42,0.5)"
                      : "transparent",
                  marginBottom: 18,
                  position: "relative",
                })}
              >
                {isActive && (
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 10,
                      bottom: 10,
                      width: 3,
                      borderRadius: 2,
                      backgroundColor: "#E1C39B",
                    }}
                  />
                )}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={isActive ? "#E1C39B" : "#E5E2E1"}
                  />
                  <Text
                    className="font-body"
                    style={{
                      fontSize: 14,
                      fontWeight: isActive ? "700" : "500",
                      letterSpacing: 0.5,
                      color: isActive ? "#E1C39B" : "#E5E2E1",
                    }}
                  >
                    {label}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {/* Settings Section Label */}
          <View style={{ marginTop: 44, marginBottom: 16, paddingHorizontal: 12 }}>
            <Text
              className="font-label"
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "rgba(224,194,154,0.6)",
              }}
            >
              {t("drawer.settings")}
            </Text>
          </View>

          {/* Settings Items */}
          {SETTINGS_ITEMS.map((item) => (
            <Pressable
              key={item.labelKey}
              onPress={() => navigate(item.route)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 12,
                paddingVertical: 18,
                borderRadius: 8,
                backgroundColor: pressed
                  ? "rgba(42,42,42,0.5)"
                  : "transparent",
                marginBottom: 12,
              })}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <Ionicons name={item.icon} size={22} color="#E5E2E1" />
                <Text
                  className="font-body"
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    letterSpacing: 0.5,
                    color: "#E5E2E1",
                  }}
                >
                  {t(item.labelKey)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Sign Out — matches the menu-item row style (icon + text inline) */}
        <View style={{ paddingHorizontal: 24 }}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => ({
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: pressed ? "rgba(255,180,171,0.1)" : "transparent",
            })}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
              }}
            >
              <Ionicons name="log-out-outline" size={22} color="#FFB4AB" />
              <Text
                className="font-body"
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  letterSpacing: 0.5,
                  color: "#FFB4AB",
                }}
              >
                {t("drawer.sign_out")}
              </Text>
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}
