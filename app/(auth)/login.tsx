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
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useSocialAuth } from "@/hooks/useSocialAuth";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand } from "@/components/brand/Brand";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/config/theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign-in screen. Editorial hero, single primary CTA, apple/google
 * social sub-row, registration footer link.
 *
 * Audit fixes:
 *   - Hand-rolled TextInputs → <Input/> with label + icon + error
 *   - Gradient button + social button hand-roll → <Button/> variants
 *   - Hardcoded #D0C5B8 / #998F84 / #E5E2E1 / "rgba(77,70,60,...)" →
 *     theme tokens
 *   - Inline email validation via <Input error={...}> (no Alert.alert
 *     for empty fields; the inline error is kinder)
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const login = useAuthStore((s) => s.login);
  const {
    appleAvailable,
    loading: socialLoading,
    signInWithApple,
    signInWithGoogle,
  } = useSocialAuth();
  const busy = isLoading || socialLoading !== null;

  const handleLogin = async () => {
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

    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      const status = error?.response?.status;
      const msg =
        status === 429
          ? t("errors.rate_limit")
          : status >= 500
            ? t("errors.generic")
            : t("auth.login_failed_description");
      Alert.alert(t("auth.login_failed_title"), msg);
    } finally {
      setIsLoading(false);
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
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: 40,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand mark */}
          <View style={{ marginBottom: 48 }}>
            <Brand variant="inline" size="sm" tone="gold" />
          </View>

          {/* Editorial hero — eyebrow + display serif + sub-headline */}
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
            {t("auth.login_eyebrow")}
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
            {t("auth.login_title")}
          </Text>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 15,
              lineHeight: 22,
              color: theme.color.onSurfaceVariant,
              marginBottom: 36,
            }}
          >
            {t("auth.login_subtitle")}
          </Text>

          {/* Form */}
          <View style={{ gap: 18 }}>
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

          {/* Forgot password — quiet text link */}
          <View style={{ alignItems: "flex-end", marginTop: 14 }}>
            <Button
              title={t("auth.forgot_password")}
              variant="tertiary"
              size="sm"
              onPress={() => router.push("/forgot-password")}
              fullWidth={false}
            />
          </View>

          {/* Primary CTA */}
          <View style={{ marginTop: 18 }}>
            <Button
              title={isLoading ? t("auth.signing_in") : t("auth.sign_in")}
              variant="primary"
              size="lg"
              onPress={handleLogin}
              disabled={busy}
              loading={isLoading}
              icon="arrow-forward"
            />
          </View>

          {/* Divider */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              marginVertical: 28,
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
                fontFamily: "Inter-SemiBold",
                fontSize: 10,
                letterSpacing: 2.2,
                textTransform: "uppercase",
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

          {/* Social providers */}
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

          {/* Footer */}
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
                fontFamily: "Inter",
                fontSize: 14,
                color: theme.color.onSurfaceVariant,
              }}
            >
              {t("auth.dont_have_account")}{" "}
            </Text>
            <Pressable onPress={() => router.push("/register")} hitSlop={6}>
              <Text
                style={{
                  fontFamily: "Inter-SemiBold",
                  fontSize: 14,
                  color: theme.color.goldMidday,
                  letterSpacing: 0.2,
                }}
              >
                {t("auth.register_link")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Compact social auth button — matches <Button variant="secondary"> but
 * with a provider logo on the left and a locked size that leaves room
 * for both "Google" and "Apple" translations side-by-side.
 */
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
  // Gold gradient — same tone as the primary "Sign In" CTA so social login
  // reads as a first-class path, not a dimmer alternative. Icon + text use
  // the dark onGold color so contrast stays WCAG-safe on the warm fill.
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
          paddingHorizontal: 20,
          borderRadius: 14,
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
                fontFamily: "Inter-SemiBold",
                fontSize: 14,
                letterSpacing: 0.3,
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
