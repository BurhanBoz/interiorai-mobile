import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function CreditsExhaustedScreen() {
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center px-8">
        {/* Credit Ring */}
        <View className="mb-8 items-center justify-center">
          <View className="h-36 w-36 items-center justify-center rounded-full border-2 border-outline-variant">
            <Ionicons
              name="hourglass-outline"
              size={20}
              color="#998F84"
              style={{ marginBottom: 4 }}
            />
            <Text className="font-headline text-4xl text-on-surface">0</Text>
            <Text className="font-body text-xs text-on-surface-variant">
              credits
            </Text>
          </View>
        </View>

        {/* Headline */}
        <Text className="mb-3 font-headline text-3xl text-on-surface">
          Out of Credits
        </Text>

        {/* Description */}
        <Text className="mb-10 text-center font-body text-base leading-6 text-on-surface-variant">
          Your creative journey requires additional fuel.{"\n"}Credits reset in
          18 days.
        </Text>

        {/* Pro Recommendation Card */}
        <View className="w-full rounded-xl bg-surface-container-low p-5">
          <Text className="mb-1 font-label text-xs uppercase tracking-wider text-primary">
            Pro Recommendation
          </Text>
          <Text className="mb-4 font-body text-sm leading-5 text-on-surface-variant">
            Upgrade your plan for more compute power and unlimited drafts.
          </Text>
          <Pressable onPress={() => router.push("/plans")}>
            <LinearGradient
              colors={["#C4A882", "rgba(196,168,130,0.8)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="items-center rounded-xl py-3.5"
            >
              <Text className="font-label text-sm font-semibold text-on-primary">
                View Plans
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
