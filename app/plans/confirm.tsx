import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useCreditStore } from "@/stores/creditStore";

const FEATURES: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}[] = [
  {
    icon: "compass-outline",
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
    icon: "shield-checkmark-outline",
    title: "Commercial License",
    description: "Full rights to use generated designs in client projects.",
  },
];

export default function PlanConfirmScreen() {
  const balance = useCreditStore(s => s.balance);

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Drag Handle */}
        <View className="items-center pt-4 pb-8">
          <View
            className="rounded-full bg-surface-container-highest"
            style={{ width: 40, height: 4 }}
          />
        </View>

        {/* Header Section */}
        <View style={{ marginBottom: 32 }}>
          {/* Membership Tier Label */}
          <Text
            className="font-label text-secondary"
            style={{
              fontSize: 11,
              fontWeight: "500",
              letterSpacing: 2.2,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Membership Tier
          </Text>

          {/* Title + Price Row */}
          <View className="flex-row justify-between items-end">
            <Text
              className="font-headline text-on-surface"
              style={{ fontSize: 36, lineHeight: 42 }}
            >
              Upgrade to{"\n"}Pro
            </Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                className="font-headline text-secondary"
                style={{ fontSize: 32, lineHeight: 38 }}
              >
                $24.99
              </Text>
              <Text
                className="font-body text-on-surface-variant"
                style={{ fontSize: 14, marginTop: 2 }}
              >
                / month
              </Text>
            </View>
          </View>
        </View>

        {/* Feature Rows */}
        <View style={{ marginBottom: 32 }}>
          {FEATURES.map((feature, idx) => (
            <View
              key={feature.title}
              className="flex-row items-start"
              style={{
                paddingVertical: 32,
                gap: 16,
                borderBottomWidth: idx < FEATURES.length - 1 ? 1 : 0,
                borderBottomColor: "rgba(77,70,60,0.1)",
              }}
            >
              <Ionicons
                name={feature.icon}
                size={24}
                color="#E0C29A"
                style={{ marginTop: 2 }}
              />
              <View className="flex-1" style={{ gap: 4 }}>
                <Text
                  className="font-body text-on-surface"
                  style={{ fontSize: 16, fontWeight: "500" }}
                >
                  {feature.title}
                </Text>
                <Text
                  className="font-body text-on-surface-variant"
                  style={{ fontSize: 13, lineHeight: 20 }}
                >
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Info Card */}
        <View
          className="rounded-xl bg-surface-container-high flex-row items-center"
          style={{ padding: 16, gap: 16, marginBottom: 32 }}
        >
          <Ionicons
            name="information-circle-outline"
            size={24}
            color="#E0C29A"
          />
          <Text
            className="flex-1 font-body text-on-surface-variant"
            style={{ fontSize: 13, lineHeight: 19 }}
          >
            Your current credits ({balance}) will carry over automatically.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-8 pb-2" style={{ paddingTop: 16 }}>
        <Pressable
          onPress={() => {
            /* TODO: handle subscription */
          }}
          style={({ pressed }) => ({
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
              Confirm & Subscribe
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          className="items-center"
          style={{ paddingVertical: 16 }}
        >
          <Text
            className="font-body text-on-surface-variant"
            style={{
              fontSize: 14,
              fontWeight: "500",
              textDecorationLine: "underline",
              textDecorationColor: "rgba(77,70,60,0.3)",
            }}
          >
            Cancel and Return
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
