import { View, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { useAuthStore } from "@/stores/authStore";
import { useCreditStore } from "@/stores/creditStore";

const MENU_SECTIONS = [
  {
    title: "Account Management",
    items: [
      {
        label: "Preferences",
        icon: "settings-outline" as const,
        onPress: () => router.push("/settings/notifications"),
      },
      {
        label: "Billing & Invoices",
        icon: "card-outline" as const,
        onPress: () => router.push("/plans"),
      },
      {
        label: "Privacy Settings",
        icon: "shield-checkmark-outline" as const,
        onPress: () => router.push("/settings/privacy"),
      },
    ],
  },
  {
    title: "Portfolio Settings",
    items: [
      {
        label: "Appearance",
        icon: "contrast-outline" as const,
        value: "Light",
        onPress: () => {},
      },
      {
        label: "Cloud Synchronization",
        icon: "cloud-outline" as const,
        onPress: () => {},
      },
    ],
  },
];

export default function ProfileScreen() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const balance = useCreditStore(s => s.balance);
  const planCode = useCreditStore(s => s.planCode);

  const displayName = user?.displayName || "Julian Voss";
  const planLabel =
    planCode === "FREE"
      ? "Free"
      : planCode === "STUDIO_PRO"
        ? "Studio Pro"
        : planCode;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Profile Identity */}
        <View className="items-center mt-4 mb-8">
          <Image
            source={{ uri: "https://i.pravatar.cc/96?img=12" }}
            className="w-24 h-24 rounded-xl mb-4"
            contentFit="cover"
          />
          <Text className="text-on-surface font-headline text-2xl">
            {displayName}
          </Text>
          <Text className="text-on-surface-variant font-body text-sm mt-1">
            Lead Curator • London
          </Text>
        </View>

        {/* Stats / Credits Bento */}
        <View className="flex-row gap-3 mb-8">
          <View className="flex-1 bg-surface-container-high rounded-xl p-4">
            <Text className="text-on-surface-variant font-body text-xs mb-2">
              Available Credits
            </Text>
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles" size={20} color="#C4A882" />
              <Text className="text-on-surface font-headline text-2xl">
                {balance > 0 ? balance.toLocaleString() : "1,240"}
              </Text>
            </View>
          </View>
          <View className="flex-1 bg-primary rounded-xl p-4">
            <Text className="text-on-primary/70 font-body text-xs mb-2">
              Active Plan
            </Text>
            <Text className="text-on-primary font-headline text-2xl">
              {planLabel}
            </Text>
          </View>
        </View>

        {/* Menu Sections */}
        {MENU_SECTIONS.map(section => (
          <View key={section.title} className="mb-6">
            <Text className="text-on-surface-variant font-body text-xs uppercase tracking-widest mb-3">
              {section.title}
            </Text>
            <View className="bg-surface-container-low rounded-xl overflow-hidden">
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  className="flex-row items-center px-4 py-4 active:opacity-70"
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color="#E5E2E1"
                    style={{ marginRight: 12 }}
                  />
                  <Text className="text-on-surface font-body text-base flex-1">
                    {item.label}
                  </Text>
                  {"value" in item && item.value ? (
                    <Text className="text-on-surface-variant font-body text-sm mr-2">
                      {item.value}
                    </Text>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color="#E5E2E1" />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <Pressable
          onPress={logout}
          className="bg-surface-container-highest rounded-xl py-4 items-center mt-2 mb-8 active:opacity-70"
        >
          <Text className="text-on-surface font-body text-sm uppercase tracking-widest">
            Sign Out
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
