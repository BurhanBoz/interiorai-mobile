import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as authService from "@/services/auth";
import { Brand } from "@/components/brand/Brand";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { theme } from "@/config/theme";

/**
 * The password-reset form the user lands on after clicking the email
 * link. Two fields (new + confirm). Inline validation errors instead
 * of the old alert-based one.
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleReset = async () => {
    let hasError = false;
    if (!newPassword.trim()) {
      setNewError(t("auth.password_required"));
      hasError = true;
    } else if (newPassword.length < 8 || newPassword.length > 72) {
      setNewError(t("reset_password.password_too_short"));
      hasError = true;
    } else {
      setNewError(null);
    }
    if (!confirmPassword.trim()) {
      setConfirmError(t("auth.password_required"));
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmError(t("reset_password.passwords_dont_match"));
      hasError = true;
    } else {
      setConfirmError(null);
    }
    if (!token) {
      setFormError(t("reset_password.generic_error"));
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    setFormError(null);
    try {
      await authService.resetPassword(token as string, newPassword);
      Alert.alert(
        t("reset_password.success_title"),
        t("reset_password.success_description"),
        [
          {
            text: t("auth.sign_in_link"),
            onPress: () => router.replace("/(auth)/login"),
          },
        ],
      );
    } catch (e: any) {
      const message =
        e?.response?.data?.message ?? t("reset_password.generic_error");
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.color.surface }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: 24,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand header */}
          <View
            style={{
              alignItems: "center",
              marginTop: 16,
              marginBottom: 40,
            }}
          >
            <Brand variant="inline" size="sm" tone="gold" />
          </View>

          <Text
            style={{
              fontFamily: "Inter-SemiBold",
              fontSize: 10,
              letterSpacing: 2.2,
              textTransform: "uppercase",
              color: theme.color.goldMidday,
              marginBottom: 12,
            }}
          >
            {t("reset_password.eyebrow")}
          </Text>
          <Text
            style={{
              fontFamily: "NotoSerif",
              fontSize: 32,
              lineHeight: 38,
              letterSpacing: -0.3,
              color: theme.color.onSurface,
              marginBottom: 10,
            }}
          >
            {t("reset_password.title")}
          </Text>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 15,
              lineHeight: 22,
              color: theme.color.onSurfaceVariant,
              marginBottom: 32,
            }}
          >
            {t("reset_password.subtitle")}
          </Text>

          <View style={{ gap: 18 }}>
            <Input
              label={t("reset_password.new_password_label")}
              placeholder={t("reset_password.new_password_placeholder")}
              value={newPassword}
              onChangeText={(v) => {
                setNewPassword(v);
                if (newError) setNewError(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              icon="lock-closed-outline"
              error={newError}
              helper={newError ? undefined : t("auth.password_helper")}
              trailing={
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                  accessibilityLabel={t("auth.toggle_password_visibility")}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.color.onSurfaceMuted}
                  />
                </Pressable>
              }
              disabled={loading}
            />
            <Input
              label={t("reset_password.confirm_password_label")}
              placeholder={t("reset_password.confirm_password_placeholder")}
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);
                if (confirmError) setConfirmError(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              icon="shield-checkmark-outline"
              error={confirmError}
              disabled={loading}
            />
          </View>

          {formError ? (
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 13,
                color: theme.color.danger,
                marginTop: 16,
              }}
            >
              {formError}
            </Text>
          ) : null}

          <View style={{ marginTop: 24 }}>
            <Button
              title={
                loading
                  ? t("reset_password.resetting")
                  : t("reset_password.submit")
              }
              variant="primary"
              size="lg"
              onPress={handleReset}
              loading={loading}
              icon="arrow-forward"
            />
          </View>

          <View style={{ alignItems: "center", marginTop: 12 }}>
            <Button
              title={t("reset_password.request_new_link")}
              variant="tertiary"
              size="sm"
              onPress={() => router.replace("/(auth)/forgot-password")}
              disabled={loading}
              fullWidth={false}
            />
          </View>

          {/* Footer — back to login */}
          <View style={{ marginTop: "auto", alignItems: "center", paddingTop: 32 }}>
            <Button
              title={t("forgot_password.back_to_login")}
              variant="tertiary"
              size="sm"
              onPress={() => router.replace("/(auth)/login")}
              disabled={loading}
              icon="chevron-back"
              iconLeft
              fullWidth={false}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
