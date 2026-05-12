import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  useWindowDimensions,
  Alert,
  StyleSheet,
  ScrollView,
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
    icon: "settings-outline",
    labelKey: "drawer.settings",
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
        borderRadius: 12,
        backgroundColor: active
          ? "rgba(225,195,155,0.12)"
          : pressed
            ? "rgba(42,42,42,0.45)"
            : "transparent",
        borderWidth: active ? 1 : 0,
        borderColor: "rgba(225,195,155,0.28)",
        overflow: "hidden",
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: 16,
          paddingVertical: 13,
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
            fontSize: 16,
            letterSpacing: 0.1,
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

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: "Inter-SemiBold",
        fontSize: 11,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: "rgba(225,195,155,0.55)",
        paddingHorizontal: 4,
        marginBottom: 10,
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
  const welcomeBonusActive = useCreditStore((s) => s.welcomeBonusActive);

  // Effective tier — welcome bonus grants 7-day MAX-tier access on top of
  // the FREE plan record. The drawer should reflect what the user FEELS
  // like (MAX), not what the subscription row says (FREE). Source of
  // truth: creditStore.welcomeBonusActive (server-evaluated).
  const rawPlanCode = subscription?.planCode ?? "FREE";
  const planCode = welcomeBonusActive ? "MAX" : rawPlanCode;
  const isOnTrial = welcomeBonusActive === true;
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

        {/* User identity — premium hero treatment: large circle avatar with
            tier badge overlay at bottom-left corner, name + plan label
            below. Email omitted to keep the block clean and scannable. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            paddingHorizontal: 24,
            paddingBottom: 24,
            marginBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(77,70,60,0.18)",
          }}
        >
          <View>
            <UserAvatar size="hero" />
            <View style={{ position: "absolute", bottom: -4, left: -4 }}>
              <TierBadge tier={planCode} size="xs" />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "NotoSerif",
                fontSize: 20,
                color: theme.color.onSurface,
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <View style={{ marginTop: 8 }}>
              <TierBadge
                tier={planCode}
                size="xs"
                label={
                  isOnTrial
                    ? t("profile.max_trial", { defaultValue: "MAX TRIAL" })
                    : planCode !== "FREE"
                      ? t("drawer.premium_member")
                      : undefined
                }
              />
            </View>
          </View>
        </View>

        {/* Navigate + Settings — each group wrapped in a View with gap so
            items have explicit breathing room between them. marginBottom
            on the nav group creates the section separator without needing
            a visual divider. */}
        <View style={{ flex: 1, marginTop: 20 }}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingBottom: 8,
            }}
            showsVerticalScrollIndicator={false}
          >
            <SectionLabel>{t("drawer.navigate")}</SectionLabel>
            <View style={{ gap: 12, marginBottom: 28 }}>
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
            </View>

            <SectionLabel>{t("drawer.settings")}</SectionLabel>
            <View style={{ gap: 6 }}>
              {SETTINGS_ITEMS.map((item) => (
                <DrawerItem
                  key={item.labelKey}
                  icon={item.icon}
                  label={t(item.labelKey)}
                  onPress={() => navigate(item.route)}
                />
              ))}
            </View>
          </ScrollView>
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
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 10,
              backgroundColor: pressed
                ? "rgba(217,138,123,0.10)"
                : "transparent",
            })}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 18,
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={22}
                color={theme.color.danger}
              />
              <Text
                style={{
                  fontFamily: "Inter-SemiBold",
                  fontSize: 16,
                  letterSpacing: 0.2,
                  color: theme.color.danger,
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
