import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStudioStore } from "@/stores/studioStore";
import { useCreditStore } from "@/stores/creditStore";
import { useCreditCost } from "@/hooks/useCreditCost";

const qualityLabels: Record<string, string> = {
  STANDARD: "Standard",
  HD: "HD",
  ULTRA_HD: "Ultra HD",
};

export default function ReviewScreen() {
  const { photo, roomType, designStyle, qualityTier, numOutputs, mode } =
    useStudioStore();
  const balance = useCreditStore(s => s.balance);
  const { cost } = useCreditCost();

  const handleGenerate = () => {
    router.push("/generation/progress");
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <Text className="text-[11px] uppercase tracking-[0.2em] text-primary mt-6">
          Step 4 of 4
        </Text>

        {/* Title */}
        <Text className="font-headline text-4xl text-on-surface mt-2 max-w-[280px]">
          Review &amp; Generate
        </Text>

        {/* Summary Card */}
        <View className="bg-surface-container-low rounded-xl p-6 mt-8">
          {/* Photo + room info */}
          <View className="flex-row items-center mb-6">
            {photo?.uri ? (
              <Image
                source={{ uri: photo.uri }}
                className="w-16 h-16 rounded-lg"
                contentFit="cover"
              />
            ) : (
              <View className="w-16 h-16 rounded-lg bg-surface items-center justify-center">
                <Ionicons name="image-outline" size={24} color="#D0C5B8" />
              </View>
            )}
            <View className="ml-4 flex-1">
              <Text className="font-headline text-base text-on-surface">
                {roomType?.name ?? "Room"}
              </Text>
              <Text className="font-label text-xs text-on-surface-variant mt-0.5">
                Base Reference
              </Text>
            </View>
          </View>

          {/* Summary rows */}
          <SummaryRow label="Style" value={designStyle?.name ?? "—"} />
          <SummaryRow
            label="Resolution"
            value={qualityLabels[qualityTier] ?? qualityTier}
          />
          <SummaryRow
            label="Quantity"
            value={`${numOutputs} variant${numOutputs !== 1 ? "s" : ""}`}
          />

          {/* Cost badge */}
          <View className="items-center mt-6">
            <View className="bg-primary/10 px-4 py-2 rounded-full flex-row items-center">
              <Ionicons name="flash" size={14} color="#E1C39B" />
              <Text className="font-headline text-sm text-primary ml-1.5">
                {cost} CREDITS
              </Text>
            </View>
          </View>
        </View>

        {/* Balance section */}
        <View className="flex-row items-center justify-between mt-6 px-1">
          <Text className="font-body text-sm text-on-surface-variant">
            Current Balance
          </Text>
          <View className="flex-row items-baseline">
            <Text className="font-headline text-lg text-on-surface">
              {balance}
            </Text>
            <Text className="font-label text-xs text-on-surface-variant ml-1">
              credits
            </Text>
          </View>
        </View>

        {/* Generate button */}
        <Pressable onPress={handleGenerate} className="mt-8">
          <LinearGradient
            colors={["#E1C39B", "#C9A66B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="h-14 rounded-2xl flex-row items-center justify-center"
          >
            <Ionicons name="sparkles" size={18} color="#3F2D11" />
            <Text className="font-headline text-base text-on-primary ml-2">
              Generate
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Estimate */}
        <Text className="text-center text-xs italic text-on-surface-variant/60 mt-4">
          Estimated generation time: 45 seconds
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-on-surface/5">
      <Text className="font-body text-sm text-on-surface-variant">{label}</Text>
      <Text className="font-headline text-sm text-on-surface">{value}</Text>
    </View>
  );
}
