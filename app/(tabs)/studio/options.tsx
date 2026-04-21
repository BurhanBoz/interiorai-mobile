import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useStudioStore } from "@/stores/studioStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useEntitlement, usePlanPermission } from "@/hooks/useEntitlement";
import { useCreditCost } from "@/hooks/useCreditCost";
import type { DesignMode, QualityTier } from "@/types/api";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { UserAvatar } from "@/components/ui/UserAvatar";

const FEATURE_CODE_MAP: Record<DesignMode, string> = {
  REDESIGN: "INTERIOR_REDESIGN",
  EMPTY_ROOM: "EMPTY_ROOM",
  INPAINT: "INPAINT",
  STYLE_TRANSFER: "STYLE_TRANSFER",
};

const MODES: {
  key: DesignMode;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "REDESIGN", labelKey: "studio.mode_redesign", icon: "sparkles" },
  { key: "EMPTY_ROOM", labelKey: "studio.mode_empty_room", icon: "home-outline" },
  { key: "INPAINT", labelKey: "studio.mode_inpaint", icon: "image-outline" },
  { key: "STYLE_TRANSFER", labelKey: "studio.mode_style_transfer", icon: "color-palette-outline" },
];

const PALETTE_COLORS = [
  { color: "#E1C39B", gradientEnd: "#584325" },
  { color: "#1C1B1B", gradientEnd: "#4D463C" },
  { color: "#D1C6B9", gradientEnd: "#E5E2E1" },
  { color: "#281801", gradientEnd: "#FDDEB4" },
  { color: "#3F2D10", gradientEnd: "#E1C39B" },
  { color: "#93000A", gradientEnd: "#FFB4AB" },
];

const QUALITY_TIERS: { key: QualityTier; labelKey: string }[] = [
  { key: "STANDARD", labelKey: "studio.quality_standard" },
  { key: "HD", labelKey: "studio.quality_hd" },
  { key: "ULTRA_HD", labelKey: "studio.quality_ultra_hd" },
];

export default function OptionsScreen() {
  const { t } = useTranslation();
  const mode = useStudioStore(s => s.mode);
  const qualityTier = useStudioStore(s => s.qualityTier);
  const numOutputs = useStudioStore(s => s.numOutputs);
  const preserveLayout = useStudioStore(s => s.preserveLayout);
  const prompt = useStudioStore(s => s.prompt);
  const colorPalette = useStudioStore(s => s.colorPalette);
  const strength = useStudioStore(s => s.strength);
  const setMode = useStudioStore(s => s.setMode);
  const setQualityTier = useStudioStore(s => s.setQualityTier);
  const setNumOutputs = useStudioStore(s => s.setNumOutputs);
  const setPreserveLayout = useStudioStore(s => s.setPreserveLayout);
  const setPrompt = useStudioStore(s => s.setPrompt);
  const setColorPalette = useStudioStore(s => s.setColorPalette);
  const setStrength = useStudioStore(s => s.setStrength);

  const seed = useStudioStore(s => s.seed);
  const setSeed = useStudioStore(s => s.setSeed);
  const referencePhoto = useStudioStore(s => s.referencePhoto);
  // Plan-level permission checks — these reflect the current plan's
  // permissions_json and are the single source of truth for fine-grained locks.
  const { allowed: strengthAllowed } = usePlanPermission("allow_strength");
  const { allowed: seedControlEnabled } = usePlanPermission("allow_seed");
  const { allowed: negativePromptAllowed } = usePlanPermission("allow_negative_prompt");
  const { cost } = useCreditCost();
  const creditRules = useSubscriptionStore(s => s.creditRules);
  const isFeatureEnabled = useSubscriptionStore(s => s.isFeatureEnabled);

  // Determine which quality tiers are available for the current mode
  const currentFeatureCode = FEATURE_CODE_MAP[mode] ?? "INTERIOR_REDESIGN";
  const availableQualityTiers = QUALITY_TIERS.filter(tier =>
    creditRules.some(
      r => r.featureCode === currentFeatureCode && r.qualityTier === tier.key,
    ),
  );
  // If no credit rules loaded yet, show all tiers (graceful fallback)
  const displayQualityTiers =
    availableQualityTiers.length > 0 ? QUALITY_TIERS : QUALITY_TIERS;
  const isTierLocked = (tierKey: QualityTier) =>
    availableQualityTiers.length > 0 &&
    !availableQualityTiers.some(t => t.key === tierKey);

  // Determine which design modes are available
  const isModeAvailable = (modeKey: DesignMode) => {
    const fc = FEATURE_CODE_MAP[modeKey];
    return fc ? isFeatureEnabled(fc) : false;
  };

  // Determine max variants from credit rules
  const maxVariants = (() => {
    const rulesForMode = creditRules.filter(
      r => r.featureCode === currentFeatureCode,
    );
    if (rulesForMode.length === 0) return 8; // fallback
    return Math.max(...rulesForMode.map(r => r.numOutputs), 1);
  })();

  const [promptFocused, setPromptFocused] = useState(false);
  const [seedExpanded, setSeedExpanded] = useState(false);

  // Auto-downgrade if current selection is locked
  useEffect(() => {
    if (isTierLocked(qualityTier)) {
      setQualityTier("STANDARD");
    }
  }, [qualityTier, creditRules]);

  useEffect(() => {
    if (numOutputs > maxVariants) {
      setNumOutputs(maxVariants);
    }
  }, [maxVariants, numOutputs]);

  const aiStrengthPercent = Math.round(strength * 100);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* App Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(42,42,42,0.8)",
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#E1C39B" />
        </Pressable>
        <Text
          className="font-headline text-center"
          style={{
            fontSize: 14,
            lineHeight: 16,
            fontWeight: "700",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "#E1C39B",
          }}
        >
          {"ARCHITECTURAL\nLENS"}
        </Text>
        <UserAvatar size="sm" onPress />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step Indicator & Headline */}
        <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
          <Text
            className="font-label text-secondary mb-2"
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontWeight: "500",
            }}
          >
            {t("studio.step_3_of_4")}
          </Text>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 30, lineHeight: 34, fontWeight: "700" }}
          >
            {t("studio.step3_title")}
          </Text>
        </View>

        {/* Design Mode Chips */}
        <View style={{ marginTop: 40, paddingHorizontal: 24 }}>
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            {t("studio.design_mode")}
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {MODES.map(m => {
              const locked = !isModeAvailable(m.key);
              const isActive = mode === m.key && !locked;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (locked) {
                      router.push("/plans");
                      return;
                    }
                    setMode(m.key);
                    // Style Transfer needs a reference image; kick the user
                    // into the dedicated capture screen. They return to
                    // Review (not here) once the reference is set.
                    if (m.key === "STYLE_TRANSFER") {
                      router.push("/studio/style-transfer");
                    }
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: isActive
                      ? "#E1C39B"
                      : locked
                        ? "rgba(28,27,27,0.6)"
                        : "#2A2A2A",
                    borderWidth: locked ? 1 : 0,
                    borderColor: locked ? "rgba(153,143,132,0.3)" : "transparent",
                    borderStyle: locked ? "dashed" : "solid",
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  })}
                >
                  {locked && (
                    <Ionicons name="lock-closed" size={12} color="#998F84" />
                  )}
                  <Text
                    className="font-body"
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: isActive
                        ? "#3F2D11"
                        : locked
                          ? "#998F84"
                          : "#E0C29A",
                    }}
                  >
                    {t(m.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Quality & AI Strength Bento Layout */}
        <View style={{ marginTop: 48, paddingHorizontal: 24, gap: 16 }}>
          {/* Quality Segmented Control */}
          <View
            style={{
              padding: 24,
              borderRadius: 12,
              backgroundColor: "#1C1B1B",
            }}
          >
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 24,
              }}
            >
              {t("studio.quality_tier")}
            </Text>
            <View
              className="flex-row"
              style={{
                backgroundColor: "#131313",
                borderRadius: 8,
                padding: 4,
              }}
            >
              {QUALITY_TIERS.map(tier => {
                const locked = isTierLocked(tier.key);
                const isSelected = qualityTier === tier.key && !locked;
                return (
                  <Pressable
                    key={tier.key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (locked) {
                        router.push("/plans");
                      } else {
                        setQualityTier(tier.key);
                      }
                    }}
                    className="flex-1 items-center"
                    style={{
                      paddingVertical: 8,
                      borderRadius: 6,
                      backgroundColor: isSelected
                        ? "rgba(225,195,155,0.12)"
                        : "transparent",
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: "rgba(225,195,155,0.3)",
                      opacity: locked ? 0.55 : 1,
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    {locked && (
                      <Ionicons name="lock-closed" size={10} color="#998F84" />
                    )}
                    <Text
                      className="font-label"
                      style={{
                        fontSize: 12,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        color: locked
                          ? "#998F84"
                          : isSelected
                            ? "#E1C39B"
                            : "#998F84",
                        fontWeight: isSelected ? "700" : "500",
                      }}
                    >
                      {t(tier.labelKey)}
                    </Text>
                    {locked && tier.key !== "STANDARD" && (
                      <View
                        style={{
                          marginLeft: 4,
                          paddingHorizontal: 5,
                          paddingVertical: 1,
                          borderRadius: 3,
                          backgroundColor: "rgba(224,194,154,0.15)",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "700",
                            letterSpacing: 1,
                            color: "#E0C29A",
                          }}
                        >
                          PRO
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* AI Strength — gated by plan permission */}
          <Pressable
            onPress={() => {
              if (!strengthAllowed) router.push("/plans");
            }}
            disabled={strengthAllowed}
            style={{
              padding: 24,
              borderRadius: 12,
              backgroundColor: "#1C1B1B",
              opacity: strengthAllowed ? 1 : 0.55,
            }}
          >
            <View
              className="flex-row items-center justify-between"
              style={{ marginBottom: 24 }}
            >
              <View className="flex-row items-center" style={{ gap: 8 }}>
                {!strengthAllowed && (
                  <Ionicons name="lock-closed" size={12} color="#998F84" />
                )}
                <Text
                  className="font-label text-on-surface-variant"
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}
                >
                  {t("studio.strength")}
                </Text>
              </View>
              <Text
                className="font-headline"
                style={{
                  color: strengthAllowed ? "#E0C29A" : "#998F84",
                  fontSize: 16,
                }}
              >
                {strengthAllowed ? `${aiStrengthPercent}%` : "PRO+"}
              </Text>
            </View>
            {/* Continuous slider — 0.1–1.0, snaps every 0.05 */}
            <Slider
              value={strength}
              onValueChange={(v) => {
                if (strengthAllowed) setStrength(v);
              }}
              onSlidingStart={() => {
                if (strengthAllowed) Haptics.selectionAsync();
              }}
              minimumValue={0.1}
              maximumValue={1.0}
              step={0.05}
              minimumTrackTintColor="#E1C39B"
              maximumTrackTintColor="#353534"
              thumbTintColor={strengthAllowed ? "#FDDEB4" : "#998F84"}
              disabled={!strengthAllowed}
              style={{ width: "100%", height: 32 }}
            />
            <View className="flex-row justify-between" style={{ marginTop: 4 }}>
              <Text
                className="font-label"
                style={{ fontSize: 10, color: "#998F84", letterSpacing: 1.5 }}
              >
                {t("studio.strength_subtle")}
              </Text>
              <Text
                className="font-label"
                style={{ fontSize: 10, color: "#998F84", letterSpacing: 1.5 }}
              >
                {t("studio.strength_dramatic")}
              </Text>
            </View>
            {/* Mode-aware helper — STYLE_TRANSFER uses this value as the
                reference-image influence weight (backend image_prompt_strength),
                which has a different mental model than generic redesign. */}
            {strengthAllowed && (
              <Text
                className="font-body"
                style={{
                  fontSize: 12,
                  color: "#998F84",
                  lineHeight: 18,
                  marginTop: 14,
                  fontStyle: "italic",
                }}
              >
                {mode === "STYLE_TRANSFER"
                  ? t("studio.strength_helper_style_transfer")
                  : t("studio.strength_helper_generic")}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Color Palette */}
        <View style={{ marginTop: 48 }}>
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              paddingHorizontal: 24,
              marginBottom: 24,
            }}
          >
            {t("studio.color_palette")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
          >
            {PALETTE_COLORS.map((pal, idx) => {
              const isSelected = colorPalette === pal.color;
              return (
                <Pressable
                  key={idx}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setColorPalette(pal.color);
                  }}
                  style={({ pressed }) => ({
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  })}
                >
                  <LinearGradient
                    colors={[pal.color, pal.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: "#FDDEB4",
                      // ring-offset effect
                      ...(isSelected && {
                        shadowColor: "#FDDEB4",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.6,
                        shadowRadius: 6,
                        elevation: 6,
                      }),
                    }}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Variants & Preserve Layout */}
        <View style={{ marginTop: 48, paddingHorizontal: 24, gap: 16 }}>
          {/* Variants Stepper */}
          <View
            className="flex-row items-center justify-between"
            style={{
              padding: 24,
              borderRadius: 12,
              backgroundColor: "#1C1B1B",
            }}
          >
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {t("studio.number_of_outputs")}
            </Text>
            <View className="flex-row items-center" style={{ gap: 24 }}>
              <Pressable
                onPress={() => setNumOutputs(Math.max(1, numOutputs - 1))}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#4D463C",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="remove" size={16} color="#E0C29A" />
              </Pressable>
              <Text
                className="font-headline text-on-surface"
                style={{ fontSize: 20, fontWeight: "700" }}
              >
                {String(numOutputs).padStart(2, "0")}
              </Text>
              <Pressable
                onPress={() =>
                  setNumOutputs(Math.min(maxVariants, numOutputs + 1))
                }
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#4D463C",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="add" size={16} color="#E0C29A" />
              </Pressable>
            </View>
          </View>

          {/* Preserve Layout Toggle */}
          <View
            className="flex-row items-center justify-between"
            style={{
              padding: 24,
              borderRadius: 12,
              backgroundColor: "#1C1B1B",
            }}
          >
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {t("studio.preserve_layout")}
            </Text>
            <Switch
              value={preserveLayout}
              onValueChange={setPreserveLayout}
              trackColor={{ false: "#353534", true: "#584325" }}
              thumbColor="#E1C39B"
              ios_backgroundColor="#353534"
            />
          </View>
        </View>

        {/* Preview Card */}
        <View
          style={{
            marginTop: 48,
            marginHorizontal: 24,
            aspectRatio: 16 / 10,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "#2A2A2A",
          }}
        >
          <Image
            source={{
              uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuAMxLtyHrYZWFLdr9bRZUTzNYjwwfJGX_C-aKFQVI5vJLZRlAnAG0tqJ0Ypg6U9dOnq8DwDDB-y8En9hMNlJF14Cb6Uz8vqn0x207rlucIXLB0xoB7JhQ9-VfyZWlbfHVlr0c3UePWpLLPEhRMLv6gySdPfdnSa3UlFtBcvFjok2o9EwY4LeRb9k6mJsTEUV66dKKBmZV2ijNPI5kmQpOUU6XJL5vhKjNoUv6Gxt_Va5oVwQbn7fGVQTYx7T8atYs2tlVqsnsW5mHE",
            }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
          {/* Gradient overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "60%",
            }}
          />
          {/* Glass label */}
          <View
            style={{
              position: "absolute",
              bottom: 24,
              left: 24,
              backgroundColor: "rgba(19,19,19,0.7)",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="sparkles" size={14} color="#FDDEB4" />
            <Text
              className="font-label text-on-surface"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {t("studio.realtime_preview")}
            </Text>
          </View>
        </View>

        {/* Material Narrative (Prompt) */}
        <View style={{ marginTop: 48, paddingHorizontal: 24 }}>
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            {t("studio.custom_prompt")}
          </Text>
          <TextInput
            className="font-body text-on-surface"
            style={{
              backgroundColor: promptFocused ? "#2A2A2A" : "#1C1B1B",
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              minHeight: 100,
              textAlignVertical: "top",
            }}
            placeholder={t("studio.custom_prompt")}
            placeholderTextColor="#998F84"
            value={prompt}
            onChangeText={setPrompt}
            onFocus={() => setPromptFocused(true)}
            onBlur={() => setPromptFocused(false)}
            multiline
          />
        </View>

        {/* Advanced Seed Controls — gated by plan.allow_seed */}
        <View style={{ paddingHorizontal: 24 }}>
          <Pressable
            onPress={() => {
              if (!seedControlEnabled) {
                router.push("/plans");
                return;
              }
              setSeedExpanded(!seedExpanded);
            }}
            className="flex-row items-center justify-between"
            style={({ pressed }) => ({
              marginTop: 32,
              opacity: !seedControlEnabled ? 0.55 : pressed ? 0.8 : 1,
            })}
          >
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <Ionicons
                name={seedControlEnabled ? "options" : "lock-closed"}
                size={seedControlEnabled ? 20 : 16}
                color={seedControlEnabled ? "#E5E2E1" : "#998F84"}
              />
              <Text
                className="font-body text-on-surface"
                style={{ fontSize: 15 }}
              >
                {t("studio.seed")}
              </Text>
              {!seedControlEnabled && (
                <Text
                  className="font-label"
                  style={{
                    fontSize: 10,
                    color: "#E0C29A",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  PRO+
                </Text>
              )}
            </View>
            <Ionicons
              name={seedExpanded ? "chevron-down" : "chevron-forward"}
              size={18}
              color="#998F84"
            />
          </Pressable>

          {seedExpanded && seedControlEnabled && (
            <View style={{ marginTop: 12 }}>
              <Text
                className="font-body text-on-surface-variant"
                style={{ fontSize: 12, marginBottom: 8 }}
              >
                {t("studio.seed_help")}
              </Text>
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <TextInput
                  className="font-body text-on-surface"
                  style={{
                    flex: 1,
                    backgroundColor: "#1C1B1B",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 14,
                  }}
                  placeholder={t("studio.seed_placeholder")}
                  placeholderTextColor="#998F84"
                  keyboardType="number-pad"
                  value={seed !== undefined ? String(seed) : ""}
                  onChangeText={text => {
                    if (!text.trim()) {
                      setSeed(undefined);
                    } else {
                      const n = parseInt(text, 10);
                      if (!isNaN(n) && n >= 0) setSeed(n);
                    }
                  }}
                />
                {seed !== undefined && (
                  <Pressable onPress={() => setSeed(undefined)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color="#998F84" />
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Generation Cost */}
          <View
            className="flex-row items-center justify-between"
            style={{
              marginTop: 32,
              padding: 24,
              borderRadius: 12,
              backgroundColor: "#1C1B1B",
            }}
          >
            <View>
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {t("studio.credits")}
              </Text>
              <Text
                className="font-headline text-on-surface"
                style={{ fontSize: 20, fontWeight: "700", marginTop: 4 }}
              >
                {t("studio.cost_credits", { count: cost })}
              </Text>
            </View>
            <Ionicons name="wallet-outline" size={24} color="#E0C29A" />
          </View>
        </View>
      </ScrollView>

      {/* Floating CTA */}
      <View className="absolute bottom-0 left-0 right-0 px-6 pb-24 pt-4">
        <PrimaryButton
          label={t("common.next")}
          onPress={() => {
            // STYLE_TRANSFER requires a reference image. If the user hasn't
            // picked one yet (e.g. navigated away from the style-transfer
            // screen without uploading), send them back instead of letting
            // Review proceed to a guaranteed backend 400.
            if (mode === "STYLE_TRANSFER" && !referencePhoto?.fileId) {
              Alert.alert(
                t("studio.mode_style_transfer"),
                t("studio.style_transfer_requires_reference"),
              );
              router.push("/studio/style-transfer");
              return;
            }
            router.push("/(tabs)/studio/review");
          }}
        />
      </View>
    </SafeAreaView>
  );
}
