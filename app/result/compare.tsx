import { View, Text, ScrollView, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.75;

const BEFORE_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBkXC7i-ynMZkGK7F6P4EqrL7oXbkZAXbUbj4pSpHqk2icWBJyAlrVtHx0";
const AFTER_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDgJCRkFcNo9XedWxDTL0tu9tqRpXyRH-WSOcsPjMtQvXYpeML9Xd3mgE0PAfiyzMkdA0hlzLNmkupDgt4pbdVGA1qhMkpBTO_Lk1BW9yDB4nE_dAoafUZjehrVwlDwzAo-MwkSN6UVXdRbU3SY0S7nxNxr6h8zQvAMx4BPaFH-woNXlMKlMlso7hKPqprIf6Za6Cfd8kBx9qNfN5cx0QJBJPwYa4oxfqz0Emo9Azh844HM17Au41RBGUvSiECrXCoAEp9xTaDtk5-C";

export default function CompareScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-8 py-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-surface-container-high"
        >
          <Ionicons name="arrow-back" size={20} color="#E5E2E1" />
        </Pressable>
        <Text className="font-headline text-lg text-on-surface">
          Transformation
        </Text>
        <Pressable className="w-10 h-10 items-center justify-center rounded-full bg-surface-container-high">
          <Ionicons name="share-outline" size={20} color="#E5E2E1" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Before / After Comparison */}
        <View className="mx-8 rounded-xl overflow-hidden bg-surface-container-low">
          <View className="flex-row" style={{ height: IMAGE_HEIGHT }}>
            {/* Before */}
            <View className="flex-1 overflow-hidden">
              <Image
                source={{ uri: BEFORE_IMAGE }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
              {/* Original label */}
              <View className="absolute bottom-3 left-3 bg-surface/80 px-3 py-1.5 rounded-lg">
                <Text className="text-[10px] tracking-wider text-on-surface font-label uppercase">
                  Original
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View className="w-[3px] bg-primary items-center justify-center z-10">
              <View className="w-7 h-7 rounded-full bg-primary items-center justify-center">
                <Ionicons name="swap-horizontal" size={14} color="#3F2D11" />
              </View>
            </View>

            {/* After */}
            <View className="flex-1 overflow-hidden">
              <Image
                source={{ uri: AFTER_IMAGE }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
              {/* AI Enhanced label */}
              <LinearGradient
                colors={["#C4A882", "#A68C66"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg"
              >
                <Text className="text-[10px] tracking-wider text-on-primary font-label uppercase">
                  AI Enhanced
                </Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Metadata Section */}
        <View className="px-8 mt-6">
          {/* Project label + Value badge row */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1 mr-4">
              <Text className="text-primary text-xs font-label tracking-[2px] uppercase mb-2">
                Project 082
              </Text>
              <Text className="font-headline text-2xl text-on-surface leading-tight">
                Minimalist brutalist renovation
              </Text>
            </View>
            <View className="bg-surface-container-high px-3 py-2 rounded-xl items-center mt-1">
              <Text className="text-primary text-sm font-headline">+24%</Text>
              <Text className="text-on-surface-variant text-[10px] tracking-wider font-label uppercase mt-0.5">
                Est. Value
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text className="text-on-surface-variant text-sm leading-6 font-body mt-2">
            A striking transformation that embraces raw concrete surfaces and
            clean geometric forms, creating a powerful interplay between mass
            and void. Natural light channels through strategically placed
            openings, softening the material palette.
          </Text>
        </View>

        {/* Action Grid */}
        <View className="flex-row gap-3 px-8 mt-8">
          <Pressable className="flex-1 h-14 rounded-xl bg-surface-container-high flex-row items-center justify-center gap-2">
            <Ionicons name="layers-outline" size={18} color="#E5E2E1" />
            <Text className="text-on-surface font-body text-sm">
              Save Variations
            </Text>
          </Pressable>

          <LinearGradient
            colors={["#C4A882", "#A68C66"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="flex-1 rounded-xl overflow-hidden"
          >
            <Pressable className="flex-1 flex-row items-center justify-center gap-2">
              <Ionicons name="refresh" size={18} color="#3F2D11" />
              <Text className="text-on-primary font-body text-sm font-semibold">
                Regenerate
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
