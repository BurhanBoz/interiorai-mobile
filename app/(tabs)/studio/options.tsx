import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useStudioStore } from "@/stores/studioStore";
import type { DesignMode, QualityTier } from "@/types/api";

const MODES: {
  key: DesignMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  locked: boolean;
}[] = [
  { key: "REDESIGN", label: "Redesign", icon: "sparkles", locked: false },
  {
    key: "EMPTY_ROOM",
    label: "Empty Room",
    icon: "home-outline",
    locked: true,
  },
  {
    key: "INPAINT",
    label: "Exterior",
    icon: "image-outline",
    locked: true,
  },
  {
    key: "STYLE_TRANSFER",
    label: "Blueprint",
    icon: "map-outline",
    locked: true,
  },
];

const PALETTE_COLORS = ["#C4A882", "#1C1B1B", "#E5E2E1", "#4D463C", "#998F84"];

export default function OptionsScreen() {
  const mode = useStudioStore(s => s.mode);
  const qualityTier = useStudioStore(s => s.qualityTier);
  const numOutputs = useStudioStore(s => s.numOutputs);
  const preserveLayout = useStudioStore(s => s.preserveLayout);
  const prompt = useStudioStore(s => s.prompt);
  const colorPalette = useStudioStore(s => s.colorPalette);
  const setMode = useStudioStore(s => s.setMode);
  const setQualityTier = useStudioStore(s => s.setQualityTier);
  const setNumOutputs = useStudioStore(s => s.setNumOutputs);
  const setPreserveLayout = useStudioStore(s => s.setPreserveLayout);
  const setPrompt = useStudioStore(s => s.setPrompt);
  const setColorPalette = useStudioStore(s => s.setColorPalette);

  const [promptFocused, setPromptFocused] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-8 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step Header ── */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-label text-on-surface-variant text-label-sm uppercase">
              Architectural Workflow
            </Text>
            <Text className="font-label text-on-surface-variant text-xs">
              Step 3 of 4
            </Text>
          </View>
          <Text className="font-headline text-on-surface text-2xl mb-4">
            Design Specifications
          </Text>
          <View className="flex-row gap-2">
            {[1, 2, 3, 4].map(step => (
              <View
                key={step}
                className={`flex-1 h-1 rounded-full ${
                  step <= 3 ? "bg-primary" : "bg-surface-container-high"
                }`}
              />
            ))}
          </View>
        </View>

        {/* ── Section A: Rendering Mode ── */}
        <View className="mb-6">
          <Text className="font-label text-on-surface-variant text-label-sm uppercase mb-3">
            Rendering Mode
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {MODES.map(m => {
              const isActive = mode === m.key && !m.locked;
              return (
                <Pressable
                  key={m.key}
                  className={`flex-1 min-w-[45%] rounded-xl p-4 ${
                    m.locked
                      ? "bg-surface-container-low opacity-60"
                      : isActive
                        ? "bg-surface-container-high"
                        : "bg-surface-container-low"
                  }`}
                  onPress={() => {
                    if (!m.locked) setMode(m.key);
                  }}
                  disabled={m.locked}
                >
                  <View className="relative">
                    {/* Top-right indicator */}
                    {isActive && (
                      <View className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                    )}
                    {m.locked && (
                      <View className="absolute -top-1 -right-1">
                        <Ionicons
                          name="lock-closed"
                          size={12}
                          color="#998F84"
                        />
                      </View>
                    )}
                    <Ionicons
                      name={m.icon}
                      size={24}
                      color={isActive ? "#E1C39B" : "#998F84"}
                    />
                    <Text
                      className={`font-label text-sm mt-2 ${
                        isActive ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {m.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Section B: Resolution & Variants ── */}
        <View className="flex-row gap-3 mb-6">
          {/* Resolution */}
          <View className="flex-1">
            <Text className="font-label text-on-surface-variant text-label-sm uppercase mb-2">
              Resolution
            </Text>
            <View className="flex-row bg-surface-container-lowest rounded-xl overflow-hidden">
              {(["STANDARD", "HD"] as QualityTier[]).map(tier => (
                <Pressable
                  key={tier}
                  className={`flex-1 py-3 items-center rounded-xl ${
                    qualityTier === tier ? "bg-surface-container-high" : ""
                  }`}
                  onPress={() => setQualityTier(tier)}
                >
                  <Text
                    className={`font-label text-sm ${
                      qualityTier === tier
                        ? "text-primary font-bold"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {tier === "STANDARD" ? "Standard" : "HD"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Variants */}
          <View className="flex-1">
            <Text className="font-label text-on-surface-variant text-label-sm uppercase mb-2">
              Variants
            </Text>
            <View className="flex-row bg-surface-container-lowest rounded-xl overflow-hidden">
              {[1, 2].map(n => (
                <Pressable
                  key={n}
                  className={`flex-1 py-3 items-center rounded-xl ${
                    numOutputs === n ? "bg-surface-container-high" : ""
                  }`}
                  onPress={() => setNumOutputs(n)}
                >
                  <Text
                    className={`font-label text-sm ${
                      numOutputs === n
                        ? "text-primary font-bold"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* ── Section C: Strict Layout ── */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="font-label text-on-surface-variant text-label-sm uppercase mb-1">
                Strict Layout
              </Text>
              <Text className="font-body text-on-surface-variant text-xs">
                Preserve original room geometry and spatial relationships.
              </Text>
            </View>
            <Switch
              value={preserveLayout}
              onValueChange={setPreserveLayout}
              trackColor={{
                false: "#2A2A2A",
                true: "#E1C39B",
              }}
              thumbColor="#E5E2E1"
            />
          </View>
        </View>

        {/* ── Section D: Material Narrative ── */}
        <View className="mb-6">
          <Text className="font-label text-on-surface-variant text-label-sm uppercase mb-2">
            Material Narrative
          </Text>
          <TextInput
            className={`rounded-xl p-4 font-body text-on-surface text-sm min-h-[100px] ${
              promptFocused
                ? "bg-surface-container-high"
                : "bg-surface-container-low"
            }`}
            placeholder="Describe textures, lighting angles, and interior rhythm..."
            placeholderTextColor="#998F84"
            value={prompt}
            onChangeText={setPrompt}
            onFocus={() => setPromptFocused(true)}
            onBlur={() => setPromptFocused(false)}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* ── Section E: Material Palette ── */}
        <View className="mb-8">
          <Text className="font-label text-on-surface-variant text-label-sm uppercase mb-3">
            Material Palette
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3"
          >
            {PALETTE_COLORS.map(color => {
              const isSelected = colorPalette === color;
              return (
                <Pressable
                  key={color}
                  onPress={() => setColorPalette(color)}
                  className={`w-11 h-11 rounded-full ${
                    isSelected ? "border-2 border-primary" : ""
                  }`}
                  style={isSelected ? { padding: 2 } : undefined}
                >
                  <View
                    className="w-full h-full rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── CTA ── */}
        <Pressable onPress={() => router.push("/studio/review")}>
          <LinearGradient
            colors={["#C4A882", "#A68B64"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="h-14 rounded-xl items-center justify-center"
          >
            <Text className="font-label text-on-primary font-semibold text-base">
              Next Step
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
