import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSettingsStore } from "@/stores/settingsStore";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "it", label: "Italiano" },
];

export default function LanguageScreen() {
  const language = useSettingsStore(s => s.language);
  const setLanguage = useSettingsStore(s => s.setLanguage);

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="pt-8 px-8 pb-6">
        <View className="flex-row items-center mb-6">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#E5E2E1" />
          </Pressable>
        </View>
        <Text className="font-headline text-4xl text-on-surface tracking-tight">
          Choose Language
        </Text>
        <View className="mt-4 w-12 h-0.5 bg-primary" />
      </View>

      {/* Language list */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerClassName="gap-3 pb-32"
        showsVerticalScrollIndicator={false}
      >
        {LANGUAGES.map(lang => {
          const isSelected = language === lang.code;
          return (
            <Pressable
              key={lang.code}
              onPress={() => setLanguage(lang.code)}
              className={`flex-row items-center justify-between p-5 rounded-xl ${
                isSelected
                  ? "bg-surface-container-high"
                  : "bg-surface-container-low"
              }`}
            >
              <Text
                className={`font-body text-lg ${
                  isSelected ? "text-on-surface" : "text-on-surface-variant"
                }`}
              >
                {lang.label}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color="#E1C39B" />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Continue button */}
      <View className="absolute bottom-0 left-0 right-0">
        <LinearGradient
          colors={["transparent", "#131313", "#131313"]}
          locations={[0, 0.3, 1]}
          className="px-8 pt-12 pb-10"
        >
          <Pressable onPress={() => router.back()}>
            <LinearGradient
              colors={["#C4A882", "#A68E6B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-14 rounded-xl flex-row items-center justify-center gap-2"
            >
              <Text className="font-body text-on-primary font-semibold text-sm uppercase tracking-widest">
                Continue
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#3F2D11" />
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}
