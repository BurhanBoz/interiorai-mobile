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
] as const;

export default function LanguageScreen() {
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color="#FEDFB5" />
        </Pressable>
        <Text
          className="font-headline text-on-surface"
          style={{
            fontSize: 14,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Architectural Lens
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={{ marginBottom: 48, marginTop: 24 }}>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 38, lineHeight: 44, marginBottom: 16 }}
          >
            Choose Language
          </Text>
          <View
            className="bg-primary"
            style={{ width: 64, height: 2, borderRadius: 1 }}
          />
        </View>

        {/* Language List */}
        <View style={{ gap: 12 }}>
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => setLanguage(lang.code)}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed && !isSelected ? 0.98 : 1 }],
                })}
              >
                <View
                  className={`flex-row items-center justify-between rounded-xl ${
                    isSelected
                      ? "bg-surface-container-high"
                      : "bg-surface-container-low"
                  }`}
                  style={[
                    { padding: 20 },
                    isSelected && {
                      borderLeftWidth: 2,
                      borderLeftColor: "#FEDFB5",
                    },
                  ]}
                >
                  {isSelected ? (
                    <View>
                      <Text
                        className="font-label text-primary"
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          letterSpacing: 2,
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        Current
                      </Text>
                      <Text
                        className="font-body text-on-surface"
                        style={{ fontSize: 18, fontWeight: "500" }}
                      >
                        {lang.label}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      className="font-body text-on-surface-variant"
                      style={{ fontSize: 18 }}
                    >
                      {lang.label}
                    </Text>
                  )}
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#FEDFB5"
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="absolute bottom-0 left-0 right-0">
        <LinearGradient
          colors={["transparent", "rgba(19,19,19,0.9)", "#131313"]}
          locations={[0, 0.35, 1]}
          style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <LinearGradient
              colors={["#C4A882", "#A68A62"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-row items-center justify-between rounded-xl"
              style={{ height: 56, paddingHorizontal: 24 }}
            >
              <Text
                className="font-label"
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#281801",
                }}
              >
                Continue
              </Text>
              <Ionicons name="arrow-forward" size={22} color="#281801" />
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}
