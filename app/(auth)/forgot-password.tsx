import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as authService from "@/services/auth";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Stage = "form" | "success";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("form");
  const [sentTo, setSentTo] = useState("");

  const validate = (value: string): string | null => {
    if (!value.trim()) return t("forgot_password.missing_email");
    if (!EMAIL_REGEX.test(value.trim())) return t("forgot_password.invalid_email_format");
    return null;
  };

  const sendLink = async (targetEmail: string) => {
    setLoading(true);
    try {
      // Backend always returns 200 to prevent user enumeration, so we don't
      // surface "email not found" errors. Network-level errors are shown.
      await authService.forgotPassword(targetEmail);
      setSentTo(targetEmail);
      setStage("success");
    } catch (e: any) {
      Alert.alert(
        t("forgot_password.error_title"),
        e?.message ?? t("forgot_password.error_description"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const error = validate(email);
    if (error) {
      Alert.alert(t("forgot_password.invalid_email_title"), error);
      return;
    }
    await sendLink(email.trim().toLowerCase());
  };

  const handleResend = async () => {
    if (loading || !sentTo) return;
    await sendLink(sentTo);
    Alert.alert(t("forgot_password.link_resent_title"), t("forgot_password.link_resent_description"));
  };

  return (
    <View className="flex-1 bg-surface">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 px-8">
            {/* Back Button */}
            <View className="py-4">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#2A2A2A" : "transparent",
                })}
              >
                <Ionicons name="arrow-back" size={24} color="#E0C29A" />
              </Pressable>
            </View>

            {/* Hero Visual */}
            <View className="items-center mt-6 mb-10">
              <View
                className="absolute rounded-full"
                style={{
                  width: 128,
                  height: 128,
                  backgroundColor: "rgba(224,194,154,0.1)",
                }}
              />
              <View
                className="w-32 h-32 rounded-full items-center justify-center bg-surface-container-low"
                style={{ borderWidth: 1, borderColor: "rgba(77,70,60,0.2)" }}
              >
                <View className="w-20 h-20 rounded-full bg-surface-container-high items-center justify-center">
                  <Ionicons
                    name={stage === "success" ? "mail-open" : "lock-closed"}
                    size={40}
                    color="#E0C29A"
                  />
                </View>
              </View>
            </View>

            {stage === "form" ? (
              <FormStage
                email={email}
                onEmailChange={setEmail}
                onSubmit={handleSubmit}
                loading={loading}
              />
            ) : (
              <SuccessStage
                email={sentTo}
                loading={loading}
                onResend={handleResend}
                onBackToLogin={() => router.replace("/(auth)/login")}
                onEditEmail={() => setStage("form")}
              />
            )}

            {/* Footer */}
            {stage === "form" && (
              <View className="mt-auto pb-10 items-center">
                <Pressable
                  onPress={() => router.back()}
                  className="flex-row items-center"
                  style={{ gap: 6 }}
                >
                  <Text
                    className="font-label text-on-surface-variant uppercase"
                    style={{ fontSize: 11, letterSpacing: 2 }}
                  >
                    {t("forgot_password.remember_password")}
                  </Text>
                  <Text
                    className="font-label text-primary font-bold uppercase"
                    style={{ fontSize: 11, letterSpacing: 2 }}
                  >
                    {t("auth.sign_in_link")}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function FormStage(props: {
  email: string;
  onEmailChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <View className="items-center mb-8">
        <Text
          className="font-headline font-bold text-on-surface uppercase text-center mb-4"
          style={{ fontSize: 36, lineHeight: 40, letterSpacing: -0.5 }}
        >
          {t("forgot_password.title")}
        </Text>
        <Text
          className="font-body text-on-surface-variant leading-relaxed text-center"
          style={{ maxWidth: 280 }}
        >
          {t("forgot_password.description")}
        </Text>
      </View>

      <View className="mb-6">
        <Text
          className="font-label text-on-surface-variant uppercase ml-1 mb-2"
          style={{ fontSize: 11, letterSpacing: 2 }}
        >
          {t("auth.email_label")}
        </Text>
        <TextInput
          className="font-body text-on-surface bg-surface-container-low px-4 py-4"
          style={{
            borderBottomWidth: 2,
            borderBottomColor: "rgba(77,70,60,0.3)",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
          placeholder={t("auth.email_placeholder")}
          placeholderTextColor="rgba(229,226,225,0.2)"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={props.email}
          onChangeText={props.onEmailChange}
          editable={!props.loading}
          selectionColor="#E1C39B"
          returnKeyType="send"
          onSubmitEditing={props.onSubmit}
        />
      </View>

      <PrimaryButton
        label={props.loading ? t("common.sending") : t("forgot_password.submit")}
        onPress={props.onSubmit}
        loading={props.loading}
      />
    </>
  );
}

function SuccessStage(props: {
  email: string;
  loading: boolean;
  onResend: () => void;
  onBackToLogin: () => void;
  onEditEmail: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <View className="items-center mb-8">
        <Text
          className="font-headline font-bold text-on-surface uppercase text-center mb-4"
          style={{ fontSize: 32, lineHeight: 38, letterSpacing: -0.5 }}
        >
          {t("forgot_password.success_title")}
        </Text>
        <Text
          className="font-body text-on-surface-variant leading-relaxed text-center mb-4"
          style={{ maxWidth: 320 }}
        >
          {t("forgot_password.success_description_prefix")}{" "}
          <Text className="font-semibold text-on-surface">{props.email}</Text>,{" "}
          {t("forgot_password.success_description_suffix")}
        </Text>
        <Pressable onPress={props.onEditEmail}>
          <Text
            className="font-label text-secondary uppercase"
            style={{ fontSize: 11, letterSpacing: 2 }}
          >
            {t("forgot_password.wrong_email")}
          </Text>
        </Pressable>
      </View>

      <PrimaryButton
        label={t("forgot_password.back_to_login")}
        onPress={props.onBackToLogin}
      />

      <Pressable
        onPress={props.onResend}
        disabled={props.loading}
        className="items-center mt-6"
      >
        <Text
          className="font-label text-on-surface-variant uppercase"
          style={{ fontSize: 11, letterSpacing: 2, opacity: props.loading ? 0.5 : 1 }}
        >
          {props.loading ? t("forgot_password.resending") : t("forgot_password.resend")}
        </Text>
      </Pressable>
    </>
  );
}
