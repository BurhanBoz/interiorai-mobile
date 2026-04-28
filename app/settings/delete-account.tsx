import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useAuthStore } from "@/stores/authStore";
import * as userService from "@/services/user";

type Step = "details" | "confirm";

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const logout = useAuthStore(s => s.logout);

  const [step, setStep] = useState<Step>("details");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canContinue = password.trim().length > 0;
  const canSubmit = confirmText === "DELETE" && !submitting;

  const handleContinue = () => {
    setError("");
    if (!canContinue) return;
    setStep("confirm");
  };

  const handleSubmit = async () => {
    setError("");
    if (confirmText !== "DELETE") {
      setError(t("settings.delete_account_must_type"));
      return;
    }
    setSubmitting(true);
    try {
      await userService.deleteAccount(password, reason.trim() || undefined);
      await logout();
      router.replace("/(auth)/login");
    } catch (e: any) {
      const code = e?.response?.data?.errorCode;
      if (code === "INVALID_CREDENTIALS") {
        setError(t("settings.delete_account_invalid_password"));
        setStep("details");
      } else {
        setError(t("settings.delete_account_failed"));
      }
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="px-8 pt-6 pb-4">
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => (step === "confirm" ? setStep("details") : router.back())}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={24} color="#E5E2E1" />
          </Pressable>
          <Text className="font-headline text-lg text-on-surface">
            {t("settings.delete_account_title")}
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
            {t("settings.delete_account_warning_title")}
          </Text>
          <View className="mt-4 w-16 h-1 rounded-full bg-red-500" />

          <Text className="font-body text-sm text-on-surface-variant mt-6 leading-5">
            {t("settings.delete_account_warning_body")}
          </Text>

          {step === "details" ? (
            <>
              <View className="mt-8">
                <Text className="mb-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
                  {t("settings.delete_account_reason_label")}
                </Text>
                <TextInput
                  className="rounded-xl bg-surface-container-low px-4 py-3.5 font-body text-base text-on-surface min-h-[80px]"
                  placeholder={t("settings.delete_account_reason_placeholder")}
                  placeholderTextColor="#4D463C"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  maxLength={255}
                  editable={!submitting}
                  textAlignVertical="top"
                />
              </View>

              <View className="mt-6">
                <Text className="mb-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
                  {t("settings.delete_account_password_label")}
                </Text>
                <TextInput
                  className="rounded-xl bg-surface-container-low px-4 py-3.5 font-body text-base text-on-surface"
                  placeholder={t("settings.delete_account_password_placeholder")}
                  placeholderTextColor="#4D463C"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="current-password"
                  editable={!submitting}
                />
              </View>

              {error ? (
                <Text className="mt-4 font-body text-sm text-red-400">{error}</Text>
              ) : null}

              <View className="mt-10">
                <PrimaryButton
                  label={t("settings.delete_account_continue")}
                  onPress={handleContinue}
                  disabled={!canContinue}
                  icon="arrow-forward"
                />
              </View>
            </>
          ) : (
            <>
              <Text className="mt-8 font-headline text-xl text-on-surface">
                {t("settings.delete_account_final_title")}
              </Text>
              <Text className="mt-2 font-body text-sm text-on-surface-variant leading-5">
                {t("settings.delete_account_final_body")}
              </Text>

              <View className="mt-6">
                <TextInput
                  className="rounded-xl bg-surface-container-low px-4 py-3.5 font-body text-base text-on-surface"
                  placeholder={t("settings.delete_account_final_placeholder")}
                  placeholderTextColor="#4D463C"
                  value={confirmText}
                  onChangeText={setConfirmText}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!submitting}
                />
              </View>

              {error ? (
                <Text className="mt-4 font-body text-sm text-red-400">{error}</Text>
              ) : null}

              <View className="mt-10">
                <PrimaryButton
                  label={
                    submitting
                      ? t("settings.delete_account_deleting")
                      : t("settings.delete_account_submit")
                  }
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  loading={submitting}
                  icon="trash"
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
