import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/stores/settingsStore";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export default function LanguageScreen() {
  const { t } = useTranslation();
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
          Roomframe AI
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={{ marginBottom: 48, marginTop: 24 }}>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 38, lineHeight: 44, marginBottom: 16 }}
          >
            {t("settings.language_title")}
          </Text>
          <View
            className="bg-primary"
            style={{ width: 64, height: 2, borderRadius: 1 }}
          />
        </View>

        {/* Language List — built from SUPPORTED_LANGUAGES in i18n/index.ts */}
        <View style={{ gap: 12 }}>
          {SUPPORTED_LANGUAGES.map((lang) => {
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
                  <View style={{ flex: 1 }}>
                    {isSelected && (
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
                    )}
                    <Text
                      className={`font-body ${
                        isSelected ? "text-on-surface" : "text-on-surface-variant"
                      }`}
                      style={{
                        fontSize: 18,
                        fontWeight: isSelected ? "500" : "400",
                      }}
                    >
                      {lang.nativeName}
                    </Text>
                    {lang.nativeName !== lang.englishName && (
                      <Text
                        className="font-label text-on-surface-variant"
                        style={{
                          fontSize: 11,
                          letterSpacing: 1.5,
                          marginTop: 2,
                          opacity: 0.7,
                          textTransform: "uppercase",
                        }}
                      >
                        {lang.englishName}
                      </Text>
                    )}
                  </View>
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

      {/* Bottom CTA */}
      <View className="absolute bottom-0 left-0 right-0">
        <LinearGradient
          colors={["transparent", "rgba(19,19,19,0.9)", "#131313"]}
          locations={[0, 0.35, 1]}
          style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}
        >
          <PrimaryButton label={t("common.continue")} onPress={() => router.back()} />
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}
