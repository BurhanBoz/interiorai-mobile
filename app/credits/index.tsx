import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const CREDIT_COSTS = [
  { label: "Conceptual Sketch", cost: 1 },
  { label: "High-Fidelity Render", cost: 5 },
  { label: "3D Structural Analysis", cost: 12 },
];

const USAGE_ITEMS = [
  {
    id: "1",
    thumbnail:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=128&h=128&fit=crop",
    type: "Render",
    date: "Oct 12",
    title: "Lakeside Pavilion",
    cost: 5,
  },
  {
    id: "2",
    thumbnail:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=128&h=128&fit=crop",
    type: "Sketch",
    date: "Oct 10",
    title: "Urban Loft Concept",
    cost: 1,
  },
  {
    id: "3",
    thumbnail:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=128&h=128&fit=crop",
    type: "Analysis",
    date: "Oct 8",
    title: "Hillside Retreat",
    cost: 12,
  },
];

export default function CreditsScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero */}
        <View className="items-center pt-10 pb-8 px-8">
          <Text className="text-on-surface-variant font-label text-sm tracking-widest uppercase mb-2">
            Available Balance
          </Text>
          <Text className="text-primary font-headline text-7xl leading-none mb-2">
            147
          </Text>
          <Text className="text-on-surface-variant font-body text-sm">
            Credits remain in your Studio vault.
          </Text>
        </View>

        {/* Upgrade Banner */}
        <Pressable onPress={() => router.push("/plans")} className="mx-8 mb-6">
          <LinearGradient
            colors={["#C4A882", "#A68A62"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="flex-row items-center justify-between rounded-xl px-5 py-4"
          >
            <Text className="text-on-primary font-body text-base font-semibold">
              Upgrade for more credits
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
          </LinearGradient>
        </Pressable>

        {/* Credit Cost Reference */}
        <View className="mx-8 mb-6 bg-surface-container-low rounded-xl p-5">
          <Text className="text-on-surface font-headline text-lg mb-4">
            Reference Guide
          </Text>
          {CREDIT_COSTS.map((item, index) => (
            <View
              key={item.label}
              className={`flex-row items-center justify-between ${
                index < CREDIT_COSTS.length - 1
                  ? "mb-3 pb-3 border-b border-outline-variant/20"
                  : ""
              }`}
            >
              <Text className="text-on-surface-variant font-body text-sm">
                {item.label}
              </Text>
              <Text className="text-primary font-label text-xs font-semibold tracking-wider">
                {item.cost} {item.cost === 1 ? "CREDIT" : "CREDITS"}
              </Text>
            </View>
          ))}
        </View>

        {/* Monthly Usage */}
        <View className="mx-8 mb-6">
          <Text className="text-on-surface font-headline text-lg mb-4">
            Monthly Usage
          </Text>
          {USAGE_ITEMS.map(item => (
            <View
              key={item.id}
              className="flex-row items-center bg-surface-container-low rounded-xl p-3 mb-3"
            >
              <Image
                source={{ uri: item.thumbnail }}
                className="w-16 h-16 rounded-lg"
              />
              <View className="flex-1 ml-3">
                <Text className="text-on-surface-variant font-label text-xs tracking-wide">
                  {item.type} • {item.date}
                </Text>
                <Text className="text-on-surface font-body text-base mt-0.5">
                  {item.title}
                </Text>
              </View>
              <Text className="text-primary font-label text-sm font-semibold">
                -{item.cost}
              </Text>
            </View>
          ))}
        </View>

        {/* Monthly Reset Info */}
        <View className="mx-8 mb-6 bg-surface-container-low rounded-xl p-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-on-surface-variant font-label text-xs tracking-widest uppercase">
              Next Cycle
            </Text>
            <Text className="text-on-surface font-body text-sm">
              Nov 1, 2026
            </Text>
          </View>
          <View className="h-2 bg-surface-container-highest rounded-full mb-3">
            <View
              className="h-2 bg-primary rounded-full"
              style={{ width: "65%" }}
            />
          </View>
          <Text className="text-on-surface-variant font-label text-xs tracking-wider text-center uppercase">
            18 Days Remaining
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
