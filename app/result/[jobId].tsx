import { View, Text, ScrollView, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { TopBar } from "@/components/layout/TopBar";

const PLACEHOLDER_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDgJCRkFcNo9XedWxDTL0tu9tqRpXyRH-WSOcsPjMtQvXYpeML9Xd3mgE0PAfiyzMkdA0hlzLNmkupDgt4pbdVGA1qhMkpBTO_Lk1BW9yDB4nE_dAoafUZjehrVwlDwzAo-MwkSN6UVXdRbU3SY0S7nxNxr6h8zQvAMx4BPaFH-woNXlMKlMlso7hKPqprIf6Za6Cfd8kBx9qNfN5cx0QJBJPwYa4oxfqz0Emo9Azh844HM17Au41RBGUvSiECrXCoAEp9xTaDtk5-C";

const METADATA = [
  { label: "Room Type", value: "Living Room" },
  { label: "Style", value: "Modern Minimalist" },
  { label: "Model Engine", value: "Flux Pro v1.2" },
  { label: "Cost", value: "5 Credits" },
];

const MATERIALS = [
  { name: "Brass", color: "#C4A882" },
  { name: "Slate", color: "#6B7280" },
  { name: "Linen", color: "#D6CFC4" },
  { name: "Oak", color: "#A68E6B" },
  { name: "Clay", color: "#9B7E6B" },
];

export default function ResultDetailScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  return (
    <View className="flex-1 bg-surface">
      <TopBar showBack showBranding />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-8 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Result Image */}
        <View className="mt-4 aspect-[4/5] rounded-xl bg-surface-container-low overflow-hidden">
          <Image
            source={{ uri: PLACEHOLDER_IMAGE }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />

          {/* FREE Badge */}
          <View className="absolute top-3 left-3 bg-surface/80 px-3 py-1.5 rounded-lg">
            <Text className="text-[10px] tracking-wider text-primary font-label">
              FREE
            </Text>
          </View>

          {/* Pagination Dots */}
          <View className="absolute bottom-3 left-0 right-0 flex-row items-center justify-center gap-1.5">
            <View className="w-2 h-2 rounded-full bg-primary" />
            <View className="w-1.5 h-1.5 rounded-full bg-on-surface/30" />
            <View className="w-1.5 h-1.5 rounded-full bg-on-surface/30" />
          </View>
        </View>

        {/* Action Row */}
        <View className="flex-row items-center mt-5 gap-3">
          <Pressable className="w-12 h-12 rounded-xl bg-surface-container-high items-center justify-center">
            <Ionicons name="download-outline" size={20} color="#E5E2E1" />
          </Pressable>
          <Pressable className="w-12 h-12 rounded-xl bg-surface-container-high items-center justify-center">
            <Ionicons name="share-outline" size={20} color="#E5E2E1" />
          </Pressable>
          <Pressable className="w-12 h-12 rounded-xl bg-surface-container-high items-center justify-center">
            <Ionicons name="bookmark-outline" size={20} color="#E5E2E1" />
          </Pressable>

          <View className="flex-1" />

          <Pressable className="flex-row items-center bg-surface-container-high px-5 h-12 rounded-xl gap-2">
            <Ionicons name="resize-outline" size={18} color="#E1C39B" />
            <Text className="text-primary text-sm font-body font-medium">
              Upscale
            </Text>
            <View className="bg-primary/15 px-2 py-0.5 rounded-md ml-1">
              <Text className="text-primary text-[10px] font-label">
                3 Credits
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Generation Metadata */}
        <View className="mt-8">
          <Text className="font-headline text-lg text-on-surface">
            Generation Metadata
          </Text>
          <View className="mt-4 bg-surface-container-low rounded-xl p-5">
            <View className="flex-row flex-wrap">
              {METADATA.map((item, index) => (
                <View key={item.label} className="w-1/2 mb-4">
                  <Text className="text-[10px] tracking-wider text-on-surface/50 font-label uppercase">
                    {item.label}
                  </Text>
                  <Text className="text-on-surface text-sm font-body mt-1">
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Material Palette */}
        <View className="mt-8">
          <Text className="font-headline text-lg text-on-surface">
            Material Palette
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
            contentContainerClassName="gap-4"
          >
            {MATERIALS.map(material => (
              <View key={material.name} className="items-center">
                <View
                  className="w-14 h-14 rounded-full"
                  style={{ backgroundColor: material.color }}
                />
                <Text className="text-on-surface/60 text-xs font-body mt-2">
                  {material.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Redesign Again CTA */}
        <Pressable
          onPress={() => router.push("/(tabs)/studio")}
          className="mt-10"
        >
          <LinearGradient
            colors={["#C4A882", "#9e8461"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="h-14 rounded-2xl flex-row items-center justify-center"
          >
            <Ionicons name="refresh" size={18} color="#3F2D11" />
            <Text className="font-headline text-base text-on-primary ml-2">
              Redesign Again
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}
