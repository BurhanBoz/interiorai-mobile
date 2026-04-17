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

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
              ARCHITECTURAL LENS
            </Text>

            {/* Heading */}
            <Text
              className="font-headline font-bold text-on-surface mb-10"
              style={{ fontSize: 36, lineHeight: 42 }}
            >
              Create Account
            </Text>

            {/* Full Name */}
            <View className="mb-7">
              <Text
                className="font-label text-on-surface-variant uppercase mb-2"
                style={{ fontSize: 11, letterSpacing: 2 }}
              >
                Full Name
              </Text>
              <TextInput
                className="font-body text-on-surface text-base pb-3 bg-transparent"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(77,70,60,0.2)",
                }}
                placeholderTextColor="rgba(208,197,184,0.4)"
                placeholder="Julianne Moore"
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
                Email Address
              </Text>
              <TextInput
                className="font-body text-on-surface text-base pb-3 bg-transparent"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(77,70,60,0.2)",
                }}
                placeholderTextColor="rgba(208,197,184,0.4)"
                placeholder="julianne.m@studio.com"
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
                Password
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
                  placeholder="••••••••••••"
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
            <Pressable
              onPress={handleSignUp}
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
                  {loading ? "Creating…" : "Create Account"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
              </LinearGradient>
            </Pressable>

            {/* Divider */}
            <View className="flex-row items-center my-6" style={{ gap: 12 }}>
              <View className="flex-1 h-px bg-surface-container-high" />
              <Text
                className="font-label text-on-surface-variant uppercase"
                style={{ fontSize: 11, letterSpacing: 3, opacity: 0.5 }}
              >
                or continue with
              </Text>
              <View className="flex-1 h-px bg-surface-container-high" />
            </View>

            {/* Social Buttons — temporarily disabled */}
            <View className="flex-row" style={{ gap: 12, opacity: 0.35 }}>
              <Pressable
                disabled
                className="flex-1 flex-row items-center justify-center rounded-xl bg-surface-container-high"
                style={{ height: 52, gap: 10 }}
              >
                <Ionicons name="logo-google" size={18} color="#E5E2E1" />
                <Text
                  className="font-label font-bold text-on-surface uppercase"
                  style={{ fontSize: 11, letterSpacing: 3 }}
                >
                  Google
                </Text>
              </Pressable>
              <Pressable
                disabled
                className="flex-1 flex-row items-center justify-center rounded-xl bg-surface-container-high"
                style={{ height: 52, gap: 10 }}
              >
                <Ionicons name="logo-apple" size={20} color="#E5E2E1" />
                <Text
                  className="font-label font-bold text-on-surface uppercase"
                  style={{ fontSize: 11, letterSpacing: 3 }}
                >
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
            <View className="flex-row items-center justify-center mt-auto pt-10">
              <Text className="font-body text-on-surface-variant text-sm">
                Already have an account?{" "}
              </Text>
              <Pressable onPress={() => router.push("/login")}>
                <Text className="font-body text-secondary font-semibold text-sm ml-1">
                  Sign In
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
