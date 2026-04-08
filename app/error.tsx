import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ErrorScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#131313]">
      <View className="flex-1 items-center justify-center px-8">
        {/* Warning icon with glow */}
        <View className="mb-8 items-center">
          <View className="absolute h-24 w-24 rounded-full bg-[#C4A882] opacity-10" />
          <View className="h-20 w-20 items-center justify-center rounded-2xl bg-[#1E1E1E]">
            <Ionicons name="warning-outline" size={40} color="#C4A882" />
          </View>
        </View>

        {/* Headline */}
        <Text className="mb-3 text-center font-headline text-2xl text-[#F5F0EB]">
          Something Went Wrong.
        </Text>

        {/* Description */}
        <Text className="mb-10 text-center font-body text-base leading-6 text-[#E5E2E1] opacity-70">
          We encountered an unexpected structural error during the render.
          Credits have been refunded to your studio account.
        </Text>

        {/* Buttons */}
        <View className="w-full gap-3">
          <Pressable onPress={() => router.back()}>
            <LinearGradient
              colors={["#C4A882", "#b3956e"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="h-14 items-center justify-center rounded-xl"
            >
              <Text className="font-body text-base font-semibold text-[#131313]">
                Try Again
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.push("/settings/help")}
            className="h-14 items-center justify-center rounded-xl bg-[#2A2A2A]"
          >
            <Text className="font-body text-sm font-semibold uppercase tracking-wider text-[#E5E2E1]">
              Contact Support
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Error log reference */}
      <View className="items-center pb-6">
        <Text className="font-body text-xs text-[#E5E2E1] opacity-20">
          Error Log Ref: 0x8A4_CURATOR
        </Text>
      </View>
    </SafeAreaView>
  );
}
