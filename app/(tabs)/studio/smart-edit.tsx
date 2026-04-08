import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useStudioStore } from "@/stores/studioStore";
import Slider from "@react-native-community/slider";
import { Toggle } from "@/components/ui/Toggle";

const PLACEHOLDER_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCXKvJqHPt_BywjZEgBh_8C42cBUFODsdaxTs6xuzy8iIxyapKRHCxLP0f-d6FrUuJvAh6QHYzJKw0mv8fhl_AQJjqFTnr37ctyMXjbMmIU1G9yQRJVpL2e5c_sOkuszNGOtC-fwc7avoXGUL6nr1lw7sKCCYjbR1hzJYstnMVFaUFVBVdxQgBfJ1zTWJ-CCfae70BvkfSgoGEzeFMOrKPx3emCkeN1KLSuMShgVjbuoaI7Sj5vJf6R3vujqJ7qItNN6WuK3Zb_chFJ";

export default function SmartEditScreen() {
  const photo = useStudioStore(s => s.photo);
  const prompt = useStudioStore(s => s.prompt);
  const qualityTier = useStudioStore(s => s.qualityTier);
  const numOutputs = useStudioStore(s => s.numOutputs);
  const setPrompt = useStudioStore(s => s.setPrompt);
  const setQualityTier = useStudioStore(s => s.setQualityTier);
  const setNumOutputs = useStudioStore(s => s.setNumOutputs);

  const [brushSize, setBrushSize] = useState(40);
  const [brushActive, setBrushActive] = useState(true);
  const [promptFocused, setPromptFocused] = useState(false);
  const isUltraHD = qualityTier === "HD";

  const imageSource = photo?.uri ?? PLACEHOLDER_IMAGE;

  const handleGenerate = () => {
    router.push("/generation/progress");
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-8 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step Header ── */}
        <View className="mb-4">
          <Text className="font-label text-primary text-label-sm uppercase mb-2">
            Step 03 — Refinement
          </Text>
          <Text className="font-headline text-on-surface text-2xl font-medium">
            Smart Edit
          </Text>
        </View>

        {/* ── Image Canvas ── */}
        <View className="aspect-[4/5] rounded-xl bg-surface-container-low overflow-hidden mb-6 relative">
          <Image
            source={{ uri: imageSource }}
            className="w-full h-full"
            contentFit="cover"
            transition={300}
          />

          {/* Tool overlay — top right */}
          <View className="absolute top-3 right-3 gap-2">
            <Pressable
              onPress={() => setBrushActive(!brushActive)}
              className={`w-10 h-10 rounded-xl items-center justify-center ${
                brushActive
                  ? "bg-primary/90 backdrop-blur-sm"
                  : "bg-surface/80 backdrop-blur-sm"
              }`}
            >
              <Ionicons
                name="brush"
                size={20}
                color={brushActive ? "#131313" : "#E5E2E1"}
              />
            </Pressable>
            <Pressable className="w-10 h-10 rounded-xl items-center justify-center bg-surface/80 backdrop-blur-sm">
              <Ionicons name="arrow-undo" size={20} color="#E5E2E1" />
            </Pressable>
          </View>

          {/* Circle mask indicator */}
          <View
            className="absolute border-2 border-primary/80 rounded-full"
            style={{
              width: brushSize,
              height: brushSize,
              left: "60%",
              top: "70%",
              marginLeft: -(brushSize / 2),
              marginTop: -(brushSize / 2),
            }}
          />

          {/* Brush size slider — bottom of canvas */}
          <View className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6 bg-gradient-to-t from-black/40">
            <View className="flex-row items-center gap-3">
              <Ionicons name="ellipse" size={10} color="#E1C39B" />
              <Slider
                style={{ flex: 1, height: 28 }}
                minimumValue={10}
                maximumValue={100}
                value={brushSize}
                onValueChange={setBrushSize}
                minimumTrackTintColor="#E1C39B"
                maximumTrackTintColor="#4D463C"
                thumbTintColor="#E1C39B"
              />
              <Ionicons name="ellipse" size={20} color="#E1C39B" />
            </View>
          </View>
        </View>

        {/* ── Describe the Change ── */}
        <View className="mb-6">
          <Text className="font-label text-on-surface-variant text-label-sm uppercase mb-2">
            Describe the Change
          </Text>
          <TextInput
            className={`rounded-xl p-4 font-body text-on-surface text-sm min-h-[100px] ${
              promptFocused
                ? "bg-surface-container-high"
                : "bg-surface-container-low"
            }`}
            placeholder="e.g., Replace this sofa with a minimal marble coffee table..."
            placeholderTextColor="#998F84"
            value={prompt}
            onChangeText={setPrompt}
            onFocus={() => setPromptFocused(true)}
            onBlur={() => setPromptFocused(false)}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* ── Quality & Variants Grid ── */}
        <View className="flex-row gap-3 mb-8">
          {/* Quality Tier */}
          <View className="flex-1 bg-surface-container-low rounded-xl p-4">
            <Text className="font-label text-on-surface-variant text-label-sm uppercase mb-1">
              Quality Tier
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="font-body text-on-surface text-sm">
                Ultra HD
              </Text>
              <Toggle
                value={isUltraHD}
                onValueChange={v => setQualityTier(v ? "HD" : "STANDARD")}
              />
            </View>
          </View>

          {/* Variants */}
          <Pressable
            className="flex-1 bg-surface-container-low rounded-xl p-4"
            onPress={() => setNumOutputs(numOutputs >= 4 ? 1 : numOutputs + 1)}
          >
            <Text className="font-label text-on-surface-variant text-label-sm uppercase mb-1">
              Variants
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="font-body text-on-surface text-sm">
                {numOutputs} {numOutputs === 1 ? "Image" : "Images"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#998F84" />
            </View>
          </Pressable>
        </View>

        {/* ── CTA ── */}
        <Pressable onPress={handleGenerate}>
          <LinearGradient
            colors={["#C4A882", "#A68B64"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="h-14 rounded-xl flex-row items-center justify-center gap-3"
          >
            <Text className="font-label text-on-primary font-semibold text-base">
              Generate Refinement
            </Text>
            <View className="flex-row items-center bg-on-primary/20 rounded-lg px-2 py-1 gap-1">
              <Ionicons name="flash" size={14} color="#131313" />
              <Text className="font-label text-on-primary text-xs font-semibold">
                12
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
