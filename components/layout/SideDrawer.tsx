import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  useWindowDimensions,
  Alert,
} from "react-native";
import { useRef, useEffect, useCallback } from "react";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useAuthStore } from "@/stores/authStore";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";

const MENU_ITEMS = [
  {
    icon: "cube-outline" as const,
    label: "Studio",
    route: "/(tabs)/studio" as const,
    match: "/studio",
  },
  {
    icon: "grid-outline" as const,
    label: "Gallery",
    route: "/(tabs)/gallery" as const,
    match: "/gallery",
  },
  {
    icon: "time-outline" as const,
    label: "History",
    route: "/(tabs)/history" as const,
    match: "/history",
  },
  {
    icon: "person-outline" as const,
    label: "Profile",
    route: "/(tabs)/profile" as const,
    match: "/profile",
  },
] as const;

const SETTINGS_ITEMS = [
  {
    icon: "settings-outline" as const,
    label: "Settings",
    route: "/settings/language" as const,
  },
  {
    icon: "help-circle-outline" as const,
    label: "Help",
    route: "/settings/help" as const,
  },
] as const;

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function SideDrawer({ visible, onClose }: SideDrawerProps) {
  const { width } = useWindowDimensions();
  const drawerWidth = width * 0.8;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pathname = usePathname();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const credits = useCreditStore((s) => s.balance);
  const subscription = useSubscriptionStore((s) => s.subscription);

  const tierLabel = subscription?.planName ?? "Free";

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
      onClose();
      setTimeout(() => router.push(route as any), 150);
    },
    [onClose],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          onClose();
          await logout();
        },
      },
    ]);
  }, [onClose, logout]);

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
          backgroundColor: "#1C1B1B",
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
        }}
      >
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
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                overflow: "hidden",
                backgroundColor: "#2A2A2A",
                borderWidth: 2,
                borderColor: "rgba(225,195,155,0.3)",
                padding: 3,
              }}
            >
              <Image
                source={{ uri: user?.displayName ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=2A2A2A&color=E1C39B&size=128` : "https://i.pravatar.cc/128?img=12" }}
                style={{ width: "100%", height: "100%", borderRadius: 999 }}
                contentFit="cover"
              />
            </View>
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
                  letterSpacing: -0.3,
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
                fontSize: 20,
                fontWeight: "700",
                lineHeight: 24,
              }}
            >
              {user?.displayName || user?.email || "Architect"}
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
                Premium Member
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
            NAVIGATE
          </Text>
        </View>

        {/* Navigation Items */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32, flex: 1 }}>
          {MENU_ITEMS.map((item) => {
            const isActive = pathname.includes(item.match);
            return (
              <Pressable
                key={item.label}
                onPress={() => navigate(item.route)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: isActive
                    ? "#2A2A2A"
                    : pressed
                      ? "rgba(42,42,42,0.5)"
                      : "transparent",
                  marginBottom: 4,
                })}
              >
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
                    {item.label}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={isActive ? "#E1C39B" : "#E5E2E1"}
                  style={{ opacity: isActive ? 0.4 : 0 }}
                />
              </Pressable>
            );
          })}

          {/* Settings Section Label */}
          <View style={{ marginTop: 32, marginBottom: 12, paddingHorizontal: 10 }}>
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
              SETTINGS
            </Text>
          </View>

          {/* Settings Items */}
          {SETTINGS_ITEMS.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => navigate(item.route)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: pressed
                  ? "rgba(42,42,42,0.5)"
                  : "transparent",
                marginBottom: 4,
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
                  {item.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Sign Out — bottom */}
        <View style={{ paddingHorizontal: 24 }}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderRadius: 12,
              backgroundColor: pressed
                ? "rgba(255,180,171,0.1)"
                : "rgba(255,180,171,0.05)",
            })}
          >
            <Ionicons name="log-out-outline" size={22} color="#FFB4AB" />
            <Text
              className="font-label"
              style={{
                fontSize: 14,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 2,
                color: "#FFB4AB",
              }}
            >
              Sign Out
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}
