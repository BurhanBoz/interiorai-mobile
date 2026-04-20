import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as authService from "@/services/auth";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    setError("");

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError(t("auth.register_missing_fields"));
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      setError(t("reset_password.password_too_short"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("reset_password.passwords_dont_match"));
      return;
    }
    if (!token) {
      setError(t("reset_password.generic_error"));
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, newPassword);
      Alert.alert(
        t("reset_password.success_title"),
        t("reset_password.success_description"),
        [{ text: t("auth.sign_in_link"), onPress: () => router.replace("/(auth)/login") }],
      );
    } catch (e: any) {
      const message = e?.response?.data?.message ?? t("reset_password.generic_error");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <View
        className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-surface-container-low opacity-20"
        style={{ transform: [{ scale: 1.5 }] }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 px-6">
            {/* Header */}
            <Text className="mt-4 text-center font-headline text-xl uppercase tracking-widest text-[#F5F0EB]">
              {t("app.brand")}
            </Text>

            {/* Headline */}
            <Text
              className="mt-10 font-headline font-bold tracking-tight text-on-surface"
              style={{ fontSize: 40, lineHeight: 44 }}
            >
              {t("reset_password.title")}
            </Text>
            <Text className="mt-2 font-body text-sm text-on-surface-variant">
              {t("reset_password.subtitle")}
            </Text>

            {/* Form */}
            <View className="mt-8 gap-5">
              {/* New Password */}
              <View>
                <Text className="mb-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
                  {t("reset_password.new_password_label")}
                </Text>
                <View className="relative">
                  <TextInput
                    className="rounded-xl bg-surface-container-low px-4 py-3.5 pr-12 font-body text-base text-on-surface"
                    placeholder={t("reset_password.new_password_placeholder")}
                    placeholderTextColor="#4D463C"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!loading}
                  />
                  <Pressable
                    className="absolute right-4 top-0 bottom-0 justify-center"
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#D0C5B8"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View>
                <Text className="mb-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
                  {t("reset_password.confirm_password_label")}
                </Text>
                <TextInput
                  className="rounded-xl bg-surface-container-low px-4 py-3.5 font-body text-base text-on-surface"
                  placeholder={t("reset_password.confirm_password_placeholder")}
                  placeholderTextColor="#4D463C"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Error */}
            {error ? (
              <Text className="mt-3 font-body text-sm text-red-400">
                {error}
              </Text>
            ) : null}

            {/* Submit */}
            <View className="mt-6">
              <PrimaryButton
                label={loading ? t("reset_password.resetting") : t("reset_password.submit")}
                onPress={handleReset}
                loading={loading}
              />
            </View>

            {/* Request new reset link */}
            <Pressable
              onPress={() => router.replace("/(auth)/forgot-password")}
              className="mt-4 items-center"
              disabled={loading}
            >
              <Text className="font-body text-sm text-primary">
                {t("reset_password.request_new_link")}
              </Text>
            </Pressable>

            {/* Footer */}
            <View className="mb-16 mt-auto items-center">
              <Pressable
                onPress={() => router.replace("/(auth)/login")}
                className="flex-row items-center gap-1"
                disabled={loading}
              >
                <Ionicons name="arrow-back" size={18} color="#D0C5B8" />
                <Text className="font-body text-sm text-on-surface-variant">
                  {t("forgot_password.back_to_login")}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
