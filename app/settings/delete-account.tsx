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
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "@/stores/authStore";
import * as userService from "@/services/user";

type Step = "details" | "confirm";

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const logout = useAuthStore(s => s.logout);
  const user = useAuthStore(s => s.user);

  /**
   * Parolayı yalnız parolası OLAN hesap sorar.
   *
   * <p>🔴 Ekran herkesten parola istiyordu ve "Devam"ı ona bağlıyordu
   * (canContinue = password.length > 0). Misafir hesabın parolası yok —
   * kimliği cihazın kendisi — yani App Store'un 5.1.1(v) ile zorunlu kıldığı
   * hesap silme, uygulamanın ezici çoğunluğu için girilemez bir kutunun
   * arkasında kalıyordu. Apple/Google ile girenlerde de parola yok.
   *
   * <p>Sunucu bunu ZATEN doğru yapıyor: UserDeletionServiceImpl misafir için
   * yeniden kimlik doğrulamayı atlıyor ve gerekçesini de yazmış. Hata
   * yalnız istemcideydi; buradaki koşul sunucununkiyle aynı hâle getirildi.
   * Yıkıcı işlemin onayı duruyor — bir sonraki adımda DELETE yazmak.
   */
  const hasPassword = user?.guest !== true && !user?.externalProvider;

  const [step, setStep] = useState<Step>("details");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canContinue = !hasPassword || password.trim().length > 0;
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
      // The deleted account must not keep advertising itself on the
      // onboarding screen (persistAuth's last_registered_email hint).
      await SecureStore.deleteItemAsync("last_registered_email").catch(() => {});
      // 🔴 /(auth)/login DEĞİL. Hesabını silen kullanıcıyı bir giriş duvarıyla
      // karşılamak, uygulamanın tamamının dayandığı "misafir önce, giriş
      // ekranı yok" kuralını tam da en kötü anda bozuyordu: elinde artık
      // girecek hesap YOK. Onboarding sıfırdan kurulumun yaptığını yapar —
      // sessizce yeni bir misafir kimliği üretir ve Stüdyo'ya bırakır.
      router.replace("/(auth)/onboarding");
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
            <Ionicons name="arrow-back" size={24} color="#F6F1E7" />
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
                  placeholderTextColor="#3D362A"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  maxLength={255}
                  editable={!submitting}
                  textAlignVertical="top"
                />
              </View>

              {hasPassword && (
                <View className="mt-6">
                  <Text className="mb-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
                    {t("settings.delete_account_password_label")}
                  </Text>
                  <TextInput
                    className="rounded-xl bg-surface-container-low px-4 py-3.5 font-body text-base text-on-surface"
                    placeholder={t("settings.delete_account_password_placeholder")}
                    placeholderTextColor="#3D362A"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="current-password"
                    editable={!submitting}
                  />
                </View>
              )}

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
                  placeholderTextColor="#3D362A"
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
