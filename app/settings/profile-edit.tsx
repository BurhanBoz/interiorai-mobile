import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import * as userService from "@/services/user";

export default function ProfileEditScreen() {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasChanges =
    displayName !== (user?.displayName ?? "") || email !== (user?.email ?? "");

  const handleSave = async () => {
    setError("");

    const updates: { displayName?: string; email?: string } = {};
    if (displayName !== (user?.displayName ?? "")) {
      updates.displayName = displayName.trim();
    }
    if (email !== (user?.email ?? "")) {
      updates.email = email.trim();
    }

    if (Object.keys(updates).length === 0) {
      router.back();
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await userService.updateProfile(updates);
      setUser(updatedUser);
      Alert.alert("Success", "Profile updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      const message = e?.response?.data?.message ?? "Failed to update profile.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="px-8 pt-6 pb-4">
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#E5E2E1" />
          </Pressable>
          <Text className="font-headline text-lg text-on-surface">
            Edit Profile
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-8 pb-32"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="font-headline text-4xl text-on-surface tracking-tight mt-2">
            Your Profile
          </Text>
          <View className="mt-4 w-16 h-1 rounded-full bg-primary" />
          <Text className="font-body text-sm text-on-surface-variant mt-4 mb-8">
            Update your display name or email address.
          </Text>

          {/* Display Name */}
          <View className="mb-6">
            <Text className="mb-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
              DISPLAY NAME
            </Text>
            <TextInput
              className="rounded-xl bg-surface-container-low px-4 py-3.5 font-body text-base text-on-surface"
              placeholder="Your name"
              placeholderTextColor="#4D463C"
              value={displayName}
              onChangeText={setDisplayName}
              editable={!loading}
              maxLength={120}
            />
          </View>

          {/* Email */}
          <View className="mb-6">
            <Text className="mb-2 font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant">
              EMAIL ADDRESS
            </Text>
            <TextInput
              className="rounded-xl bg-surface-container-low px-4 py-3.5 font-body text-base text-on-surface"
              placeholder="you@example.com"
              placeholderTextColor="#4D463C"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          {/* Error */}
          {error ? (
            <Text className="mb-4 font-body text-sm text-red-400">{error}</Text>
          ) : null}

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={loading || !hasChanges}
            style={{ opacity: loading || !hasChanges ? 0.5 : 1 }}
          >
            <LinearGradient
              colors={["#C4A882", "#A68B64"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-14 rounded-xl items-center justify-center"
            >
              <Text className="font-label text-on-primary font-semibold text-base">
                {loading ? "Saving…" : "Save Changes"}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
