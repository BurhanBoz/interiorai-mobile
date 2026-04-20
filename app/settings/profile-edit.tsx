import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import * as userService from "@/services/user";

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasChanges =
    displayName !== (user?.displayName ?? "") || email !== (user?.email ?? "");

  const handleSave = async () => {
    setError("");

    const updates: { displayName?: string; email?: string } = {};
    if (displayName !== (user?.displayName ?? "")) {
      updates.displayName = displayName.trim();
    }
    if (email !== (user?.email ?? "")) {
      updates.email = email.trim();
    }

    if (Object.keys(updates).length === 0) {
      router.back();
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await userService.updateProfile(updates);
      setUser(updatedUser);
      Alert.alert(t("settings.profile_edit_success_title"), t("settings.profile_edit_success_description"), [
        { text: t("common.ok"), onPress: () => router.back() },
      ]);
    } catch (e: any) {
      const message = e?.response?.data?.message ?? t("settings.profile_edit_fail");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="px-8 pt-6 pb-4">
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#E5E2E1" />
          </Pressable>
          <Text className="font-headline text-lg text-on-surface">
            {t("settings.profile_edit_title")}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-8 pb-32"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="font-headline text-4xl text-on-surface tracking-tight mt-2">
            {t("profile.title")}
          </Text>
          <View className="mt-4 w-16 h-1 rounded-full bg-primary" />
          <Text className="font-body text-sm text-on-surface-variant mt-4 mb-8">
            {t("settings.profile_edit_subtitle")}
          </Text>

          {/* Display Name */}
          <View className="mb-6">
            <Text className="mb-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
              {t("settings.profile_edit_display_name")}
            </Text>
            <TextInput
              className="rounded-xl bg-surface-container-low px-4 py-3.5 font-body text-base text-on-surface"
              placeholder={t("settings.profile_edit_display_name_placeholder")}
              placeholderTextColor="#4D463C"
              value={displayName}
              onChangeText={setDisplayName}
              editable={!loading}
              maxLength={120}
            />
          </View>

          {/* Email */}
          <View className="mb-6">
            <Text className="mb-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
              {t("settings.profile_edit_email")}
            </Text>
            <TextInput
              className="rounded-xl bg-surface-container-low px-4 py-3.5 font-body text-base text-on-surface"
              placeholder={t("settings.profile_edit_email_placeholder")}
              placeholderTextColor="#4D463C"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          {/* Error */}
          {error ? (
            <Text className="mb-4 font-body text-sm text-red-400">{error}</Text>
          ) : null}

          {/* Save Button */}
          <PrimaryButton
            label={loading ? t("settings.profile_edit_saving") : t("settings.profile_edit_save")}
            onPress={handleSave}
            disabled={!hasChanges}
            loading={loading}
            icon="checkmark"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
