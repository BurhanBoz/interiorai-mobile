import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as authService from "@/services/auth";

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    setError("");

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      setError("Password must be 8–72 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, newPassword);
      Alert.alert(
        "Password Reset",
        "Your password has been reset successfully. You can now log in.",
        [{ text: "Log In", onPress: () => router.replace("/(auth)/login") }],
      );
    } catch (e: any) {
      const message =
        e?.response?.data?.message ?? "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <View
        className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-surface-container-low opacity-20"
        style={{ transform: [{ scale: 1.5 }] }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 px-6">
            {/* Header */}
            <Text className="mt-4 text-center font-headline text-xl uppercase tracking-widest text-[#F5F0EB]">
              THE ARCHITECTURAL LENS
            </Text>

            {/* Headline */}
            <Text
              className="mt-10 font-headline font-bold tracking-tight text-on-surface"
              style={{ fontSize: 40, lineHeight: 44 }}
            >
              New Password
            </Text>
            <Text className="mt-2 font-body text-sm text-on-surface-variant">
              Choose a strong password for your account.
            </Text>

            {/* Form */}
            <View className="mt-8 gap-5">
              {/* New Password */}
              <View>
                <Text className="mb-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
                  NEW PASSWORD
                </Text>
                <View className="relative">
                  <TextInput
                    className="rounded-xl bg-surface-container-low px-4 py-3.5 pr-12 font-body text-base text-on-surface"
                    placeholder="Enter new password"
                    placeholderTextColor="#4D463C"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!loading}
                  />
                  <Pressable
                    className="absolute right-4 top-0 bottom-0 justify-center"
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#D0C5B8"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View>
                <Text className="mb-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
                  CONFIRM PASSWORD
                </Text>
                <TextInput
                  className="rounded-xl bg-surface-container-low px-4 py-3.5 font-body text-base text-on-surface"
                  placeholder="Confirm new password"
                  placeholderTextColor="#4D463C"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Error */}
            {error ? (
              <Text className="mt-3 font-body text-sm text-red-400">
                {error}
              </Text>
            ) : null}

            {/* Submit */}
            <Pressable
              onPress={handleReset}
              disabled={loading}
              className="mt-6"
              style={({ pressed }) => ({
                opacity: loading ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <LinearGradient
                colors={["#C4A882", "#A68A62"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: 56,
                  borderRadius: 16,
                  paddingHorizontal: 24,
                  borderWidth: 1,
                  borderColor: "rgba(196,168,130,0.3)",
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "#3F2D11",
                  }}
                >
                  {loading ? "Resetting…" : "Reset Password"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
              </LinearGradient>
            </Pressable>

            {/* Request new reset link */}
            <Pressable
              onPress={() => router.replace("/(auth)/forgot-password")}
              className="mt-4 items-center"
              disabled={loading}
            >
              <Text className="font-body text-sm text-primary">
                Request a new reset link
              </Text>
            </Pressable>

            {/* Footer */}
            <View className="mb-16 mt-auto items-center">
              <Pressable
                onPress={() => router.replace("/(auth)/login")}
                className="flex-row items-center gap-1"
                disabled={loading}
              >
                <Ionicons name="arrow-back" size={18} color="#D0C5B8" />
                <Text className="font-body text-sm text-on-surface-variant">
                  Back to Log In
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
