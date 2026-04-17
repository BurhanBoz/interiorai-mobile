import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useStudioStore } from "@/stores/studioStore";
import { useDrawer } from "@/components/layout/DrawerProvider";
import Slider from "@react-native-community/slider";
import { Toggle } from "@/components/ui/Toggle";

const PLACEHOLDER_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDXpc1GSq5QSnf4_Cb0mZMRLMKnwiUksHTS5s2EABiYKbN12D3g12-0QhRAOOyop_yQw4PnT3nwmQ8mqqYcPlJmxspsj3A-6x9as4yfRZANUBIyq9Fni_S49gdGWcHEqeEL9E-ugJfU3Ez_FGeLQscBaIqaSO7Ee9FnR16ItBeTgiiVctqOX_civmqF1iFv_ttCnUNByH0i_LJ4uIThNY8lkLgTjZNPFNEEhuFs0-5SMCqyyK-cVayGVdwZCmUIDbyZOTJBgVbu_70";

export default function SmartEditScreen() {
  const { openDrawer } = useDrawer();
  const photo = useStudioStore(s => s.photo);
  const prompt = useStudioStore(s => s.prompt);
  const qualityTier = useStudioStore(s => s.qualityTier);
  const numOutputs = useStudioStore(s => s.numOutputs);
  const setPrompt = useStudioStore(s => s.setPrompt);
  const setQualityTier = useStudioStore(s => s.setQualityTier);
  const setNumOutputs = useStudioStore(s => s.setNumOutputs);

  const [brushSize, setBrushSize] = useState(45);
  const [brushActive, setBrushActive] = useState(true);
  const [promptFocused, setPromptFocused] = useState(false);
  const isUltraHD = qualityTier === "HD";

  const imageSource = photo?.uri ?? PLACEHOLDER_IMAGE;

  const handleGenerate = () => {
    router.push("/generation/progress");
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#D1C5B8" />
          </Pressable>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 28, fontWeight: "700" }}
          >
            Smart Edit
          </Text>
        </View>
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: 40,
            height: 40,
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.3)",
            backgroundColor: "#201F1F",
          }}
        >
          <Ionicons name="color-wand" size={20} color="#FEDFB5" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Canvas */}
        <View
          className="rounded-xl overflow-hidden bg-surface-container-low"
          style={{
            aspectRatio: 4 / 5,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          <Image
            source={{ uri: imageSource }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={300}
          />

          {/* Inpainting mask overlay (simulated) */}
          <View
            className="absolute inset-0"
            style={{
              backgroundColor: "rgba(0,0,0,0.4)",
              borderWidth: 2,
              borderColor: "rgba(254,223,181,0.2)",
              borderRadius: 12,
            }}
            pointerEvents="none"
          />

          {/* Floating overlay tools — top right */}
          <View className="absolute top-4 right-4" style={{ gap: 12 }}>
            <Pressable
              onPress={() => setBrushActive(!brushActive)}
              className="items-center justify-center rounded-full"
              style={{
                width: 48,
                height: 48,
                backgroundColor: brushActive ? "#FEDFB5" : "rgba(53,53,52,0.8)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Ionicons
                name="brush"
                size={22}
                color={brushActive ? "#281801" : "#E5E2E1"}
              />
            </Pressable>
            <Pressable
              className="items-center justify-center rounded-full"
              style={{
                width: 48,
                height: 48,
                backgroundColor: "rgba(53,53,52,0.8)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Ionicons name="arrow-undo" size={22} color="#E5E2E1" />
            </Pressable>
          </View>

          {/* Bottom brush size control */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            className="absolute bottom-0 left-0 right-0 px-6 pb-24 pt-10"
          >
            <View style={{ gap: 12 }}>
              <View className="flex-row items-center justify-between">
                <Text
                  className="font-label text-on-surface-variant"
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}
                >
                  Brush Size
                </Text>
                <Text
                  className="font-label"
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "#FEDFB5",
                  }}
                >
                  {Math.round(brushSize)}px
                </Text>
              </View>
              {/* Visual track bar */}
              <View
                className="w-full rounded-full overflow-hidden"
                style={{ height: 6, backgroundColor: "#353534" }}
              >
                <View
                  style={{
                    width: `${((brushSize - 10) / 90) * 100}%`,
                    height: "100%",
                    backgroundColor: "#FEDFB5",
                    borderRadius: 9999,
                    shadowColor: "rgba(254,223,181,0.6)",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 8,
                  }}
                />
              </View>
              {/* Invisible interactive slider overlay */}
              <Slider
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 16,
                  right: 16,
                  height: 30,
                  opacity: 0,
                }}
                minimumValue={10}
                maximumValue={100}
                value={brushSize}
                onValueChange={setBrushSize}
                minimumTrackTintColor="transparent"
                maximumTrackTintColor="transparent"
                thumbTintColor="transparent"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Describe the Change */}
        <View className="mt-8" style={{ gap: 16 }}>
          <View className="flex-row items-end justify-between">
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Describe the change
            </Text>
            <Text
              className="font-label"
              style={{ fontSize: 11, color: "#4D463C" }}
            >
              {(prompt || "").length} / 200
            </Text>
          </View>
          <TextInput
            className="font-body text-on-surface"
            style={{
              backgroundColor: "#1C1B1B",
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              lineHeight: 22,
              minHeight: 128,
              textAlignVertical: "top",
            }}
            placeholder="e.g. Add a mid-century modern lounge chair in cognac leather..."
            placeholderTextColor="rgba(153,143,131,0.5)"
            value={prompt}
            onChangeText={t => setPrompt(t.slice(0, 200))}
            onFocus={() => setPromptFocused(true)}
            onBlur={() => setPromptFocused(false)}
            multiline
            maxLength={200}
          />
        </View>

        {/* Bento Layout — Quality & Variants */}
        <View className="mt-8" style={{ gap: 16 }}>
          {/* Quality Tier Card */}
          <View
            className="rounded-xl p-5 justify-between"
            style={{ backgroundColor: "#1C1B1B", height: 128 }}
          >
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Quality Tier
            </Text>
            <View className="flex-row items-center justify-between">
              <Text
                className="font-body text-on-surface"
                style={{ fontSize: 14, fontWeight: "500" }}
              >
                Ultra HD Rendering
              </Text>
              <Toggle
                value={isUltraHD}
                onValueChange={v => setQualityTier(v ? "HD" : "STANDARD")}
              />
            </View>
          </View>

          {/* Variants Card */}
          <View
            className="rounded-xl p-5"
            style={{ backgroundColor: "#1C1B1B", gap: 16 }}
          >
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Variants
            </Text>
            <View className="flex-row" style={{ gap: 12 }}>
              {/* Active variant thumbnail */}
              <View
                className="rounded-lg overflow-hidden"
                style={{
                  width: 48,
                  height: 48,
                  borderWidth: 1,
                  borderColor: "#FEDFB5",
                }}
              >
                <Image
                  source={{ uri: imageSource }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </View>
              {/* Additional variant slots */}
              {Array.from({ length: Math.max(0, numOutputs - 1) }).map(
                (_, i) => (
                  <View
                    key={i}
                    className="rounded-lg overflow-hidden"
                    style={{
                      width: 48,
                      height: 48,
                      borderWidth: 1,
                      borderColor: "rgba(77,70,60,0.3)",
                      opacity: 0.5,
                    }}
                  >
                    <Image
                      source={{ uri: imageSource }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  </View>
                ),
              )}
              {/* Add variant button */}
              <Pressable
                onPress={() =>
                  setNumOutputs(numOutputs >= 4 ? 1 : numOutputs + 1)
                }
                className="items-center justify-center rounded-lg"
                style={{
                  width: 48,
                  height: 48,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: "rgba(77,70,60,0.5)",
                }}
              >
                <Ionicons name="add" size={18} color="#4D463C" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <View className="mt-8">
          <Pressable
            onPress={handleGenerate}
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
                Generate Refinement
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
            </LinearGradient>
          </Pressable>
          <Text
            className="font-label text-center mt-4"
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#4D463C",
            }}
          >
            Estimated time: 12 seconds
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
