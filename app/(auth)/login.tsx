import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useSocialAuth } from "@/hooks/useSocialAuth";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = useAuthStore(s => s.login);
  const { appleAvailable, loading: socialLoading, signInWithApple, signInWithGoogle } = useSocialAuth();
  const busy = isLoading || socialLoading !== null;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t("auth.missing_fields_title"), t("auth.missing_fields_description"));
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      Alert.alert(
        t("auth.login_failed_title"),
        error?.message || t("auth.login_failed_description"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 32,
            paddingTop: 64,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Identity */}
          <View className="mb-10">
            <Text
              className="font-headline font-bold text-secondary"
              style={{
                fontSize: 14,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              {t("app.brand")}
            </Text>
          </View>

          {/* Headline */}
          <Text
            className="font-headline font-bold text-on-surface mb-2"
            style={{ fontSize: 36, lineHeight: 42 }}
          >
            {t("auth.login_title")}
          </Text>
          <Text
            className="font-body text-sm text-on-surface-variant mb-10"
            style={{ fontWeight: "300" }}
          >
            {t("auth.login_subtitle")}
          </Text>

          {/* Email Input */}
          <View className="mb-5">
            <Text
              className="font-label text-on-surface-variant uppercase ml-1 mb-2"
              style={{ fontSize: 11, letterSpacing: 2 }}
            >
              {t("auth.email_label")}
            </Text>
            <View className="flex-row items-center bg-surface-container-high rounded-xl">
              <View className="pl-4">
                <Ionicons name="mail-outline" size={20} color="#D0C5B8" />
              </View>
              <TextInput
                className="flex-1 py-4 pl-3 pr-4 font-body text-on-surface text-sm"
                placeholder={t("auth.email_placeholder")}
                placeholderTextColor="#998F84"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View className="mb-4">
            <Text
              className="font-label text-on-surface-variant uppercase ml-1 mb-2"
              style={{ fontSize: 11, letterSpacing: 2 }}
            >
              {t("auth.password_label")}
            </Text>
            <View className="flex-row items-center bg-surface-container-high rounded-xl">
              <View className="pl-4">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#D0C5B8"
                />
              </View>
              <TextInput
                className="flex-1 py-4 pl-3 pr-2 font-body text-on-surface text-sm"
                placeholder={t("auth.password_placeholder")}
                placeholderTextColor="#998F84"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="pr-4"
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#D0C5B8"
                />
              </Pressable>
            </View>
          </View>

          {/* Forgot Password */}
          <View className="items-end mb-6">
            <Pressable onPress={() => router.push("/forgot-password")}>
              <Text
                className="font-label text-secondary uppercase"
                style={{ fontSize: 11, letterSpacing: 2 }}
              >
                {t("auth.forgot_password")}
              </Text>
            </Pressable>
          </View>

          {/* Sign In CTA */}
          <PrimaryButton
            label={isLoading ? t("auth.signing_in") : t("auth.sign_in")}
            onPress={handleLogin}
            disabled={busy}
            loading={isLoading}
          />

          {/* Divider */}
          <View className="flex-row items-center my-8" style={{ gap: 12 }}>
            <View
              className="flex-1 h-px"
              style={{ backgroundColor: "rgba(77,70,60,0.2)" }}
            />
            <Text
              className="font-label text-on-surface-variant uppercase"
              style={{ fontSize: 10, letterSpacing: 3 }}
            >
              {t("auth.continue_with")}
            </Text>
            <View
              className="flex-1 h-px"
              style={{ backgroundColor: "rgba(77,70,60,0.2)" }}
            />
          </View>

          {/* Social Login — larger tap target, more breathing room.
              height 56 → 64 lets the text sit centered vertically without
              crowding the icon; bumped gap and letterSpacing to feel more
              native (Apple HIG calls for ≥64pt for primary auth actions). */}
          <View className="flex-row" style={{ gap: 12 }}>
            <Pressable
              onPress={signInWithGoogle}
              disabled={busy}
              className="flex-1 flex-row items-center justify-center rounded-xl bg-surface-container-high"
              style={({ pressed }) => ({
                minHeight: 64,
                paddingVertical: 18,
                paddingHorizontal: 20,
                gap: 12,
                opacity: busy ? 0.5 : pressed ? 0.8 : 1,
              })}
            >
              {socialLoading === "google" ? (
                <ActivityIndicator size="small" color="#E5E2E1" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={22} color="#E5E2E1" />
                  <Text
                    className="font-body font-medium text-on-surface"
                    style={{
                      fontSize: 15,
                      letterSpacing: 0.4,
                      textAlign: "center",
                    }}
                    numberOfLines={1}
                  >
                    {t("auth.google")}
                  </Text>
                </>
              )}
            </Pressable>
            {appleAvailable && (
              <Pressable
                onPress={signInWithApple}
                disabled={busy}
                className="flex-1 flex-row items-center justify-center rounded-xl bg-surface-container-high"
                style={({ pressed }) => ({
                  minHeight: 64,
                  paddingVertical: 18,
                  paddingHorizontal: 20,
                  gap: 12,
                  opacity: busy ? 0.5 : pressed ? 0.8 : 1,
                })}
              >
                {socialLoading === "apple" ? (
                  <ActivityIndicator size="small" color="#E5E2E1" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={24} color="#E5E2E1" />
                    <Text
                      className="font-body font-medium text-on-surface"
                      style={{
                        fontSize: 15,
                        letterSpacing: 0.4,
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                    >
                      {t("auth.apple")}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-center mt-auto pt-8">
            <Text className="font-body text-on-surface-variant text-sm">
              {t("auth.dont_have_account")}{" "}
            </Text>
            <Pressable onPress={() => router.push("/register")}>
              <Text className="font-body text-secondary font-semibold text-sm ml-1">
                {t("auth.register_link")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
