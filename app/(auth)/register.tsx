import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
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

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);
  const { appleAvailable, loading: socialLoading, signInWithApple, signInWithGoogle } = useSocialAuth();
  const busy = loading || socialLoading !== null;

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert(t("auth.missing_fields_title"), t("auth.register_missing_fields"));
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
    } catch (e: any) {
      Alert.alert(t("auth.register_failed_title"), e?.message ?? t("auth.register_failed_description"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 32,
              paddingTop: 48,
              paddingBottom: 40,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Branding */}
            <Text
              className="font-headline font-bold text-secondary uppercase mb-10"
              style={{ fontSize: 14, letterSpacing: 3 }}
            >
              {t("app.brand")}
            </Text>

            {/* Heading */}
            <Text
              className="font-headline font-bold text-on-surface mb-10"
              style={{ fontSize: 36, lineHeight: 42 }}
            >
              {t("auth.register_title")}
            </Text>

            {/* Full Name */}
            <View className="mb-7">
              <Text
                className="font-label text-on-surface-variant uppercase mb-2"
                style={{ fontSize: 11, letterSpacing: 2 }}
              >
                {t("auth.full_name_label")}
              </Text>
              <TextInput
                className="font-body text-on-surface text-base pb-3 bg-transparent"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(77,70,60,0.2)",
                }}
                placeholderTextColor="rgba(208,197,184,0.4)"
                placeholder={t("auth.full_name_placeholder")}
                value={fullName}
                onChangeText={setFullName}
                selectionColor="#E1C39B"
              />
            </View>

            {/* Email */}
            <View className="mb-7">
              <Text
                className="font-label text-on-surface-variant uppercase mb-2"
                style={{ fontSize: 11, letterSpacing: 2 }}
              >
                {t("auth.email_label")}
              </Text>
              <TextInput
                className="font-body text-on-surface text-base pb-3 bg-transparent"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(77,70,60,0.2)",
                }}
                placeholderTextColor="rgba(208,197,184,0.4)"
                placeholder={t("auth.email_placeholder")}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                selectionColor="#E1C39B"
              />
            </View>

            {/* Password */}
            <View className="mb-10">
              <Text
                className="font-label text-on-surface-variant uppercase mb-2"
                style={{ fontSize: 11, letterSpacing: 2 }}
              >
                {t("auth.password_label")}
              </Text>
              <View
                className="flex-row items-center"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(77,70,60,0.2)",
                }}
              >
                <TextInput
                  className="flex-1 font-body text-on-surface text-base pb-3 bg-transparent"
                  placeholderTextColor="rgba(208,197,184,0.4)"
                  placeholder={t("auth.password_placeholder")}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  value={password}
                  onChangeText={setPassword}
                  selectionColor="#E1C39B"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="pb-3"
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="rgba(208,197,184,0.6)"
                  />
                </Pressable>
              </View>
            </View>

            {/* CTA Button */}
            <PrimaryButton
              label={loading ? t("auth.creating") : t("auth.sign_up")}
              onPress={handleSignUp}
              disabled={busy}
              loading={loading}
            />

            {/* Divider */}
            <View className="flex-row items-center my-6" style={{ gap: 12 }}>
              <View className="flex-1 h-px bg-surface-container-high" />
              <Text
                className="font-label text-on-surface-variant uppercase"
                style={{ fontSize: 11, letterSpacing: 3, opacity: 0.5 }}
              >
                {t("auth.continue_with")}
              </Text>
              <View className="flex-1 h-px bg-surface-container-high" />
            </View>

            {/* Social Buttons */}
            <View className="flex-row" style={{ gap: 12 }}>
              <Pressable
                onPress={signInWithGoogle}
                disabled={busy}
                className="flex-1 flex-row items-center justify-center rounded-xl bg-surface-container-high"
                style={({ pressed }) => ({
                  height: 52,
                  gap: 10,
                  opacity: busy ? 0.5 : pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="logo-google" size={18} color="#E5E2E1" />
                <Text
                  className="font-label font-bold text-on-surface uppercase"
                  style={{ fontSize: 11, letterSpacing: 3 }}
                >
                  {socialLoading === "google" ? t("auth.signing_in") : t("auth.google")}
                </Text>
              </Pressable>
              {appleAvailable && (
                <Pressable
                  onPress={signInWithApple}
                  disabled={busy}
                  className="flex-1 flex-row items-center justify-center rounded-xl bg-surface-container-high"
                  style={({ pressed }) => ({
                    height: 52,
                    gap: 10,
                    opacity: busy ? 0.5 : pressed ? 0.8 : 1,
                  })}
                >
                  <Ionicons name="logo-apple" size={20} color="#E5E2E1" />
                  <Text
                    className="font-label font-bold text-on-surface uppercase"
                    style={{ fontSize: 11, letterSpacing: 3 }}
                  >
                    {socialLoading === "apple" ? t("auth.signing_in") : t("auth.apple")}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Footer */}
            <View className="flex-row items-center justify-center mt-auto pt-10">
              <Text className="font-body text-on-surface-variant text-sm">
                {t("auth.already_have_account")}{" "}
              </Text>
              <Pressable onPress={() => router.push("/login")}>
                <Text className="font-body text-secondary font-semibold text-sm ml-1">
                  {t("auth.sign_in_link")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
