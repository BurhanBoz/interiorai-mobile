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
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as authService from "@/services/auth";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
    } catch {
      // Intentionally ignore errors to prevent user enumeration
    } finally {
      setLoading(false);
      Alert.alert(
        "Check Your Email",
        "If an account exists for that email, we've sent a password reset link.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    }
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

            {/* Hero Visual Section */}
            <View className="items-center mt-6 mb-10">
              {/* Background Aura */}
              <View
                className="absolute rounded-full"
                style={{
                  width: 128,
                  height: 128,
                  backgroundColor: "rgba(224,194,154,0.1)",
                }}
              />
              {/* Central Icon Circle */}
              <View
                className="w-32 h-32 rounded-full items-center justify-center bg-surface-container-low"
                style={{ borderWidth: 1, borderColor: "rgba(77,70,60,0.2)" }}
              >
                <View className="w-20 h-20 rounded-full bg-surface-container-high items-center justify-center">
                  <Ionicons name="lock-closed" size={40} color="#E0C29A" />
                </View>
              </View>
            </View>

            {/* Typography */}
            <View className="items-center mb-8">
              <Text
                className="font-headline font-bold text-on-surface uppercase text-center mb-4"
                style={{ fontSize: 36, lineHeight: 40, letterSpacing: -0.5 }}
              >
                Reset Password
              </Text>
              <Text
                className="font-body text-on-surface-variant leading-relaxed text-center"
                style={{ maxWidth: 280 }}
              >
                Enter your email address and we'll send you a link to restore
                access.
              </Text>
            </View>

            {/* Form */}
            <View className="mb-6">
              <Text
                className="font-label text-on-surface-variant uppercase ml-1 mb-2"
                style={{ fontSize: 11, letterSpacing: 2 }}
              >
                Email Address
              </Text>
              <TextInput
                className="font-body text-on-surface bg-surface-container-low px-4 py-4"
                style={{
                  borderBottomWidth: 2,
                  borderBottomColor: "rgba(77,70,60,0.3)",
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                }}
                placeholder="arch@lens.design"
                placeholderTextColor="rgba(229,226,225,0.2)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                selectionColor="#E1C39B"
              />
            </View>

            {/* CTA */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
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
                  {loading ? "Sending…" : "Send Reset Link"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
              </LinearGradient>
            </Pressable>

            {/* Footer */}
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
                  Remember your password?
                </Text>
                <Text
                  className="font-label text-primary font-bold uppercase"
                  style={{ fontSize: 11, letterSpacing: 2 }}
                >
                  Sign In
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
