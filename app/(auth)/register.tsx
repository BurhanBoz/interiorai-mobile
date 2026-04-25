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
  const {
    appleAvailable,
    loading: socialLoading,
    signInWithApple,
    signInWithGoogle,
  } = useSocialAuth();
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
      await register(email.trim(), password, fullName.trim() || undefined);
    } catch (e: any) {
      Alert.alert(
        t("auth.register_failed_title"),
        e?.message ?? t("auth.register_failed_description"),
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
          <View style={{ marginBottom: 48 }}>
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
            {t("auth.register_eyebrow")}
          </Text>
          <Text
            style={{
              fontFamily: "NotoSerif",
              fontSize: 32,
              lineHeight: 38,
              letterSpacing: -0.3,
              color: theme.color.onSurface,
              marginBottom: 36,
            }}
          >
            {t("auth.register_title")}
          </Text>

          {/* Form */}
          <View style={{ gap: 18 }}>
            <Input
              label={t("auth.full_name_label")}
              placeholder={t("auth.full_name_placeholder")}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              icon="person-outline"
            />
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
              title={loading ? t("auth.creating") : t("auth.sign_up")}
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

          {/* Social */}
          <View style={{ flexDirection: "row", gap: 10 }}>
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
              {t("auth.already_have_account")}{" "}
            </Text>
            <Pressable onPress={() => router.push("/login")} hitSlop={6}>
              <Text
                style={{
                  fontFamily: "Inter-SemiBold",
                  fontSize: 14,
                  color: theme.color.goldMidday,
                  letterSpacing: 0.2,
                }}
              >
                {t("auth.sign_in_link")}
              </Text>
            </Pressable>
          </View>
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
        flex: 1,
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
          paddingHorizontal: 16,
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
