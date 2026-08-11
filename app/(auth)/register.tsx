import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router , useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { EMAIL_REGEX } from "@/utils/validation";
import { useAuthStore } from "@/stores/authStore";
import { useSocialAuth } from "@/hooks/useSocialAuth";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand } from "@/components/brand/Brand";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LegalFooter } from "@/components/ui/LegalFooter";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/config/theme";


/**
 * Account creation screen. Same editorial treatment as login, with three
 * fields (full name optional, email, password). Password has a subtle
 * helper line explaining the 8-char minimum. Social auth lives below the
 * divider, same shape as the login screen.
 */
export default function RegisterScreen() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const register = useAuthStore((s) => s.register);
  const upgradeGuest = useAuthStore((s) => s.upgradeGuest);
  // V53 guest-first — ?upgrade=1 converts the CURRENT guest in place
  // (same wallet/jobs) instead of creating a brand-new account.
  const { upgrade } = useLocalSearchParams<{ upgrade?: string }>();
  const isUpgrade = upgrade === "1";
  // Reached from inside the app (profile → "secure your account"), so this
  // screen must be escapable. Onboarding pushes it as the first route, where
  // there is nothing to go back to and the control stays hidden.
  const canDismiss = router.canGoBack();
  const {
    appleAvailable,
    loading: socialLoading,
    signInWithApple,
    signInWithGoogle,
  } = useSocialAuth(
    isUpgrade
      // In upgrade mode the token goes to /me/upgrade/social so the identity
      // lands on the CURRENT guest — plain sign-in would hand the user a new
      // account and leave their credits and designs behind. On success we
      // return to where they came from instead of jumping to the gallery.
      ? { upgrade: true, onSuccess: () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/studio")) }
      : undefined,
  );
  const busy = loading || socialLoading !== null;

  const handleSignUp = async () => {
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
    } else if (password.length < 8) {
      setPasswordError(t("reset_password.password_too_short"));
      hasError = true;
    } else {
      setPasswordError(null);
    }
    if (hasError) return;

    setLoading(true);
    try {
      if (isUpgrade) {
        // No display name here: the upgrade form asks for credentials only —
        // the backend derives a name from the address and Settings can edit it.
        await upgradeGuest(email.trim(), password);
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)/studio");
      } else {
        await register(email.trim(), password, fullName.trim() || undefined);
      }
    } catch (e: any) {
      const status = e?.response?.status;
      // A taken address is the one failure with a real next step, and in
      // upgrade mode that step is NOT "try again": the user already owns an
      // account, so offer to sign into it.
      const emailTaken = status === 409
        || e?.response?.data?.code === "EMAIL_ALREADY_EXISTS";
      if (isUpgrade && emailTaken) {
        Alert.alert(
          t("auth.upgrade_email_taken_title"),
          t("auth.upgrade_email_taken_body"),
          [
            { text: t("common.cancel"), style: "cancel" },
            { text: t("auth.sign_in_link"), onPress: () => router.push("/login") },
          ],
        );
        return;
      }
      const msg =
        status === 429
          ? t("errors.rate_limit")
          : status >= 500
            ? t("errors.generic")
            : t("auth.register_failed_description");
      Alert.alert(
        isUpgrade ? t("auth.upgrade_failed_title") : t("auth.register_failed_title"),
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: 40,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Dismiss — without it this screen was a dead end: the user tapped
              "add your email" from Settings and had no way back out. */}
          <View style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            marginBottom: 40,
          }}>
            <Brand variant="inline" size="sm" tone="gold" />
            {canDismiss ? (
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("common.cancel")}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: "rgba(225,195,155,0.08)",
                  borderWidth: 1, borderColor: "rgba(225,195,155,0.22)",
                }}
              >
                <Ionicons name="close" size={18} color={theme.color.onSurfaceVariant} />
              </Pressable>
            ) : null}
          </View>

          <Text
            style={{
              ...theme.text.caption,
              color: theme.color.goldMidday,
              marginBottom: 12,
            }}
          >
            {isUpgrade ? t("auth.upgrade_eyebrow") : t("auth.register_eyebrow")}
          </Text>
          <Text
            style={{
              ...theme.text.display,
              color: theme.color.onSurface,
              marginBottom: isUpgrade ? 12 : 36,
            }}
          >
            {isUpgrade ? t("auth.upgrade_title") : t("auth.register_title")}
          </Text>
          {isUpgrade ? (
            <Text
              style={{
                ...theme.text.body,
                color: theme.color.onSurfaceVariant,
                marginBottom: 32,
              }}
            >
              {t("auth.upgrade_subtitle")}
            </Text>
          ) : null}

          {/* Form — upgrade asks for credentials only. The guest already has a
              display name ("Guest 5"); the backend replaces it from the address
              and Settings can change it later, so a name field here is friction
              in the one flow we most need people to finish. */}
          <View style={{ gap: 18 }}>
            {!isUpgrade ? (
              <Input
                label={t("auth.full_name_label")}
                placeholder={t("auth.full_name_placeholder")}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                icon="person-outline"
              />
            ) : null}
            <Input
              label={t("auth.email_label")}
              placeholder={t("auth.email_placeholder")}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (emailError) setEmailError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              error={emailError}
            />
            <Input
              label={t("auth.password_label")}
              placeholder={t("auth.password_placeholder")}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (passwordError) setPasswordError(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              icon="lock-closed-outline"
              error={passwordError}
              helper={passwordError ? undefined : t("auth.password_helper")}
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
            />
          </View>

          {/* Primary CTA */}
          <View style={{ marginTop: 28 }}>
            <Button
              title={
                loading
                  ? t("auth.creating")
                  : isUpgrade
                    ? t("auth.upgrade_cta")
                    : t("auth.sign_up")
              }
              variant="primary"
              size="lg"
              onPress={handleSignUp}
              disabled={busy}
              loading={loading}
              icon="arrow-forward"
            />
          </View>

          {/* Divider */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              marginVertical: 24,
            }}
          >
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: "rgba(77,70,60,0.22)",
              }}
            />
            <Text
              style={{
                ...theme.text.caption,
                color: theme.color.onSurfaceMuted,
              }}
            >
              {t("auth.continue_with")}
            </Text>
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: "rgba(77,70,60,0.22)",
              }}
            />
          </View>

          {/* Social */}
          <View style={{ flexDirection: "row", gap: 12, justifyContent: "center" }}>
            <SocialButton
              onPress={signInWithGoogle}
              loading={socialLoading === "google"}
              disabled={busy}
              icon="logo-google"
              label={t("auth.google")}
            />
            {appleAvailable ? (
              <SocialButton
                onPress={signInWithApple}
                loading={socialLoading === "apple"}
                disabled={busy}
                icon="logo-apple"
                label={t("auth.apple")}
              />
            ) : null}
          </View>

          {/* Footer — hidden while upgrading: signing into another account
              would abandon the guest whose credits and designs the user came
              here to keep. The taken-email alert offers that path explicitly
              when it is genuinely the right one. */}
          {!isUpgrade ? (
            <View
              style={{
                marginTop: "auto",
                paddingTop: 36,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  ...theme.text.body,
                  color: theme.color.onSurfaceVariant,
                }}
              >
                {t("auth.already_have_account")}{" "}
              </Text>
              <Pressable onPress={() => router.push("/login")} hitSlop={6}>
                <Text
                  style={{
                    ...theme.text.subtitle,
                    color: theme.color.goldMidday,
                  }}
                >
                  {t("auth.sign_in_link")}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <LegalFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SocialButton({
  onPress,
  loading,
  disabled,
  icon,
  label,
}: {
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
  icon: "logo-google" | "logo-apple";
  label: string;
}) {
  // Gold gradient — match the primary CTA tone so Google/Apple are visible
  // first-class paths, not dim ghost options.
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minWidth: 155,
        opacity: disabled ? 0.5 : 1,
        transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
      })}
    >
      <LinearGradient
        colors={theme.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          minHeight: 56,
          paddingHorizontal: theme.space.gutter,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: "rgba(63,45,17,0.18)",
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.color.onGold} />
        ) : (
          <>
            <Ionicons name={icon} size={20} color={theme.color.onGold} />
            <Text
              numberOfLines={1}
              style={{
                ...theme.text.subtitle,
                color: theme.color.onGold,
              }}
            >
              {label}
            </Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}
