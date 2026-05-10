import {
  View,
  Text,
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
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TopBar } from "@/components/layout/TopBar";
import { theme } from "@/config/theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Account restoration screen — V12 / F1 (14-day grace).
 *
 * <p>Reached via:
 * <ul>
 *   <li>Login screen → user enters email of a soft-deleted account → backend
 *       returns 403 ACCOUNT_DELETED → user taps "Restore" → lands here with
 *       email pre-filled.</li>
 *   <li>(Future) deep-link from a "your account is scheduled for deletion"
 *       confirmation email if/when we add that flow.</li>
 * </ul>
 *
 * <p>Backend contract (services/auth.ts → POST /api/auth/restore-account):
 * email + password are matched against the snapshotted hash on
 * {@code pending_deletion}. Wrong password feeds the V11 lockout counter
 * (5 fails / 15 min) just like login + delete-account. The endpoint itself
 * is rate-limited at 5/min (AUTH_RESTORE) so brute-force is hard.
 *
 * <p>On success the backend re-activates the user and issues a fresh JWT
 * which we drop straight into authStore — same shape as login. The wallet
 * stays zeroed; we surface that on the success Alert so the user knows.
 */
export default function RestoreAccountScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // We side-effect into authStore directly via setState so the user lands
  // signed in (same UX as login) — no separate restore→login two-step.
  const setAuthAfterRestore = (data: Awaited<ReturnType<typeof authService.restoreAccount>>) => {
    useAuthStore.setState({
      token: data.token,
      user: data.user,
      orgId: data.organizationId,
      isAuthenticated: true,
    });
  };

  const handleSubmit = async () => {
    let hasError = false;
    if (!email.trim()) {
      setEmailError(t("auth.email_required"));
      hasError = true;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError(t("auth.invalid_email"));
      hasError = true;
    } else {
      setEmailError(null);
    }
    if (!password.trim()) {
      setPasswordError(t("auth.password_required"));
      hasError = true;
    } else {
      setPasswordError(null);
    }
    if (hasError) return;

    setLoading(true);
    try {
      const data = await authService.restoreAccount(email.trim().toLowerCase(), password);
      // Persist the JWT + user the same way login does. We don't import the
      // store's helpers here to avoid coupling to private internals; the
      // setState shape mirrors login() exactly.
      setAuthAfterRestore(data);

      Alert.alert(
        t("restore_account.success_title", { defaultValue: "Account restored" }),
        t("restore_account.success_description", {
          defaultValue:
            "Welcome back. Your credit balance was reset on deletion — pack credits purchased before deletion are not refunded automatically. Contact support if you have questions.",
        }),
        [
          {
            text: t("common.ok", { defaultValue: "OK" }),
            onPress: () => router.replace("/(tabs)/gallery"),
          },
        ],
      );
    } catch (error: any) {
      const status = error?.response?.status;
      const errorCode = error?.response?.data?.errorCode;

      if (errorCode === "ACCOUNT_LOCKED") {
        Alert.alert(
          t("auth.account_locked_title", { defaultValue: "Account temporarily locked" }),
          t("restore_account.locked_description", {
            defaultValue:
              "Too many restore attempts. Please try again in 15 minutes.",
          }),
        );
        return;
      }

      const msg =
        status === 429
          ? t("errors.rate_limit")
          : status >= 500
            ? t("errors.generic")
            : t("restore_account.invalid_credentials", {
                defaultValue:
                  "We couldn't find a restorable account with those credentials, or the 14-day grace window has expired.",
              });
      Alert.alert(
        t("restore_account.error_title", { defaultValue: "Restore failed" }),
        msg,
      );
    } finally {
      setLoading(false);
    }
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
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: 8,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero — gold-ringed restore glyph echoes forgot-password's hero
              tile so the auth flow reads as one family. */}
          <View
            style={{
              alignItems: "center",
              marginTop: 24,
              marginBottom: 32,
            }}
          >
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: "rgba(225,195,155,0.06)",
                borderWidth: 1,
                borderColor: "rgba(225,195,155,0.28)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="time-outline" size={32} color="#E0C29A" />
            </View>
          </View>

          <Text
            style={{
              fontFamily: "Inter-SemiBold",
              fontSize: 11,
              letterSpacing: 2.4,
              textTransform: "uppercase",
              color: "rgba(225,195,155,0.6)",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            {t("restore_account.eyebrow", { defaultValue: "GRACE WINDOW" })}
          </Text>
          <Text
            style={{
              fontFamily: "NotoSerif",
              fontSize: 28,
              lineHeight: 34,
              color: "#E5E2E1",
              textAlign: "center",
              letterSpacing: -0.4,
              marginBottom: 12,
            }}
          >
            {t("restore_account.title", { defaultValue: "Restore your account" })}
          </Text>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 14,
              lineHeight: 21,
              color: "rgba(209,197,184,0.72)",
              textAlign: "center",
            }}
          >
            {t("restore_account.subtitle", {
              defaultValue:
                "We held your account for 14 days. Sign in with your old password to bring it back.",
            })}
          </Text>

          <View style={{ gap: 16, marginTop: 32 }}>
            <Input
              label={t("auth.email_label")}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.email_placeholder")}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
            />
            <Input
              label={t("auth.password_label")}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.password_placeholder")}
              secureTextEntry
              autoCapitalize="none"
              error={passwordError}
            />
          </View>

          <View style={{ marginTop: 24 }}>
            <Button
              title={t("restore_account.cta", { defaultValue: "Restore account" })}
              onPress={handleSubmit}
              loading={loading}
            />
          </View>

          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 12,
              lineHeight: 18,
              color: "rgba(209,197,184,0.55)",
              textAlign: "center",
              marginTop: 24,
            }}
          >
            {t("restore_account.fine_print", {
              defaultValue:
                "Your previous credit balance was reset on deletion. Pack credits aren't refunded automatically — contact support if you need a refund.",
            })}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
