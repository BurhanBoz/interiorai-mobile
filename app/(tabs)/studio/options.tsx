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
import { usePromptSuggestions } from "@/hooks/usePromptSuggestions";
import { resolveFeatureCode } from "@/utils/featureCode";
import type { DesignMode, QualityTier } from "@/types/api";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Brand } from "@/components/brand/Brand";
import { BottomBar, BOTTOM_BAR_SCROLL_PADDING } from "@/components/layout/BottomBar";
import { theme } from "@/config/theme";

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
  planBadge?: string;
}[] = [
  { key: "REDESIGN", labelKey: "studio.mode_redesign", icon: "sparkles" },
  { key: "EMPTY_ROOM", labelKey: "studio.mode_empty_room", icon: "home-outline" },
  { key: "INPAINT", labelKey: "studio.mode_inpaint", icon: "image-outline", planBadge: "PRO" },
  { key: "STYLE_TRANSFER", labelKey: "studio.mode_style_transfer", icon: "color-palette-outline", planBadge: "MAX" },
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
  const photo = useStudioStore(s => s.photo);
  const referencePhoto = useStudioStore(s => s.referencePhoto);
  const roomType = useStudioStore(s => s.roomType);
  const designStyle = useStudioStore(s => s.designStyle);

  // Contextual chip suggestions — backend ranks by specificity (style+room
  // beats style alone beats wildcard). Falls back to [] on network error.
  const { suggestions: promptSuggestions } = usePromptSuggestions({
    style: designStyle?.code,
    room: roomType?.code,
    mode,
  });
  const stripChip = (source: string, text: string): string => {
    let next = source;
    if (next.includes(`, ${text}`)) next = next.replace(`, ${text}`, "");
    else if (next.includes(`${text}, `)) next = next.replace(`${text}, `, "");
    else next = next.replace(text, "");
    return next.trim().replace(/^,\s*|,\s*$/g, "").replace(/,\s*,/g, ", ");
  };

  const appendSuggestion = (text: string) => {
    Haptics.selectionAsync();
    const current = prompt.trim();
    const next = current.length === 0 ? text : `${current}, ${text}`;
    setPrompt(next);
  };

  const removeSuggestion = (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrompt(stripChip(prompt, text));
  };

  // Clear-all must remove every selected chip in one pass. Looping
  // removeSuggestion() reads stale `prompt` from closure on each call and
  // only the first removal sticks — that was the "clear all wipes one"
  // bug. Building the cleared string atomically fixes it.
  const clearAllSuggestions = (texts: string[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = texts.reduce((acc, t) => stripChip(acc, t), prompt);
    setPrompt(next);
  };
  // Plan-level permission checks — these reflect the current plan's
  // permissions_json and are the single source of truth for fine-grained locks.
  const { allowed: strengthAllowed } = usePlanPermission("allow_strength");
  const { allowed: seedControlEnabled } = usePlanPermission("allow_seed");
  const { allowed: negativePromptAllowed } = usePlanPermission("allow_negative_prompt");
  const { cost } = useCreditCost();
  const creditRules = useSubscriptionStore(s => s.creditRules);
  const features = useSubscriptionStore(s => s.features);
  const subscription = useSubscriptionStore(s => s.subscription);
  const planCode = subscription?.planCode ?? "FREE";

  // Quality tier availability: each (mode, tier) pair maps to a distinct
  // feature_code (V25 rename: REDESIGN HD/ULTRA_HD → "HD_REDESIGN").
  // V14 migration corrects V5's regression so the DB uses HD_REDESIGN.
  const availableQualityTiers = QUALITY_TIERS.filter(tier =>
    creditRules.some(
      r =>
        r.featureCode === resolveFeatureCode(mode, tier.key) &&
        r.qualityTier === tier.key,
    ),
  );
  // Plan-code allowlist — primary gate so MAX users always see ULTRA_HD
  // unlocked even when creditRules are still loading or the per-mode rule
  // table has stale gaps. Mirrors V2 seed: FREE=STANDARD, BASIC/PRO=STANDARD+HD,
  // MAX=all three. Backend remains the source of truth at job-creation time.
  const PLAN_TIER_ALLOWLIST: Record<string, QualityTier[]> = {
    FREE: ["STANDARD"],
    BASIC: ["STANDARD", "HD"],
    PRO: ["STANDARD", "HD"],
    MAX: ["STANDARD", "HD", "ULTRA_HD"],
  };
  const isTierLocked = (tierKey: QualityTier) => {
    const allowed = PLAN_TIER_ALLOWLIST[planCode] ?? ["STANDARD"];
    if (!allowed.includes(tierKey)) return true;
    // Defensive refinement: only when rules have loaded for the current mode,
    // also block tiers without a billable (mode, tier) row to avoid letting
    // the user pick a combo the backend would reject at job-creation time.
    if (availableQualityTiers.length === 0) return false;
    return !availableQualityTiers.some(t => t.key === tierKey);
  };

  const { allowed: maskEditingAllowed } = usePlanPermission("allow_mask_editing");

  const isModeAvailable = (modeKey: DesignMode) => {
    const fc = FEATURE_CODE_MAP[modeKey];
    if (!fc || !(features.find(f => f.featureCode === fc)?.enabled ?? false)) return false;
    // Hard plan-code guards so feature-flag loading delays can't briefly
    // surface a locked mode as available.
    if (modeKey === "STYLE_TRANSFER" && planCode !== "MAX") return false;
    if (modeKey === "INPAINT" && planCode !== "PRO" && planCode !== "MAX") return false;
    return true;
  };

  // Determine max variants from credit rules. Must use the tier-aware
  // feature_code so HD jobs look up HD_REDESIGN rules (not INTERIOR_REDESIGN)
  // — same V25-split gotcha as availableQualityTiers above.
  const maxVariants = (() => {
    const resolvedFc = resolveFeatureCode(mode, qualityTier);
    const rulesForMode = creditRules.filter(
      r => r.featureCode === resolvedFc && r.qualityTier === qualityTier,
    );
    if (rulesForMode.length === 0) return 8; // fallback
    return Math.max(...rulesForMode.map(r => r.numOutputs), 1);
  })();

  const [promptFocused, setPromptFocused] = useState(false);
  const [promptChipsExpanded, setPromptChipsExpanded] = useState(false);
  const [seedExpanded, setSeedExpanded] = useState(false);
  const [hintChipId, setHintChipId] = useState<string | null>(null);

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
        <Brand variant="inline" size="sm" tone="gold" />
        <UserAvatar size="sm" onPress />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: BOTTOM_BAR_SCROLL_PADDING(true) }}
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
                    borderRadius: 12,
                    backgroundColor: isActive
                      ? "#E1C39B"
                      : locked
                        ? "rgba(28,27,27,0.6)"
                        : "#2A2A2A",
                    borderWidth: 1,
                    borderColor: isActive
                      ? "rgba(225,195,155,0.85)"
                      : locked
                        ? "rgba(153,143,132,0.3)"
                        : "rgba(225,195,155,0.35)",
                    borderStyle: locked ? "dashed" : "solid",
                    overflow: "hidden",
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <Ionicons
                      name={locked ? "lock-closed" : (m.icon as any)}
                      size={locked ? 12 : 14}
                      color={isActive ? "#3F2D11" : locked ? "#998F84" : "#E0C29A"}
                    />
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
                    {locked && m.planBadge && (
                      <View
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          backgroundColor: "rgba(225,195,155,0.12)",
                          borderWidth: 1,
                          borderColor: "rgba(225,195,155,0.28)",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter-SemiBold",
                            fontSize: 9,
                            letterSpacing: 1,
                            color: "rgba(225,195,155,0.55)",
                          }}
                        >
                          {m.planBadge}
                        </Text>
                      </View>
                    )}
                  </View>
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
                          {tier.key === "ULTRA_HD" ? "MAX" : "PRO"}
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
            {/* Mode-aware min/max labels — "Subtle → Dramatic" is too
                abstract. Per-mode pairs frame the slider in the vocabulary
                that matches the user's intent (materials vs empty vs copy). */}
            <View className="flex-row justify-between" style={{ marginTop: 4 }}>
              <Text
                className="font-label"
                style={{ fontSize: 10, color: "#998F84", letterSpacing: 1.5 }}
              >
                {t(`studio.strength_min_${mode.toLowerCase()}`, {
                  defaultValue: t("studio.strength_subtle"),
                })}
              </Text>
              <Text
                className="font-label"
                style={{ fontSize: 10, color: "#998F84", letterSpacing: 1.5 }}
              >
                {t(`studio.strength_max_${mode.toLowerCase()}`, {
                  defaultValue: t("studio.strength_dramatic"),
                })}
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

          {/* Preserve Layout Toggle — only meaningful for REDESIGN mode.
              EMPTY_ROOM (emptying conflicts with "keep furniture" directive),
              INPAINT (masked edit is region-local), and STYLE_TRANSFER
              (reference image already defines aesthetic) don't combine with
              preserve_layout → disabled + helper text to avoid confusion. */}
          {(() => {
            const preserveLayoutApplicable = mode === "REDESIGN";
            return (
              <View
                style={{
                  padding: 24,
                  borderRadius: 12,
                  backgroundColor: "#1C1B1B",
                  opacity: preserveLayoutApplicable ? 1 : 0.5,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    {!preserveLayoutApplicable && (
                      <Ionicons
                        name="lock-closed"
                        size={12}
                        color="#998F84"
                      />
                    )}
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
                  </View>
                  <Switch
                    value={preserveLayoutApplicable && preserveLayout}
                    onValueChange={setPreserveLayout}
                    disabled={!preserveLayoutApplicable}
                    trackColor={{ false: "#353534", true: "#584325" }}
                    thumbColor={
                      preserveLayoutApplicable ? "#E1C39B" : "#998F84"
                    }
                    ios_backgroundColor="#353534"
                  />
                </View>
                {!preserveLayoutApplicable && (
                  <Text
                    className="font-body"
                    style={{
                      fontSize: 12,
                      color: "#998F84",
                      lineHeight: 18,
                      marginTop: 12,
                      fontStyle: "italic",
                    }}
                  >
                    {t("studio.preserve_layout_only_redesign")}
                  </Text>
                )}
              </View>
            );
          })()}
        </View>

        {/* Preview Card */}
        <View
          style={{
            marginTop: 48,
            marginHorizontal: 24,
            aspectRatio: 16 / 10,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: "#111110",
            borderWidth: 1,
            borderColor: "rgba(225,195,155,0.12)",
          }}
        >
          <Image
            source={photo ? { uri: photo.uri } : undefined}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
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
        <View style={{ marginTop: 40, paddingHorizontal: 24 }}>
          {/* Section label — above the container */}
          <Text
            className="font-label"
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: theme.color.goldMidday,
              marginBottom: 14,
            }}
          >
            {t("studio.custom_prompt")}
          </Text>

          {/* Outer gold-bordered container */}
          {(() => {
            const categoryOrder = ["LIGHT", "MATERIAL", "MOOD", "STYLE_DETAIL", "COLOR", "ERA", "OBJECT"];
            const selectedChips = promptSuggestions.filter(c =>
              prompt.toLowerCase().includes(c.text.toLowerCase()),
            );
            const isActive = selectedChips.length > 0;
            const hasSuggestions = promptSuggestions.length > 0;
            const accentBorder = isActive
              ? "rgba(143,227,161,0.38)"
              : promptFocused
                ? "rgba(225,195,155,0.40)"
                : "rgba(225,195,155,0.20)";

            return (
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: accentBorder,
                  backgroundColor: "rgba(14,13,12,0.60)",
                  padding: 16,
                  gap: 14,
                }}
              >
                {/* Inner label */}
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 12,
                    color: isActive
                      ? "rgba(143,227,161,0.55)"
                      : "rgba(225,195,155,0.45)",
                    fontStyle: "italic",
                  }}
                >
                  {t("studio.custom_prompt_hint")}
                </Text>

                {/* Selected chips strip — premium summary of active suggestions
                    with one-tap removal. Hidden until at least one is selected. */}
                {isActive && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {selectedChips.map(chip => (
                      <Pressable
                        key={chip.id}
                        onPress={() => removeSuggestion(chip.text)}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          paddingLeft: 10,
                          paddingRight: 7,
                          paddingVertical: 5,
                          borderRadius: 999,
                          backgroundColor: "rgba(143,227,161,0.10)",
                          borderWidth: 0.5,
                          borderColor: "rgba(143,227,161,0.32)",
                          opacity: pressed ? 0.65 : 1,
                        })}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter-Medium",
                            fontSize: 11,
                            color: "#8FE3A1",
                            letterSpacing: 0.2,
                          }}
                          numberOfLines={1}
                        >
                          {chip.text}
                        </Text>
                        <Ionicons name="close" size={12} color="rgba(143,227,161,0.70)" />
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Full-width text input */}
                <TextInput
                  className="font-body text-on-surface"
                  style={{
                    padding: 14,
                    fontSize: 14,
                    lineHeight: 21,
                    textAlignVertical: "top",
                    minHeight: 92,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: promptFocused
                      ? "rgba(225,195,155,0.45)"
                      : "rgba(225,195,155,0.16)",
                    backgroundColor: promptFocused
                      ? "rgba(225,195,155,0.04)"
                      : "rgba(225,195,155,0.02)",
                  }}
                  placeholder={t("studio.custom_prompt")}
                  placeholderTextColor="rgba(225,195,155,0.30)"
                  value={prompt}
                  onChangeText={setPrompt}
                  onFocus={() => setPromptFocused(true)}
                  onBlur={() => setPromptFocused(false)}
                  multiline
                />

                {/* Suggestions accordion — full-width row, properly aligned
                    leading sparkle + label + trailing count badge + chevron. */}
                {hasSuggestions && (
                  <View
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isActive
                        ? "rgba(143,227,161,0.28)"
                        : "rgba(225,195,155,0.18)",
                      backgroundColor: "rgba(225,195,155,0.025)",
                      overflow: "hidden",
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        setPromptChipsExpanded(v => !v);
                      }}
                      style={({ pressed }) => ({
                        borderBottomWidth: promptChipsExpanded ? 1 : 0,
                        borderBottomColor: "rgba(225,195,155,0.10)",
                        backgroundColor: isActive
                          ? "rgba(143,227,161,0.04)"
                          : "rgba(225,195,155,0.03)",
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 14,
                          paddingVertical: 13,
                        }}
                      >
                        <Ionicons
                          name="sparkles-outline"
                          size={14}
                          color={isActive ? "rgba(143,227,161,0.85)" : theme.color.goldMidday}
                        />
                        <Text
                          style={{
                            flex: 1,
                            fontFamily: "Inter-SemiBold",
                            fontSize: 11,
                            lineHeight: 16,
                            letterSpacing: 1.6,
                            textTransform: "uppercase",
                            color: isActive
                              ? "rgba(143,227,161,0.90)"
                              : "rgba(225,195,155,0.75)",
                            marginHorizontal: 8,
                          }}
                          numberOfLines={1}
                        >
                          {t("studio.prompt_suggestions_label").split(" —")[0]}
                          {isActive ? `  ·  ${selectedChips.length}` : ""}
                        </Text>
                        <Ionicons
                          name={promptChipsExpanded ? "chevron-up" : "chevron-down"}
                          size={16}
                          color={isActive ? "rgba(143,227,161,0.70)" : "rgba(225,195,155,0.55)"}
                        />
                      </View>
                    </Pressable>

                    {promptChipsExpanded && (
                      <ScrollView
                        style={{ maxHeight: 280 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                      >
                        {isActive && (
                          <Pressable
                            onPress={() => clearAllSuggestions(selectedChips.map(c => c.text))}
                            style={({ pressed }) => ({
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                              borderBottomWidth: 0.5,
                              borderBottomColor: "rgba(229,140,130,0.18)",
                              backgroundColor: pressed
                                ? "rgba(229,140,130,0.10)"
                                : "rgba(229,140,130,0.04)",
                            })}
                          >
                            <Ionicons name="close-circle-outline" size={13} color="rgba(229,140,130,0.80)" />
                            <Text
                              style={{
                                fontFamily: "Inter-Medium",
                                fontSize: 11,
                                letterSpacing: 0.3,
                                color: "rgba(229,140,130,0.80)",
                              }}
                            >
                              {t("studio.prompt_clear_all")}
                            </Text>
                          </Pressable>
                        )}

                        {categoryOrder.map(cat => {
                          const catChips = promptSuggestions.filter(c => c.category === cat);
                          if (catChips.length === 0) return null;
                          return (
                            <View key={cat}>
                              <Text
                                style={{
                                  fontFamily: "Inter-SemiBold",
                                  fontSize: 9,
                                  letterSpacing: 1.6,
                                  textTransform: "uppercase",
                                  color: isActive
                                    ? "rgba(143,227,161,0.55)"
                                    : "rgba(225,195,155,0.55)",
                                  paddingHorizontal: 14,
                                  paddingTop: 12,
                                  paddingBottom: 6,
                                }}
                              >
                                {cat.replace(/_/g, " ")}
                              </Text>
                              <View
                                style={{
                                  flexDirection: "row",
                                  flexWrap: "wrap",
                                  gap: 6,
                                  paddingHorizontal: 14,
                                  paddingBottom: 10,
                                }}
                              >
                                {catChips.map(chip => {
                                  const isSelected = prompt.toLowerCase().includes(chip.text.toLowerCase());
                                  return (
                                    <Pressable
                                      key={chip.id}
                                      onPress={() => {
                                        isSelected
                                          ? removeSuggestion(chip.text)
                                          : appendSuggestion(chip.text);
                                      }}
                                      style={({ pressed }) => ({
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 6,
                                        paddingLeft: 11,
                                        paddingRight: 9,
                                        paddingVertical: 7,
                                        borderRadius: 999,
                                        borderWidth: 0.5,
                                        borderColor: isSelected
                                          ? "rgba(143,227,161,0.35)"
                                          : "rgba(225,195,155,0.22)",
                                        backgroundColor: isSelected
                                          ? "rgba(143,227,161,0.10)"
                                          : pressed
                                            ? "rgba(225,195,155,0.06)"
                                            : "rgba(225,195,155,0.02)",
                                      })}
                                    >
                                      <Text
                                        style={{
                                          fontFamily: "Inter",
                                          fontSize: 12,
                                          lineHeight: 16,
                                          color: isSelected
                                            ? "#8FE3A1"
                                            : "rgba(229,226,225,0.78)",
                                        }}
                                      >
                                        {chip.text}
                                      </Text>
                                      <Ionicons
                                        name={isSelected ? "checkmark" : "add"}
                                        size={13}
                                        color={isSelected ? "#8FE3A1" : "rgba(225,195,155,0.65)"}
                                      />
                                    </Pressable>
                                  );
                                })}
                              </View>
                            </View>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                )}
              </View>
            );
          })()}
        </View>

        {/* Advanced Seed Controls — gated by plan.allow_seed */}
        <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
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
                style={{ fontSize: 12, marginBottom: 10, lineHeight: 18 }}
              >
                {t("studio.seed_help_long")}
              </Text>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <TextInput
                  className="font-body text-on-surface"
                  style={{
                    flex: 1,
                    backgroundColor: "#1C1B1B",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: seed !== undefined
                      ? "rgba(225,195,155,0.35)"
                      : "rgba(255,255,255,0.08)",
                  }}
                  placeholder={t("studio.seed_placeholder_long")}
                  placeholderTextColor="#998F84"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  maxLength={10}
                  value={seed !== undefined ? String(seed) : ""}
                  onChangeText={text => {
                    const trimmed = text.trim();
                    if (!trimmed) {
                      setSeed(undefined);
                      return;
                    }
                    // Strip non-digits defensively (number-pad on Android can
                    // still surface locale separators on some devices).
                    const digits = trimmed.replace(/[^0-9]/g, "");
                    if (!digits) return;
                    const n = parseInt(digits, 10);
                    if (!isNaN(n) && n >= 0 && n <= 2147483647) setSeed(n);
                  }}
                />
                {/* Random button — generates a fresh 32-bit positive int. */}
                <Pressable
                  onPress={() => {
                    const random = Math.floor(Math.random() * 2147483647);
                    setSeed(random);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: "rgba(225,195,155,0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(225,195,155,0.35)",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="dice" size={20} color="#E0C29A" />
                </Pressable>
                {seed !== undefined && (
                  <Pressable
                    onPress={() => setSeed(undefined)}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.5 : 1,
                    })}
                  >
                    <Ionicons name="close-circle" size={22} color="#998F84" />
                  </Pressable>
                )}
              </View>
              <Text
                className="font-label text-on-surface-variant"
                style={{ fontSize: 10, marginTop: 8, letterSpacing: 0.3 }}
              >
                {seed !== undefined
                  ? t("studio.seed_locked_hint", { seed })
                  : t("studio.seed_empty_hint")}
              </Text>
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

      {/* Floating CTA — BottomBar handles the safe-area + tab-bar math so
          the Next button always sits a breathing-cushion above the blurred
          tab bar pill. */}
      <BottomBar overTabBar>
        <PrimaryButton
          label={t("common.next")}
          onPress={() => {
            // STYLE_TRANSFER requires a reference image. If the user hasn't
            // picked one yet, bounce them back instead of letting Review
            // proceed to a guaranteed backend 400.
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
      </BottomBar>
    </SafeAreaView>
  );
}
