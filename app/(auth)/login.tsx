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
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { SafeAreaView } from "react-native-safe-area-context";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBI6VXVTCRdsTXdZma8avuosuaBISKEazhlBA3xlr3Igq-awfpemm5U_rtz1j3KTgHnNqjK1V4i5CypcRC24hnGroMZLACGW0B_pQVq4ZDX7Dk7HvGG-oIB8-zf5ew9lTnhMu_u1MzawDxGh7eD7KthYlGCaKX98ti4T7H3u8Wo0zbrnPmjb5uHiUP9-EmR-ty2EBGvnUcUVm88zXIwAKBJkiTfoODJFBhOQ--BW1cj-WgzaZStso91xCwRoMEYjuXWO0hS7A2pnPJB";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
          contentContainerClassName="px-6 pb-10 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center mb-6">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-surface-container-high items-center justify-center">
                <Ionicons name="cube-outline" size={20} color="#E1C39B" />
              </View>
              <Text className="font-headline text-on-surface text-xs tracking-widest uppercase">
                The Architectural Lens
              </Text>
            </View>
          </View>

          {/* Hero Image */}
          <View
            className="mb-8 rounded-xl overflow-hidden"
            style={{
              aspectRatio: 4 / 3,
              shadowColor: "rgba(245,240,235,1)",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.06,
              shadowRadius: 40,
              elevation: 4,
            }}
          >
            <Image
              source={{ uri: HERO_IMAGE }}
              className="w-full h-full"
              contentFit="cover"
              transition={300}
            />
          </View>

          {/* Headline */}
          <View className="mb-8">
            <Text className="font-headline text-on-surface text-4xl mb-2">
              Welcome Back
            </Text>
            <Text className="font-body text-on-surface-variant text-sm">
              Continue your curation of timeless spaces.
            </Text>
          </View>

          {/* Form */}
          <View className="mb-6 gap-5">
            {/* Email */}
            <View>
              <Text className="font-label text-on-surface-variant text-label-sm uppercase mb-2">
                Architect Email
              </Text>
              <TextInput
                className={`h-14 px-4 rounded-xl font-body text-on-surface text-sm ${
                  emailFocused
                    ? "bg-surface-container-high"
                    : "bg-surface-container-low"
                }`}
                placeholder="you@studio.com"
                placeholderTextColor="#998F84"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-label text-on-surface-variant text-label-sm uppercase">
                  Access Key
                </Text>
                <Pressable onPress={() => router.push("/forgot-password")}>
                  <Text className="font-label text-primary text-xs">
                    Forgot Password?
                  </Text>
                </Pressable>
              </View>
              <View className="relative">
                <TextInput
                  className={`h-14 px-4 pr-12 rounded-xl font-body text-on-surface text-sm ${
                    passwordFocused
                      ? "bg-surface-container-high"
                      : "bg-surface-container-low"
                  }`}
                  placeholder="••••••••"
                  placeholderTextColor="#998F84"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
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

            {/* Login Button */}
            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              style={{ opacity: isLoading ? 0.7 : 1 }}
            >
              <LinearGradient
                colors={["#C4A882", "#A68B64"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="h-14 rounded-xl items-center justify-center"
              >
                <Text className="font-label text-on-primary font-semibold text-base">
                  {isLoading ? "Signing In…" : "Log In"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-outline-variant/15" />
            <Text className="font-label text-outline text-label-sm uppercase mx-4">
              Portfolio Access
            </Text>
            <View className="flex-1 h-px bg-outline-variant/15" />
          </View>

          {/* Social Buttons */}
          <View className="flex-row gap-3 mb-8">
            <Pressable className="flex-1 flex-row items-center justify-center gap-2 h-14 rounded-xl bg-surface-container-low">
              <Ionicons name="logo-google" size={18} color="#E5E2E1" />
              <Text className="font-label text-on-surface text-sm">Google</Text>
            </Pressable>
            <Pressable className="flex-1 flex-row items-center justify-center gap-2 h-14 rounded-xl bg-surface-container-low">
              <Ionicons name="logo-apple" size={18} color="#E5E2E1" />
              <Text className="font-label text-on-surface text-sm">Apple</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-center">
            <Text className="font-body text-on-surface-variant text-sm">
              Don't have an account?{" "}
            </Text>
            <Pressable onPress={() => router.push("/register")}>
              <Text className="font-label text-primary text-sm font-semibold">
                Sign Up
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
