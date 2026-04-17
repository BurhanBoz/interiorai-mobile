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
import { useAuthStore } from "@/stores/authStore";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = useAuthStore(s => s.login);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      Alert.alert(
        "Login Failed",
        error?.message || "Please check your credentials and try again.",
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
              ARCHITECTURAL LENS
            </Text>
          </View>

          {/* Headline */}
          <Text
            className="font-headline font-bold text-on-surface mb-2"
            style={{ fontSize: 36, lineHeight: 42 }}
          >
            Welcome Back
          </Text>
          <Text
            className="font-body text-sm text-on-surface-variant mb-10"
            style={{ fontWeight: "300" }}
          >
            Access your curated interior design portfolio.
          </Text>

          {/* Email Input */}
          <View className="mb-5">
            <Text
              className="font-label text-on-surface-variant uppercase ml-1 mb-2"
              style={{ fontSize: 11, letterSpacing: 2 }}
            >
              Email Address
            </Text>
            <View className="flex-row items-center bg-surface-container-high rounded-xl">
              <View className="pl-4">
                <Ionicons name="mail-outline" size={20} color="#D0C5B8" />
              </View>
              <TextInput
                className="flex-1 py-4 pl-3 pr-4 font-body text-on-surface text-sm"
                placeholder="julianne.m@studio.com"
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
              Password
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
                placeholder="••••••••••••"
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
                Forgot Password?
              </Text>
            </Pressable>
          </View>

          {/* Sign In CTA */}
          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            style={({ pressed }) => ({
              opacity: isLoading ? 0.7 : 1,
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
                {isLoading ? "Signing In…" : "Sign In"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
            </LinearGradient>
          </Pressable>

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
              or continue with
            </Text>
            <View
              className="flex-1 h-px"
              style={{ backgroundColor: "rgba(77,70,60,0.2)" }}
            />
          </View>

          {/* Social Login — temporarily disabled */}
          <View className="flex-row" style={{ gap: 12, opacity: 0.35 }}>
            <Pressable
              disabled
              className="flex-1 flex-row items-center justify-center rounded-xl bg-surface-container-high"
              style={{ height: 52, gap: 10 }}
            >
              <Ionicons name="logo-google" size={18} color="#E5E2E1" />
              <Text className="font-label font-medium text-on-surface text-xs">
                Google
              </Text>
            </Pressable>
            <Pressable
              disabled
              className="flex-1 flex-row items-center justify-center rounded-xl bg-surface-container-high"
              style={{ height: 52, gap: 10 }}
            >
              <Ionicons name="logo-apple" size={20} color="#E5E2E1" />
              <Text className="font-label font-medium text-on-surface text-xs">
                Apple
              </Text>
            </Pressable>
          </View>
          <Text
            className="font-label text-on-surface-variant text-center mt-2"
            style={{ fontSize: 10, letterSpacing: 1, opacity: 0.4 }}
          >
            Coming Soon
          </Text>

          {/* Footer */}
          <View className="flex-row items-center justify-center mt-auto pt-8">
            <Text className="font-body text-on-surface-variant text-sm">
              Don't have an account?{" "}
            </Text>
            <Pressable onPress={() => router.push("/register")}>
              <Text className="font-body text-secondary font-semibold text-sm ml-1">
                Register
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
