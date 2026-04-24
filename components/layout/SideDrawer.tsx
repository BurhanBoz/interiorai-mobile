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
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { TierBadge } from "@/components/ui/TierBadge";
import { Brand } from "@/components/brand/Brand";
import type { ComponentProps } from "react";
import { theme } from "@/config/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * The app's side drawer. Contract:
 *   - Compact user identity (64 avatar, name, email) — one tier badge only
 *   - Navigation section with the same tab-bar icons (no metaphor mismatch)
 *   - Settings section with a smaller break
 *   - Quiet destructive footer for Sign Out, separated by a divider
 *
 * Visual inspiration: Arc sidebar, Things 3 preferences pane — both focus
 * on navigation density over hero branding.
 */

interface MenuItem {
  icon: IconName;
  iconOutline: IconName;
  labelKey: string;
  route: string;
  match: string;
}

// Note: icons now match the bottom tab bar exactly so the drawer and tab
// bar speak the same metaphor. Previously the drawer used cube/grid/time
// while the tab bar used palette/images/time — same items, different
// mental models. That tension is gone.
const MENU_ITEMS: MenuItem[] = [
  {
    icon: "color-palette",
    iconOutline: "color-palette-outline",
    labelKey: "tabs.studio",
    route: "/(tabs)/studio",
    match: "/studio",
  },
  {
    icon: "images",
    iconOutline: "images-outline",
    labelKey: "tabs.gallery",
    route: "/(tabs)/gallery",
    match: "/gallery",
  },
  {
    icon: "time",
    iconOutline: "time-outline",
    labelKey: "tabs.history",
    route: "/(tabs)/history",
    match: "/history",
  },
  {
    icon: "person",
    iconOutline: "person-outline",
    labelKey: "tabs.profile",
    route: "/(tabs)/profile",
    match: "/profile",
  },
];

const SETTINGS_ITEMS: Array<{ icon: IconName; labelKey: string; route: string }> = [
  {
    icon: "language-outline",
    labelKey: "drawer.language",
    route: "/settings/language",
  },
  {
    icon: "help-circle-outline",
    labelKey: "drawer.help",
    route: "/settings/help",
  },
];

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
}

/* ───────── DrawerItem: a single row in either nav or settings group ───────── */

interface DrawerItemProps {
  icon: IconName;
  iconOutline?: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
}

function DrawerItem({
  icon,
  iconOutline,
  label,
  active = false,
  onPress,
}: DrawerItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        // Explicit row direction at the Pressable level AND on the inner
        // view so neither NativeWind nor a parent flex layout can collapse
        // the content into a column on any screen size.
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 18,
        borderRadius: 12,
        backgroundColor: active
          ? "rgba(225,195,155,0.10)"
          : pressed
            ? "rgba(42,42,42,0.45)"
            : "transparent",
        marginBottom: 10,
        position: "relative",
      })}
    >
      {active ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 14,
            bottom: 14,
            width: 3,
            borderRadius: 2,
            backgroundColor: theme.color.goldMidday,
          }}
        />
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          flex: 1,
        }}
      >
        <Ionicons
          name={active ? icon : (iconOutline ?? icon)}
          size={22}
          color={active ? theme.color.goldMidday : theme.color.onSurface}
        />
        <Text
          style={{
            fontFamily: active ? "Inter-SemiBold" : "Inter-Medium",
            fontSize: 15,
            letterSpacing: 0.2,
            color: active ? theme.color.goldMidday : theme.color.onSurface,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/* ───────── SectionLabel: quiet eyebrow above each group ───────── */

function SectionLabel({ children, compact = false }: { children: string; compact?: boolean }) {
  return (
    <Text
      style={{
        fontFamily: "Inter-SemiBold",
        fontSize: compact ? 10 : 11,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: "rgba(225,195,155,0.45)",
        paddingHorizontal: 14,
        marginBottom: 14,
        // Settings section sits a comfortable gap below the nav group so
        // the break between "Navigate" and "Settings" reads as deliberate.
        marginTop: compact ? 24 : 0,
      }}
    >
      {children}
    </Text>
  );
}

/* ───────── Main drawer ───────── */

export function SideDrawer({ visible, onClose }: SideDrawerProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.82, 340);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pathname = usePathname();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const subscription = useSubscriptionStore((s) => s.subscription);

  const planCode = subscription?.planCode ?? "FREE";
  const displayName = user?.displayName || t("drawer.architect");

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 24,
          stiffness: 220,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: theme.motion.duration.base,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -drawerWidth,
          duration: theme.motion.duration.fast,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: theme.motion.duration.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, drawerWidth, slideAnim, fadeAnim]);

  const navigate = useCallback(
    (route: string) => {
      Haptics.selectionAsync();
      onClose();
      setTimeout(() => router.push(route as any), 140);
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
          backgroundColor: theme.color.scrim,
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
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 12,
          borderTopRightRadius: 20,
          borderBottomRightRadius: 20,
          borderRightWidth: 1,
          borderRightColor: "rgba(77,70,60,0.15)",
          shadowColor: "#000",
          shadowOffset: { width: 8, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 24,
          elevation: 24,
          overflow: "hidden",
        }}
      >
        <BlurView
          intensity={90}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(22,21,21,0.88)" },
          ]}
        />

        {/* Brand mark (tiny, quiet) */}
        <View
          style={{
            paddingHorizontal: 24,
            marginBottom: 20,
          }}
        >
          <Brand variant="inline" size="xs" tone="muted" />
        </View>

        {/* User identity — compact horizontal layout */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            paddingHorizontal: 24,
            paddingBottom: 22,
            marginBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(77,70,60,0.18)",
          }}
        >
          <UserAvatar size="md" />
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Text
                style={{
                  fontFamily: "NotoSerif",
                  fontSize: 17,
                  color: theme.color.onSurface,
                  letterSpacing: -0.1,
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <TierBadge tier={planCode} size="xs" />
            </View>
            {user?.email ? (
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 12,
                  color: theme.color.onSurfaceMuted,
                  marginTop: 3,
                }}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {user.email}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Navigate */}
        <View
          style={{
            paddingHorizontal: 14,
            marginTop: 18,
            flex: 1,
          }}
        >
          <SectionLabel>{t("drawer.navigate")}</SectionLabel>
          {MENU_ITEMS.map((item) => (
            <DrawerItem
              key={item.labelKey}
              icon={item.icon}
              iconOutline={item.iconOutline}
              label={t(item.labelKey)}
              active={pathname.includes(item.match)}
              onPress={() => navigate(item.route)}
            />
          ))}

          {/* Settings — smaller break, not 56px dead space */}
          <SectionLabel compact>{t("drawer.settings")}</SectionLabel>
          {SETTINGS_ITEMS.map((item) => (
            <DrawerItem
              key={item.labelKey}
              icon={item.icon}
              label={t(item.labelKey)}
              onPress={() => navigate(item.route)}
            />
          ))}
        </View>

        {/* Footer — quiet destructive row, visually separated by the divider.
            The inner row uses an explicit flexDirection View so the icon +
            label stay side-by-side even if the Pressable style function
            dance ever breaks the direction inheritance. */}
        <View
          style={{
            paddingHorizontal: 14,
            paddingTop: 14,
            marginTop: 8,
            borderTopWidth: 1,
            borderTopColor: "rgba(77,70,60,0.18)",
          }}
        >
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 14,
              borderRadius: 10,
              backgroundColor: pressed
                ? "rgba(153,143,132,0.08)"
                : "transparent",
            })}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={18}
                color={theme.color.onSurfaceMuted}
              />
              <Text
                style={{
                  fontFamily: "Inter-Medium",
                  fontSize: 14,
                  letterSpacing: 0.3,
                  color: theme.color.onSurfaceMuted,
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
