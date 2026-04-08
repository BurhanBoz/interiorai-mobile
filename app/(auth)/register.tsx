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

const BG_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC7juCTbnitQE63aypbPEkbplT7k1TkQ2Aq3IY0SHQ31jNKLNM7Xe8hxPoynC2o1rJxIwcQzdYk5bv8RY6IPYh07t3zuBzqnPl41PSvIH0Dxf8udcRiCUSsMWh27_X5b5g4rBEu7v0tsyS8qa0Zk5Mh4jzGK4-twgCo7uVJfLhCjOuRnHOeBiCSCXNg4T1ONKDKblrjWp2MPra4W9aZtpboenhpsUBY-vQxZ0f2oe3Nm7z6HH5BKmaD_oP4GTED-9PxwIpk4HmCiJtI";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
    } catch (e: any) {
      Alert.alert("Registration Failed", e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      {/* Background image */}
      <Image
        source={{ uri: BG_IMAGE }}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        contentFit="cover"
      />

      {/* Gradient overlay */}
      <LinearGradient
        colors={[
          "rgba(19,19,19,0.80)",
          "rgba(19,19,19,0.95)",
          "rgba(19,19,19,1)",
        ]}
        locations={[0, 0.5, 1]}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            className="px-8"
          >
            {/* Branding */}
            <Text
              className="font-headline text-center text-[#F5F0EB] text-sm uppercase mb-10"
              style={{ letterSpacing: 4.8 }}
            >
              THE ARCHITECTURAL LENS
            </Text>

            {/* Heading */}
            <Text className="font-headline text-on-surface text-[2.5rem] leading-tight mb-2">
              Create Account
            </Text>
            <Text className="font-body text-on-surface-variant text-base mb-8">
              Join our curated design ecosystem.
            </Text>

            {/* Email */}
            <View className="mb-6">
              <Text
                className="font-label text-[10px] uppercase text-on-surface-variant/70 mb-2"
                style={{ letterSpacing: 2.4 }}
              >
                EMAIL ADDRESS
              </Text>
              <TextInput
                className="font-body text-on-surface text-base pb-3 border-b border-outline-variant/30"
                placeholderTextColor="rgba(208,197,184,0.4)"
                placeholder="your@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                style={{ backgroundColor: "transparent" }}
                selectionColor="#E1C39B"
              />
            </View>

            {/* Password */}
            <View className="mb-8">
              <Text
                className="font-label text-[10px] uppercase text-on-surface-variant/70 mb-2"
                style={{ letterSpacing: 2.4 }}
              >
                PASSWORD
              </Text>
              <TextInput
                className="font-body text-on-surface text-base pb-3 border-b border-outline-variant/30"
                placeholderTextColor="rgba(208,197,184,0.4)"
                placeholder="••••••••"
                secureTextEntry
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
                style={{ backgroundColor: "transparent" }}
                selectionColor="#E1C39B"
              />
            </View>

            {/* Sign Up Button */}
            <Pressable onPress={handleSignUp} disabled={loading}>
              <LinearGradient
                colors={["#C4A882", "#A68E6B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="h-14 rounded-xl items-center justify-center"
              >
                <Text className="font-label text-on-primary text-sm font-semibold uppercase tracking-widest">
                  {loading ? "Creating Account…" : "Sign Up"}
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Log In link */}
            <View className="flex-row justify-center mt-6">
              <Text className="font-body text-on-surface-variant text-sm">
                Already have an account?{" "}
              </Text>
              <Pressable onPress={() => router.push("/login")}>
                <Text className="font-body text-primary text-sm font-medium">
                  Log In
                </Text>
              </Pressable>
            </View>

            {/* Social divider */}
            <View className="flex-row items-center my-8">
              <View className="flex-1 h-px bg-outline-variant/20" />
              <Text className="font-label text-on-surface-variant/50 text-xs mx-4 uppercase tracking-widest">
                Continue with
              </Text>
              <View className="flex-1 h-px bg-outline-variant/20" />
            </View>

            {/* Social buttons */}
            <View className="flex-row gap-4 mb-8">
              <Pressable className="flex-1 flex-row items-center justify-center bg-surface-container-high h-14 rounded-xl gap-2">
                <Ionicons name="logo-apple" size={20} color="#E5E2E1" />
                <Text
                  className="font-label text-on-surface text-xs uppercase"
                  style={{ letterSpacing: 2 }}
                >
                  APPLE
                </Text>
              </Pressable>

              <Pressable className="flex-1 flex-row items-center justify-center bg-surface-container-high h-14 rounded-xl gap-2">
                <Ionicons name="logo-google" size={18} color="#E5E2E1" />
                <Text
                  className="font-label text-on-surface text-xs uppercase"
                  style={{ letterSpacing: 2 }}
                >
                  GOOGLE
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
