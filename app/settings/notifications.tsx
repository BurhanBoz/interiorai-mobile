import { useState } from "react";
import { View, Text, Pressable, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface NotificationPref {
  key: string;
  label: string;
  description: string;
  defaultValue: boolean;
}

const NOTIFICATION_PREFS: NotificationPref[] = [
  {
    key: "generation_complete",
    label: "Generation Complete",
    description: "Get notified when your AI design is ready to view.",
    defaultValue: true,
  },
  {
    key: "credit_alerts",
    label: "Credit Alerts",
    description: "Receive alerts when your credits are running low.",
    defaultValue: true,
  },
  {
    key: "plan_updates",
    label: "Plan Updates",
    description: "Stay informed about changes to your subscription plan.",
    defaultValue: false,
  },
  {
    key: "marketing",
    label: "Marketing",
    description: "Promotional offers, seasonal collections, and curated picks.",
    defaultValue: false,
  },
  {
    key: "new_features",
    label: "New Features",
    description: "Be the first to know about new styles and capabilities.",
    defaultValue: true,
  },
];

export default function NotificationsSettingsScreen() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFICATION_PREFS.map(p => [p.key, p.defaultValue])),
  );

  const toggle = (key: string) =>
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="px-8 pt-6 pb-4">
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#E5E2E1" />
          </Pressable>
          <Text className="font-headline text-lg text-on-surface">
            Notifications
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-8 pb-32"
        showsVerticalScrollIndicator={false}
      >
        {/* Headline */}
        <Text className="font-headline text-4xl text-on-surface tracking-tight mt-2">
          Preferences
        </Text>
        <View className="mt-4 w-16 h-1 rounded-full bg-primary" />
        <Text className="font-body text-sm text-on-surface-variant mt-4 mb-6">
          Choose which updates reach you. Toggle at any time.
        </Text>

        {/* Toggle Rows */}
        <View className="gap-3">
          {NOTIFICATION_PREFS.map(pref => (
            <Pressable
              key={pref.key}
              onPress={() => toggle(pref.key)}
              className="bg-surface-container-high rounded-xl p-5 flex-row items-center"
            >
              <View className="flex-1 mr-4">
                <Text className="font-headline text-base text-on-surface">
                  {pref.label}
                </Text>
                <Text className="font-body text-xs text-on-surface-variant mt-1 leading-5">
                  {pref.description}
                </Text>
              </View>
              <Switch
                value={prefs[pref.key]}
                onValueChange={() => toggle(pref.key)}
                trackColor={{ false: "#3A3837", true: "#C4A882" }}
                thumbColor={prefs[pref.key] ? "#FFFFFF" : "#8A8786"}
                ios_backgroundColor="#3A3837"
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
