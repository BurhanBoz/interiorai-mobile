import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function NotFoundScreen() {
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center px-8">
        {/* Icon Card */}
        <View className="mb-8 h-28 w-28 items-center justify-center rounded-xl bg-surface-container-low">
          <Ionicons name="compass-outline" size={48} color="#C4A882" />
        </View>

        {/* Headline */}
        <Text className="mb-3 font-headline text-3xl text-on-surface">
          Page Not Found
        </Text>

        {/* Description */}
        <Text className="mb-10 text-center font-body text-base leading-6 text-on-surface-variant">
          The space you're looking for doesn't exist in our gallery. It may have
          been archived or never curated.
        </Text>

        {/* Return to Studio CTA */}
        <View className="w-full">
          <Pressable
            onPress={() => router.replace("/(tabs)/studio")}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <LinearGradient
              colors={["#C4A882", "rgba(196,168,130,0.8)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-12 items-center justify-center rounded-xl"
            >
              <Text className="font-body text-sm font-semibold tracking-wide text-on-primary">
                Return to Studio
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Go Back */}
          <Pressable
            onPress={() => router.back()}
            className="mt-4 h-12 items-center justify-center rounded-xl bg-surface-container-high"
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Text className="font-body text-sm font-semibold tracking-wide text-on-surface">
              Go Back
            </Text>
          </Pressable>
        </View>

        {/* Decorative Ref */}
        <Text className="mt-12 font-body text-xs text-on-surface opacity-20">
          REF: 404_CURATOR
        </Text>
      </View>
    </SafeAreaView>
  );
}
