import { View, Text, Pressable, Platform } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

const TAB_CONFIG = [
  { name: "studio", label: "Studio", icon: "color-palette" as const },
  { name: "gallery", label: "Gallery", icon: "images" as const },
  { name: "history", label: "History", icon: "time" as const },
  { name: "profile", label: "Profile", icon: "person" as const },
];

export function GlassNavBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View className="absolute bottom-0 left-0 right-0 px-4 pb-8">
      <View
        className="flex-row items-center justify-around rounded-xl overflow-hidden"
        style={{
          backgroundColor: "rgba(19, 19, 19, 0.7)",
          ...(Platform.OS === "ios" && {
            shadowColor: "#F5F0EB",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.06,
            shadowRadius: 40,
          }),
        }}
      >
        {TAB_CONFIG.map((tab, index) => {
          const isActive = state.index === index;
          return (
            <Pressable
              key={tab.name}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(tab.name);
              }}
              className="flex-1 items-center py-3"
            >
              <Ionicons
                name={isActive ? tab.icon : (`${tab.icon}-outline` as any)}
                size={22}
                color={isActive ? "#E1C39B" : "#D0C5B8"}
              />
              <Text
                className={`text-[10px] mt-1 uppercase tracking-widest font-label ${
                  isActive ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
