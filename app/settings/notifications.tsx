import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as userService from "@/services/user";
import type { NotificationPreferences } from "@/types/api";
import { useTranslation } from "react-i18next";

const IMG_HERO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBMXanOw0Wj_FYf9p9ca26IIu5OVLycC9kuOVzTM_SknOnF_5WZjaMKq7JcF1eGMQw3E5tgKlQPt9sG10pw_RjR4a03yiiqhhgTeWkBagWRC81Pc8lDIeWOzRxlubiiIa_3J6vJ5TEK1bZEKKPOhGc0fLwimmLxDF5YNw8sxoMf9Q2Pn6LhhcPaASWldJHkytUySQNzuhr0FE2yHY9Wls-6Vqjmm2Neeb0Uh--uvqbCbo7xLoZOB3m6BgR1v6NpRTUSySxZp8pYEE0";

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}

function ToggleRow({ label, description, value, onToggle }: ToggleRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      className="bg-surface-container-low flex-row items-center justify-between"
      style={{ padding: 20 }}
    >
      <View className="flex-1 mr-4">
        <Text
          className="font-body text-on-surface"
          style={{ fontSize: 14, fontWeight: "500", letterSpacing: 0.3 }}
        >
          {label}
        </Text>
        <Text
          className="font-body text-on-surface-variant"
          style={{ fontSize: 12, marginTop: 4 }}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#353534", true: "#FEDFB5" }}
        thumbColor={value ? "#281801" : "#d1c5b8"}
        ios_backgroundColor="#353534"
      />
    </Pressable>
  );
}

export default function NotificationsSettingsScreen() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<Omit<
    NotificationPreferences,
    "userId"
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService
      .getNotificationPreferences()
      .then(data => {
        const { userId, ...rest } = data;
        setPrefs(rest);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = async (key: keyof Omit<NotificationPreferences, "userId">) => {
    if (!prefs) return;
    const newValue = !prefs[key];
    setPrefs({ ...prefs, [key]: newValue });
    try {
      const updated = await userService.updateNotificationPreferences({
        [key]: newValue,
      });
      const { userId, ...rest } = updated;
      setPrefs(rest);
    } catch {
      setPrefs({ ...prefs, [key]: !newValue });
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color="#E1C39B" />
          </Pressable>
          <Text
            className="font-headline text-on-surface"
            style={{
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {t("app.brand")}
          </Text>
        </View>
        <View style={{ width: 32, height: 32 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={{ marginBottom: 64, marginTop: 24 }}>
          <Text
            className="font-label text-primary"
            style={{
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            {t("profile.notifications")}
          </Text>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 30, lineHeight: 38 }}
          >
            {t("settings.notifications_description")}
          </Text>
          <View
            className="bg-primary-fixed"
            style={{ width: 96, height: 4, borderRadius: 2, marginTop: 32 }}
          />
        </View>

        {loading ? (
          <ActivityIndicator color="#E1C39B" className="mt-8" />
        ) : prefs ? (
          <View>
            {/* Group 1: Project Lifecycle */}
            <View style={{ marginBottom: 48 }}>
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 24,
                  paddingHorizontal: 8,
                }}
              >
                {t("settings.notifications_push_title")}
              </Text>
              <View style={{ gap: 1 }}>
                <ToggleRow
                  label="Design completed"
                  description="Receive alerts when AI renders reach final fidelity."
                  value={prefs.renderComplete}
                  onToggle={() => toggle("renderComplete")}
                />
                <ToggleRow
                  label="Blueprint revisions"
                  description="Status updates on automated structural refinements."
                  value={prefs.pushEnabled}
                  onToggle={() => toggle("pushEnabled")}
                />
                <ToggleRow
                  label="Lighting Analysis"
                  description="Daylight study completion and energy reports."
                  value={prefs.promotions}
                  onToggle={() => toggle("promotions")}
                />
              </View>
            </View>

            {/* Group 2: Curated Network */}
            <View style={{ marginBottom: 64 }}>
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 24,
                  paddingHorizontal: 8,
                }}
              >
                {t("settings.notifications_email_title")}
              </Text>
              <View style={{ gap: 1 }}>
                <ToggleRow
                  label="New styles"
                  description="Weekly drops of architectural aesthetics and materials."
                  value={prefs.emailEnabled}
                  onToggle={() => toggle("emailEnabled")}
                />
                <ToggleRow
                  label="Designer collaboration"
                  description="Direct messages from community experts."
                  value={prefs.weeklySummary}
                  onToggle={() => toggle("weeklySummary")}
                />
              </View>
            </View>

            {/* Footer Image with Quote Overlay */}
            <View
              className="w-full overflow-hidden rounded-xl"
              style={{ height: 320 }}
            >
              <Image
                source={{ uri: IMG_HERO }}
                style={{ width: "100%", height: "100%", opacity: 0.4 }}
                contentFit="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(19,19,19,0.8)"]}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  top: 0,
                }}
              />
              <View
                className="absolute items-center justify-center"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: 32,
                }}
              >
                <Text
                  className="font-headline text-on-surface text-center"
                  style={{
                    fontSize: 18,
                    lineHeight: 28,
                    fontStyle: "italic",
                    marginBottom: 16,
                  }}
                >
                  "Design is not just what it looks like and feels like.
                  Design is how it works."
                </Text>
                <Text
                  className="font-label"
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "rgba(254,223,181,0.8)",
                  }}
                >
                  — Steve Jobs
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text
            className="font-body text-on-surface-variant mt-4"
            style={{ fontSize: 14 }}
          >
            Failed to load preferences.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
