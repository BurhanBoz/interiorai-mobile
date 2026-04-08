import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      // Simulate API call – replace with authService.forgotPassword when available
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert(
        "Check Your Email",
        "If an account exists for that email, we've sent a password reset link.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      {/* Decorative blurred circle */}
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
            {/* Header branding */}
            <Text className="mt-4 text-center font-headline text-xl uppercase tracking-widest text-[#F5F0EB]">
              THE ARCHITECTURAL LENS
            </Text>

            {/* Hero image */}
            <View className="mt-6 overflow-hidden rounded-xl">
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDbDBKo8v6xD6Kr4n9OJnpniLgVlq06j8ZmlduiOHTANCT6UgfHXjw63ZtUnUJh0yBfRirdNE9Ijde9Xsa004nnw5NCHV3qeF4WaDCPYcRrm5p8Me5PCY3LKsiVG5ps1iYkOziiHiCrXkMrAc0p22sMvru7dk5UL1vzZjqGANLeT75h8FwQoOAjzxPryGK-3kSmaVWg22xh_mlH-22TjlLLI02F9ak_vyWx7_1nTiBoaxO9aRKOIRDmhN3sCle2LP4nW2Zz2yknsYSr",
                }}
                className="h-48 w-full rounded-xl"
                contentFit="cover"
                style={{ opacity: 0.6 }}
                // grayscale via tintColor not available; apply opacity for muted effect
              />
            </View>

            {/* Headline */}
            <Text
              className="mt-8 font-headline font-bold tracking-tight text-on-surface"
              style={{ fontSize: 40, lineHeight: 44 }}
            >
              Reset Password
            </Text>

            {/* Subtitle */}
            <Text className="mt-2 font-body text-sm text-on-surface-variant">
              Enter your email and we'll send a reset link.
            </Text>

            {/* Form */}
            <View className="mt-8">
              <Text className="mb-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
                EMAIL ADDRESS
              </Text>
              <TextInput
                className={`rounded-xl px-4 py-3.5 font-body text-base text-on-surface ${
                  focused
                    ? "bg-surface-container-high"
                    : "bg-surface-container-low"
                }`}
                placeholder="you@example.com"
                placeholderTextColor="#4D463C"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                editable={!loading}
              />
            </View>

            {/* Submit button */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              className="mt-6 overflow-hidden rounded-xl"
              style={{
                shadowColor: "#E1C39B",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <LinearGradient
                colors={["#C4A882", "rgba(196,168,130,0.8)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="items-center justify-center rounded-xl px-6 py-4"
              >
                <Text className="font-label text-base font-semibold text-[#3F2D11]">
                  {loading ? "Sending…" : "Send Reset Link"}
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Footer – Back to Log In */}
            <View className="mb-16 mt-auto items-center">
              <Pressable
                onPress={() => router.back()}
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
