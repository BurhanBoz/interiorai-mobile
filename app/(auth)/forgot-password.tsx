import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as authService from "@/services/auth";
import { Brand } from "@/components/brand/Brand";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TopBar } from "@/components/layout/TopBar";
import { theme } from "@/config/theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Stage = "form" | "success";

/**
 * Password reset request screen. Two stages:
 *   1. form — enter email, submit
 *   2. success — soft confirmation + resend option
 *
 * Editorial treatment matches login / register. The success stage uses
 * a warm gold hero glyph (mail-open) inside a quiet tile so it reads as
 * "we sent it" not "something broke".
 */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("form");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validate = (value: string): string | null => {
    if (!value.trim()) return t("forgot_password.missing_email");
    if (!EMAIL_REGEX.test(value.trim()))
      return t("forgot_password.invalid_email_format");
    return null;
  };

  const sendLink = async (targetEmail: string) => {
    setLoading(true);
    try {
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
    const err = validate(email);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    await sendLink(email.trim().toLowerCase());
  };

  const handleResend = async () => {
    if (loading || !sentTo) return;
    await sendLink(sentTo);
    Alert.alert(
      t("forgot_password.link_resent_title"),
      t("forgot_password.link_resent_description"),
    );
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.color.surface }}
    >
      <TopBar showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 8 }}>
          {/* Hero glyph tile */}
          <View style={{ alignItems: "center", marginTop: 24, marginBottom: 32 }}>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: "rgba(225,195,155,0.08)",
              }}
            />
            <View
              style={{
                width: 104,
                height: 104,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(225,195,155,0.06)",
                borderWidth: 1,
                borderColor: "rgba(225,195,155,0.24)",
                ...theme.elevation.md,
              }}
            >
              <Ionicons
                name={stage === "success" ? "mail-open-outline" : "lock-closed-outline"}
                size={40}
                color={theme.color.goldMidday}
              />
            </View>
          </View>

          {stage === "form" ? (
            <FormStage
              email={email}
              emailError={error}
              onEmailChange={(v) => {
                setEmail(v);
                if (error) setError(null);
              }}
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

          {/* Form-stage footer */}
          {stage === "form" ? (
            <View style={{ marginTop: "auto", alignItems: "center", paddingBottom: 12 }}>
              <Button
                title={`${t("forgot_password.remember_password")} ${t("auth.sign_in_link")}`}
                variant="tertiary"
                size="sm"
                onPress={() => router.back()}
                fullWidth={false}
              />
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormStage({
  email,
  emailError,
  onEmailChange,
  onSubmit,
  loading,
}: {
  email: string;
  emailError: string | null;
  onEmailChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Text
        style={{
          fontFamily: "Inter-SemiBold",
          fontSize: 10,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          color: theme.color.goldMidday,
          textAlign: "center",
          marginBottom: 10,
        }}
      >
        {t("forgot_password.eyebrow")}
      </Text>
      <Text
        style={{
          fontFamily: "NotoSerif",
          fontSize: 30,
          lineHeight: 36,
          letterSpacing: -0.3,
          color: theme.color.onSurface,
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        {t("forgot_password.title")}
      </Text>
      <Text
        style={{
          fontFamily: "Inter",
          fontSize: 14,
          lineHeight: 22,
          color: theme.color.onSurfaceVariant,
          textAlign: "center",
          maxWidth: 320,
          alignSelf: "center",
          marginBottom: 28,
        }}
      >
        {t("forgot_password.description")}
      </Text>

      <Input
        label={t("auth.email_label")}
        placeholder={t("auth.email_placeholder")}
        value={email}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        icon="mail-outline"
        error={emailError}
      />

      <View style={{ marginTop: 20 }}>
        <Button
          title={
            loading ? t("common.sending") : t("forgot_password.submit")
          }
          variant="primary"
          size="lg"
          onPress={onSubmit}
          loading={loading}
          icon="arrow-forward"
        />
      </View>
    </>
  );
}

function SuccessStage({
  email,
  loading,
  onResend,
  onBackToLogin,
  onEditEmail,
}: {
  email: string;
  loading: boolean;
  onResend: () => void;
  onBackToLogin: () => void;
  onEditEmail: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Text
        style={{
          fontFamily: "Inter-SemiBold",
          fontSize: 10,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          color: theme.color.goldMidday,
          textAlign: "center",
          marginBottom: 10,
        }}
      >
        {t("forgot_password.success_eyebrow")}
      </Text>
      <Text
        style={{
          fontFamily: "NotoSerif",
          fontSize: 28,
          lineHeight: 34,
          letterSpacing: -0.3,
          color: theme.color.onSurface,
          textAlign: "center",
          marginBottom: 14,
        }}
      >
        {t("forgot_password.success_title")}
      </Text>
      <Text
        style={{
          fontFamily: "Inter",
          fontSize: 14,
          lineHeight: 22,
          color: theme.color.onSurfaceVariant,
          textAlign: "center",
          maxWidth: 340,
          alignSelf: "center",
          marginBottom: 6,
        }}
      >
        {t("forgot_password.success_description_prefix")}{" "}
        <Text
          style={{
            fontFamily: "Inter-SemiBold",
            color: theme.color.onSurface,
          }}
        >
          {email}
        </Text>
        , {t("forgot_password.success_description_suffix")}
      </Text>

      <View style={{ alignItems: "center", marginTop: 4, marginBottom: 28 }}>
        <Button
          title={t("forgot_password.wrong_email")}
          variant="tertiary"
          size="sm"
          onPress={onEditEmail}
          fullWidth={false}
        />
      </View>

      <Button
        title={t("forgot_password.back_to_login")}
        variant="primary"
        size="lg"
        onPress={onBackToLogin}
        icon="arrow-forward"
      />

      <View style={{ alignItems: "center", marginTop: 12 }}>
        <Button
          title={loading ? t("forgot_password.resending") : t("forgot_password.resend")}
          variant="tertiary"
          size="sm"
          onPress={onResend}
          disabled={loading}
          fullWidth={false}
        />
      </View>
    </>
  );
}
