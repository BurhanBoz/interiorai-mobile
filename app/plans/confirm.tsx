import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FEATURES: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}[] = [
  {
    icon: "map-outline",
    title: "Unlimited Blueprints",
    description:
      "Generate as many designs as your vision demands, with no monthly cap.",
  },
  {
    icon: "grid-outline",
    title: "Exclusive Collections",
    description: "Access curated style libraries reserved for Pro members.",
  },
  {
    icon: "checkmark-circle-outline",
    title: "Commercial License",
    description: "Full rights to use generated designs in client projects.",
  },
];

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export default function PlanConfirmScreen() {
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mt-2 mb-6 flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#E5E2E1" />
          </Pressable>
          <Text className="flex-1 font-headline text-xl text-on-surface">
            Confirm Subscription
          </Text>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={22} color="#E5E2E1" />
          </Pressable>
        </View>

        {/* Plan Summary Card */}
        <View className="rounded-xl bg-surface-container-low p-5 mb-6">
          <Text className="mb-1 font-label text-xs uppercase tracking-wider text-primary">
            Membership Tier
          </Text>
          <Text
            className="font-headline text-on-surface mb-1"
            style={{ fontSize: 32, lineHeight: 38 }}
          >
            Pro
          </Text>
          <Text className="font-body text-base text-on-surface-variant">
            $24.99 / month
          </Text>
        </View>

        {/* Features */}
        <Text className="font-headline text-lg text-on-surface mb-4">
          What's Included
        </Text>

        <View className="gap-4 mb-6">
          {FEATURES.map(feature => (
            <View
              key={feature.title}
              className="flex-row items-start rounded-xl bg-surface-container-low p-4"
            >
              <View className="mr-4 mt-0.5 h-10 w-10 items-center justify-center rounded-xl bg-surface-container-high">
                <Ionicons name={feature.icon} size={20} color="#C4A882" />
              </View>
              <View className="flex-1">
                <Text className="font-body text-sm font-semibold text-on-surface mb-1">
                  {feature.title}
                </Text>
                <Text className="font-body text-xs leading-5 text-on-surface-variant">
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Carry-over Info */}
        <View className="rounded-xl bg-surface-container-high p-4 mb-8">
          <View className="flex-row items-center">
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#998F84"
              style={{ marginRight: 10 }}
            />
            <Text className="flex-1 font-body text-sm leading-5 text-on-surface-variant">
              Your current credits (3) will carry over automatically.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-6 pb-2">
        <Pressable
          onPress={() => {
            /* TODO: handle subscription */
          }}
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
              Confirm & Subscribe
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          className="mt-3 items-center py-3"
        >
          <Text className="font-body text-sm text-on-surface-variant">
            Cancel and return
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
