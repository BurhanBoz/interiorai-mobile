import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  Modal,
  FlatList,
  LayoutAnimation,
  ActivityIndicator,
  Dimensions,
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
import {
  useEntitlement,
  usePlanPermission,
  useEffectivePlanCode,
  useEffectiveCreditRules,
  useEffectiveFeatures,
} from "@/hooks/useEntitlement";
import { useCreditCost } from "@/hooks/useCreditCost";
import { usePromptSuggestions } from "@/hooks/usePromptSuggestions";
import { resolveFeatureCode } from "@/utils/featureCode";
import type { DesignMode, QualityTier } from "@/types/api";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AvatarMenu } from "@/components/ui/AvatarMenu";
import { Brand } from "@/components/brand/Brand";
import { BottomBar, BOTTOM_BAR_SCROLL_PADDING } from "@/components/layout/BottomBar";
import { AdvancedSettings } from "@/components/studio/AdvancedSettings";
import { useGenerate } from "@/hooks/useGenerate";
import { useImagePicker } from "@/hooks/useImagePicker";
import { theme } from "@/config/theme";

const FEATURE_CODE_MAP: Record<DesignMode, string> = {
  REDESIGN: "INTERIOR_REDESIGN",
  EMPTY_ROOM: "EMPTY_ROOM",
  INPAINT: "INPAINT",
  STYLE_TRANSFER: "STYLE_TRANSFER",
  OUTDOOR: "OUTDOOR_DESIGN",
};

/* Reference-tile row (IO-2).
 *
 * Vertical air is responsive for the same reason BottomBar's BREATHING is: a
 * fixed 24 reads as a proper section break on a 6.7" screen but eats a
 * meaningful slice of an SE, where vertical space is the scarce resource. The
 * row had no top margin at all, so it sat welded to the Quality card above it
 * (founder screenshot, 2026-08-11) — clamped both ends so it never welds and
 * never floats away.
 *
 * The caption is the smallest thing that removes ambiguity: a bare dashed tile
 * in a screen full of controls could just as easily mean "another photo of the
 * room". One or two words under the tile — share-sheet grammar, not a section
 * heading — and only while the tile is empty, because a thumbnail explains
 * itself and the caption would turn into noise.
 */
const TILE_ROW_SPACING = Math.round(
  Math.min(32, Math.max(20, Dimensions.get("window").height * 0.028)),
);
const TILE_SIZE = 76;
const TILE_CAPTION = {
  fontFamily: "Inter",
  fontSize: 10,
  lineHeight: 13,
  letterSpacing: 0.2,
  textAlign: "center" as const,
  color: "#8C8378",
  width: TILE_SIZE,
};


/**
 * Curated three-color interior palette themes — 2025-2026 trend-aligned.
 *
 * Each theme is a {primary, secondary, accent} triplet that the backend
 * concatenates with `;` separators and feeds to ColorNameMapper.humanize()
 * (max 6 colors, comma OR semicolon split). Three colors per theme is the
 * sweet spot: enough nuance for the model to grasp atmosphere, few enough
 * to stay under token budget after humanization.
 *
 * Hex values intentionally chosen to land exactly on existing anchor
 * phrases in ColorNameMapper.ANCHORS — so humanize() resolves to the
 * crisp design vocabulary ("warm beige, deep charcoal, brass gold") that
 * the prompt pipeline expects, not improvised approximations.
 *
 * Ordering reflects designer adoption frequency (Pantone + Houzz +
 * Architectural Digest 2025 trend reports): Mocha Mousse (Pantone 2025
 * Color of the Year) leads, followed by the year-over-year top staples.
 */
type PaletteTheme = {
  /** Stable id used for selection state (string match against studioStore.colorPalette). */
  id: string;
  /** i18n key for the theme name (under `studio.palette_*`). */
  labelKey: string;
  /** Three hex colors — primary, secondary, accent. Backend joins with `;`. */
  colors: readonly [string, string, string];
};

// Curated to 8 high-adoption themes (was 12). The dropped four
// (Forest Lodge, Burgundy Velvet, Dusty Rose, Olive & Ochre) overlapped
// adjacent themes (Sage covers biophilic, Charcoal & Brass covers
// dramatic warm) and pushed the grid past the visual-density ceiling.
// Eight items in a 2-column grid means four rows — comfortable to scan
// without scrolling, premium-feeling because each card breathes. Their
// i18n keys are kept in the bundle for graceful fallback if the list
// is re-expanded later.
const PALETTE_THEMES: readonly PaletteTheme[] = [
  // ── Warm neutrals (top adoption) ──────────────────────────────────
  { id: "warm-mocha",      labelKey: "studio.palette_warm_mocha",      colors: ["#A48359", "#EADEC8", "#F5F1E8"] }, // Pantone 2025
  { id: "soft-neutrals",   labelKey: "studio.palette_soft_neutrals",   colors: ["#E1C39B", "#F7F7F7", "#8A8A8A"] },
  // ── Cool / biophilic ──────────────────────────────────────────────
  { id: "sage-sanctuary",  labelKey: "studio.palette_sage_sanctuary",  colors: ["#A8B599", "#D8DFC8", "#F5F1E8"] },
  { id: "coastal-calm",    labelKey: "studio.palette_coastal_calm",    colors: ["#9AB7CF", "#F5F1E8", "#A48359"] },
  // ── Earthy / grounding ────────────────────────────────────────────
  { id: "terracotta-earth",labelKey: "studio.palette_terracotta_earth",colors: ["#C87B5D", "#E1C39B", "#5D432C"] },
  // ── Dramatic / luxury ─────────────────────────────────────────────
  { id: "charcoal-brass",  labelKey: "studio.palette_charcoal_brass",  colors: ["#2A2A2A", "#B79561", "#A48359"] },
  { id: "navy-heritage",   labelKey: "studio.palette_navy_heritage",   colors: ["#264B70", "#B79561", "#EADEC8"] },
  // ── Minimalist ────────────────────────────────────────────────────
  { id: "japandi-pure",    labelKey: "studio.palette_japandi_pure",    colors: ["#FFFFFF", "#E5E5E5", "#2A2A2A"] },
];

/** Encode a palette theme to the wire format the backend expects. */
const encodePalette = (colors: readonly string[]) => colors.join(";");

// ULTRA_HD removed from the picker (2026-07-11 founder call): print-grade
// sharpness is sold AFTER generation via the 4x Upscale action (PRO/MAX),
// where the user upscales the render they actually like — better economics
// and no dead tier (ST had no ULTRA_HD credit rule, so even MAX saw it
// locked here). The backend keeps accepting ULTRA_HD for compatibility.
const QUALITY_TIERS: { key: QualityTier; labelKey: string }[] = [
  { key: "STANDARD", labelKey: "studio.quality_standard" },
  { key: "HD", labelKey: "studio.quality_hd" },
];

export default function OptionsScreen() {
  const { t } = useTranslation();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const mode = useStudioStore(s => s.mode);
  const qualityTier = useStudioStore(s => s.qualityTier);
  const numOutputs = useStudioStore(s => s.numOutputs);
  const preserveLayout = useStudioStore(s => s.preserveLayout);
  const prompt = useStudioStore(s => s.prompt);
  const colorPalette = useStudioStore(s => s.colorPalette);
  const strength = useStudioStore(s => s.strength);
  const setQualityTier = useStudioStore(s => s.setQualityTier);
  const setNumOutputs = useStudioStore(s => s.setNumOutputs);
  const setPreserveLayout = useStudioStore(s => s.setPreserveLayout);
  const setPrompt = useStudioStore(s => s.setPrompt);
  const setColorPalette = useStudioStore(s => s.setColorPalette);
  const setStrength = useStudioStore(s => s.setStrength);

  const photo = useStudioStore(s => s.photo);
  const referencePhoto = useStudioStore(s => s.referencePhoto);
  const roomType = useStudioStore(s => s.roomType);
  const designStyle = useStudioStore(s => s.designStyle);

  // Parked with the Custom Prompt block (2026-08-07). Left running, this
  // fired a suggestions request on every entry to Step 3 for chips nothing
  // renders any more — a backend call per screen visit, paid for by the user's
  // battery and our rate limit. Restore together with the prompt UI below.
  // const { suggestions: promptSuggestions } = usePromptSuggestions({
  //   style: designStyle?.code,
  //   room: roomType?.code,
  //   mode,
  // });
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
  const { allowed: negativePromptAllowed } = usePlanPermission("allow_negative_prompt");
  // IO-2 object insertion — same permission flag that gates Style Transfer's
  // reference image; the backend enforces it hard-fail on job creation.
  const { allowed: referenceImageAllowed } = usePlanPermission("allow_reference_image");
  const objectRefs = useStudioStore(s => s.objectRefs);
  const addObjectRef = useStudioStore(s => s.addObjectRef);
  const removeObjectRef = useStudioStore(s => s.removeObjectRef);
  const { pickImage: pickObjectImage, isUploading: isObjectUploading } = useImagePicker();

  const handlePickObject = async () => {
    if (!referenceImageAllowed) {
      router.push("/plans");
      return;
    }
    if (isObjectUploading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await pickObjectImage();
    if (result?.fileId) {
      addObjectRef({ uri: result.uri, fileId: result.fileId });
    }
  };
  const { cost } = useCreditCost();
  // EFFECTIVE values — welcome bonus trial users get MAX plan's rules + features
  // + plan code. Without this override, trial users see STYLE_TRANSFER + INPAINT
  // + HD-tier as locked even though the backend would happily accept the job.
  const creditRules = useEffectiveCreditRules();
  const features = useEffectiveFeatures();
  const subscription = useSubscriptionStore(s => s.subscription);
  const planCode = useEffectivePlanCode();

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
    MAX: ["STANDARD", "HD"],
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

  // Determine max variants from credit rules. Must use the tier-aware
  // feature_code so HD jobs look up HD_REDESIGN rules (not INTERIOR_REDESIGN)
  // — same V25-split gotcha as availableQualityTiers above.
  // STYLE_TRANSFER always renders a single faithful result — the stepper
  // shows a locked 01 (2026-07-11 founder call) and the store is coerced so
  // a value carried over from another mode can never leak into the payload.
  const outputsLocked = mode === "STYLE_TRANSFER";
  useEffect(() => {
    if (outputsLocked && numOutputs !== 1) setNumOutputs(1);
  }, [outputsLocked, numOutputs, setNumOutputs]);

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
  // Custom prompt accordion (2026-07 UX): collapsed by default — most users
  // never touch it. Opens pre-expanded when a prompt already exists.
  const [promptOpen, setPromptOpen] = useState(() => prompt.trim().length > 0);
  const togglePromptOpen = () => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPromptOpen(v => !v);
  };
  const [hintChipId, setHintChipId] = useState<string | null>(null);
  const [paletteSheetOpen, setPaletteSheetOpen] = useState(false);

  // Resolve the currently-selected palette theme from its encoded value.
  // Used by the trigger row to render the swatch + label without keeping
  // a duplicate piece of state around.
  const selectedPaletteTheme = PALETTE_THEMES.find(
    // NOT `theme` — that identifier is the design system import, and
    // shadowing it here would silently redirect any future `theme.color`
    // written inside this callback to a palette object.
    (palette) => encodePalette(palette.colors) === colorPalette,
  );

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

  // One line standing in for four folded controls. Only the parts that apply
  // to this mode appear — a Style Transfer run has no strength slider and a
  // non-redesign mode has no layout toggle, so listing them would describe a
  // screen the user cannot see.
  // `cost` already comes from useCreditCost() above — the hook exposes it
  // too, but one binding per screen keeps the price unambiguous.
  const { generate, isSubmitting } = useGenerate();

  // What Review used to show as four summary cards, in one line above the
  // button: the resolved selections the user is about to pay for.
  const generationSummary = [
    designStyle?.name,
    roomType?.name,
    qualityTier === "HD" ? t("studio.quality_hd") : t("studio.quality_standard"),
    numOutputs > 1 ? `×${numOutputs}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const advancedSummary = [
    mode !== "STYLE_TRANSFER" && strengthAllowed ? `${aiStrengthPercent}%` : null,
    selectedPaletteTheme ? t(selectedPaletteTheme.labelKey) : null,
    numOutputs > 1 ? `×${numOutputs}` : null,
    mode === "REDESIGN" && preserveLayout ? t("studio.preserve_layout") : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
            borderRadius: theme.radius.lg,
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
        <AvatarMenu />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: BOTTOM_BAR_SCROLL_PADDING(true) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step Indicator & Headline */}
        <View style={{ paddingHorizontal: theme.space.gutter, paddingTop: 32 }}>
          <Text
            className="font-label text-secondary mb-2"
            style={{
              ...theme.text.label,
            }}
          >
            {t("studio.step_3_of_4")}
          </Text>
          <Text
            className="font-headline text-on-surface"
            style={{ ...theme.text.display }}
          >
            {t("studio.step3_title")}
          </Text>
        </View>

        {/* Design mode is chosen on the studio home (2026-07 IA rework) —
            the chips that lived here are gone; `mode` arrives via the store
            and mode-specific steps (mask/reference) run right after upload. */}

        {/* Quality & AI Strength Bento Layout */}
        <View style={{ marginTop: 48, paddingHorizontal: theme.space.gutter, gap: 16 }}>
          {/* Quality Segmented Control */}
          <View
            style={{
              padding: 24,
              borderRadius: theme.radius.sm,
              backgroundColor: "#1C1B1B",
            }}
          >
            <Text
              className="font-label text-on-surface-variant"
              style={{
                ...theme.text.caption,
                marginBottom: 24,
              }}
            >
              {t("studio.quality_tier")}
            </Text>
            <View
              className="flex-row"
              style={{
                backgroundColor: "#131313",
                borderRadius: theme.radius.sm,
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
                        ...theme.text.caption,
                        color: locked
                          ? "#998F84"
                          : isSelected
                            ? "#E1C39B"
                            : "#998F84",
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
                            ...theme.text.caption,
                            color: "#E0C29A",
                          }}
                        >
                          {"BASE"}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* IO-2 — object insertion "+" row (2026-08-11). Free-form modes
            only: the depth (preserve) route has no input_images channel, so
            the row disappears when preserve is on — and the store clears any
            attached objects on that toggle. Each object bills +1 credit
            (mirrored in useCreditCost). Plan-gated by allow_reference_image;
            unentitled taps route to the paywall like the strength slider. */}
        {(mode === "REDESIGN" || mode === "OUTDOOR" || mode === "EMPTY_ROOM")
          && !preserveLayout && (
          <View style={{
            paddingHorizontal: theme.space.gutter,
            marginTop: TILE_ROW_SPACING,
            marginBottom: TILE_ROW_SPACING,
          }}>
            {/* Top-aligned: only the empty tile carries a caption, so the
                thumbnails must hang from the same edge rather than centre
                themselves against a taller neighbour. */}
            <View className="flex-row" style={{ gap: 10, alignItems: "flex-start" }}>
              {objectRefs.map((ref) => (
                <View key={ref.fileId} style={{ position: "relative", width: TILE_SIZE, height: TILE_SIZE }}>
                  <View className="rounded-xl overflow-hidden" style={{ width: TILE_SIZE, height: TILE_SIZE }}>
                    <Image
                      source={{ uri: ref.uri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={200}
                    />
                  </View>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      removeObjectRef(ref.fileId);
                    }}
                    hitSlop={8}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: "rgba(19,19,19,0.92)",
                      borderWidth: 1,
                      borderColor: "rgba(225,195,155,0.30)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close" size={12} color="#F5F0EB" />
                  </Pressable>
                </View>
              ))}
              {objectRefs.length < 2 && (
                <Pressable onPress={handlePickObject} disabled={isObjectUploading}>
                  <View style={{ alignItems: "center", gap: 7 }}>
                    <View
                      className="rounded-xl items-center justify-center bg-surface-container-low"
                      style={{
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                        borderWidth: 1.5,
                        borderColor: "rgba(225,195,155,0.32)",
                        borderStyle: "dashed",
                        gap: 3,
                      }}
                    >
                      {isObjectUploading ? (
                        <ActivityIndicator size="small" color="#E1C39B" />
                      ) : referenceImageAllowed ? (
                        <>
                          <Ionicons name="bed-outline" size={22} color="#8C8378" />
                          <Ionicons name="add" size={14} color="#A79C8E" />
                        </>
                      ) : (
                        <Ionicons name="lock-closed-outline" size={18} color="#8C8378" />
                      )}
                    </View>
                    <Text
                      style={TILE_CAPTION}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {t("studio.add_furniture")}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Everything below is folded by default (P1-4). Each of these four
            controls already had the right default, so as a permanent wall
            they only slowed down the generation the user actually came for.
            The header carries their current values, so nothing is hidden. */}
        <AdvancedSettings
          open={advancedOpen}
          onToggle={() => setAdvancedOpen((v) => !v)}
          summary={advancedSummary}
        >
        <View style={{ paddingHorizontal: theme.space.gutter, gap: 16 }}>

          {/* AI Strength — gated by plan permission. Hidden for
              STYLE_TRANSFER: the reference screen already owns the
              influence percentage; a second slider here was a duplicate
              control for the same store value (2026-07 founder call). */}
          {mode !== "STYLE_TRANSFER" && (
          <Pressable
            onPress={() => {
              if (!strengthAllowed) router.push("/plans");
            }}
            disabled={strengthAllowed}
            style={{
              padding: 24,
              borderRadius: theme.radius.sm,
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
                    ...theme.text.caption,
                  }}
                >
                  {t("studio.strength")}
                </Text>
              </View>
              <Text
                className="font-headline"
                style={{
                  ...theme.text.title,
                  color: strengthAllowed ? "#E0C29A" : "#998F84",
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
              // Granularity is plan-tier aware. Paid tiers (PRO/MAX) get
              // 0.025 increments — 36 effective stops across 0.1–1.0 —
              // so the user can dial in subtle differences a designer
              // would catch (a 0.65→0.675 nudge changes a render's mood
              // noticeably on flux-1.1-pro-ultra). FREE/BASIC stay on
              // 0.05 (18 stops): the slider is gated `disabled` for
              // them anyway, so step value only matters defensively.
              step={strengthAllowed ? 0.025 : 0.05}
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
                style={{ ...theme.text.caption, color: "#998F84" }}
              >
                {t(`studio.strength_min_${mode.toLowerCase()}`, {
                  defaultValue: t("studio.strength_subtle"),
                })}
              </Text>
              <Text
                className="font-label"
                style={{ ...theme.text.caption, color: "#998F84" }}
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
                  ...theme.text.caption,
                  color: "#998F84",
                  marginTop: 14,
                  fontStyle: "italic",
                }}
              >
                {t("studio.strength_helper_generic")}
              </Text>
            )}
          </Pressable>
          )}
        </View>

        {/* Color Palette — Strength-card sibling.
            Re-housed inside the same panel chrome that wraps Transformation
            (#1C1B1B / radius 12 / padding 24) so the two adjacent controls
            read as one design language: header row (label + resolved value),
            primary affordance row (swatch / slider), helper paragraph.
            Tapping anywhere in the panel opens the palette picker sheet —
            larger touch target than the previous narrow trigger button. */}
        <View
          style={{
            marginTop: 48,
            marginHorizontal: 24,
          }}
        >
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setPaletteSheetOpen(true);
            }}
            style={({ pressed }) => ({
              padding: 24,
              borderRadius: theme.radius.sm,
              backgroundColor: "#1C1B1B",
              transform: [{ scale: pressed ? 0.995 : 1 }],
              // Subtle gold halo when a palette is active — mirrors the
              // selection idiom from the modal sheet rows without
              // overshooting into a "hero card".
              ...(selectedPaletteTheme && {
                shadowColor: "#E1C39B",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.18,
                shadowRadius: 6,
                elevation: 3,
              }),
            })}
          >
            {/* Header row — label left, resolved value right. Same shape
                as the Transformation card's "STRENGTH … 70%" header. */}
            <View
              className="flex-row items-center justify-between"
              style={{ marginBottom: 16 }}
            >
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  ...theme.text.caption,
                }}
              >
                {t("studio.color_palette")}
              </Text>
              <View
                className="flex-row items-center"
                style={{ gap: 6, maxWidth: "60%" }}
              >
                <Text
                  numberOfLines={1}
                  className="font-headline"
                  style={{
                    ...theme.text.title,
                    color: selectedPaletteTheme ? "#E0C29A" : "#998F84",
                  }}
                >
                  {selectedPaletteTheme
                    ? t(selectedPaletteTheme.labelKey)
                    : t("studio.palette_none")}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={selectedPaletteTheme ? "#E0C29A" : "#998F84"}
                />
              </View>
            </View>

            {/* Full-width gradient swatch — visual analogue of the
                Transformation slider track. Three-stop linear blend
                (0/50/100) reads the chosen mood from a glance; the
                dashed empty state mirrors how an unselected slider
                track would feel: present but inert. */}
            {selectedPaletteTheme ? (
              <LinearGradient
                colors={selectedPaletteTheme.colors as unknown as [string, string, string]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  height: 36,
                  width: "100%",
                  borderRadius: theme.radius.sm,
                  borderWidth: 1,
                  borderColor: "rgba(225,195,155,0.35)",
                }}
              />
            ) : (
              <View
                style={{
                  height: 36,
                  width: "100%",
                  borderRadius: theme.radius.sm,
                  borderWidth: 1,
                  borderColor: "rgba(77,70,60,0.4)",
                  borderStyle: "dashed",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                }}
              >
                <Ionicons name="color-palette-outline" size={14} color="#998F84" />
                <Text
                  className="font-label"
                  style={{ ...theme.text.caption, color: "#998F84" }}
                >
                  {t("studio.palette_placeholder")}
                </Text>
              </View>
            )}

            {/* Helper paragraph — same italic, same muted hue as the
                Transformation helper. Tells the user what the choice
                actually does so the empty state doesn't feel like a
                missing setting. */}
            <Text
              className="font-label"
              style={{
                ...theme.text.caption,
                fontStyle: "italic",
                color: "#998F84",
                marginTop: 12,
              }}
            >
              {t("studio.palette_helper")}
            </Text>
          </Pressable>
        </View>

        {/* Variants & Preserve Layout */}
        <View style={{ marginTop: 16, paddingHorizontal: theme.space.gutter, gap: 16 }}>
          {/* Variants Stepper */}
          <View
            className="flex-row items-center justify-between"
            style={{
              padding: 24,
              borderRadius: theme.radius.sm,
              backgroundColor: "#1C1B1B",
            }}
          >
            <Text
              className="font-label text-on-surface-variant"
              style={{
                ...theme.text.caption,
              }}
            >
              {t("studio.number_of_outputs")}
            </Text>
            {outputsLocked ? (
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <Ionicons name="lock-closed" size={13} color="#998F84" />
                <Text
                  className="font-headline text-on-surface"
                  style={{ ...theme.text.headline }}
                >
                  01
                </Text>
              </View>
            ) : (
            <View className="flex-row items-center" style={{ gap: 24 }}>
              <Pressable
                onPress={() => setNumOutputs(Math.max(1, numOutputs - 1))}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: theme.radius.md,
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
                style={{ ...theme.text.headline }}
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
                  borderRadius: theme.radius.md,
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
            )}
          </View>
          {outputsLocked && (
            <Text
              style={{
                ...theme.text.caption,
                color: "#998F84",
                paddingHorizontal: 4,
                marginTop: -6,
              }}
            >
              {t("studio.outputs_locked_style_transfer")}
            </Text>
          )}

          {/* Preserve Layout Toggle — only meaningful for REDESIGN mode.
              EMPTY_ROOM (emptying conflicts with "keep furniture" directive),
              INPAINT (masked edit is region-local), and STYLE_TRANSFER
              (reference image already defines aesthetic) don't combine with
              preserve_layout → disabled + helper text to avoid confusion. */}
          {(() => {
            const preserveLayoutApplicable = mode === "REDESIGN";
            // Founder rule (2026-08-03): a mode that never uses preserve must not
            // show the row AT ALL — a disabled toggle only confuses. Today only
            // REDESIGN offers preserve; if a future mode adopts it, extend
            // preserveLayoutApplicable and the row returns with the same rules.
            if (!preserveLayoutApplicable) return null;
            return (
              <View
                style={{
                  padding: 24,
                  borderRadius: theme.radius.sm,
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
                        ...theme.text.caption,
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
                      ...theme.text.caption,
                      color: "#998F84",
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
        </AdvancedSettings>

        {/* ── Custom Prompt — PARKED (founder call, 2026-08-07) ─────────
            Hidden from the UI, kept in source rather than deleted: the
            prompt pipeline still ACCEPTS `studioStore.prompt` end to end
            (JobServiceImpl → TemplateInputResolver), so this is a display
            decision, not a feature removal. Un-comment the block below to
            bring it back — no other file needs touching.

            Why it went: with the four advanced controls folded away, a
            second collapsible directly beneath them made Step 3 read as a
            screen full of drawers. The prompt is also the one control a
            first-time user is least equipped to use well.

            Store field, i18n keys (studio.custom_prompt*) and the backend
            path all stay live.

                    {/\* Material Narrative (Prompt) — collapsible. Hidden for INPAINT:
                        the mask screen already asks what belongs in the painted region,
                        and that writes this same store field (one owner per control,
                        same rule as STYLE_TRANSFER's influence slider). *\/}
                    {mode !== "INPAINT" && (
                    <View style={{ marginTop: 40, paddingHorizontal: theme.space.gutter }}>
                      <Pressable onPress={togglePromptOpen} accessibilityRole="button">
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: promptOpen ? 14 : 0,
                          }}
                        >
                          <Text
                            className="font-label"
                            style={{
                              ...theme.text.caption,
                              color: theme.color.goldMidday,
                            }}
                          >
                            {t("studio.custom_prompt")}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            {!promptOpen && prompt.trim().length > 0 && (
                              <View
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: theme.color.goldMidday,
                                }}
                              />
                            )}
                            <Ionicons
                              name={promptOpen ? "chevron-up" : "chevron-down"}
                              size={16}
                              color={theme.color.goldMidday}
                            />
                          </View>
                        </View>
                      </Pressable>
                      {!promptOpen && prompt.trim().length > 0 && (
                        <Text
                          numberOfLines={1}
                          style={{
                            ...theme.text.caption,
                            marginTop: 10,
                            color: "#998F84",
                          }}
                        >
                          {prompt.trim()}
                        </Text>
                      )}
                      {promptOpen && (
                      <>
                      {/\* Outer gold-bordered container *\/}
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
                              borderRadius: theme.radius.md,
                              borderWidth: 1,
                              borderColor: accentBorder,
                              backgroundColor: "rgba(14,13,12,0.60)",
                              padding: 16,
                              gap: 14,
                            }}
                          >
                            {/\* Inner label *\/}
                            <Text
                              style={{
                                ...theme.text.caption,
                                color: isActive
                                  ? "rgba(143,227,161,0.55)"
                                  : "rgba(225,195,155,0.45)",
                                fontStyle: "italic",
                              }}
                            >
                              {t("studio.custom_prompt_hint")}
                            </Text>

                            {/\* Selected chips strip — premium summary of active suggestions
                                with one-tap removal. Hidden until at least one is selected. *\/}
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
                                      borderRadius: theme.radius.pill,
                                      backgroundColor: "rgba(143,227,161,0.10)",
                                      borderWidth: 0.5,
                                      borderColor: "rgba(143,227,161,0.32)",
                                      opacity: pressed ? 0.65 : 1,
                                    })}
                                  >
                                    <Text
                                      style={{
                                        ...theme.text.caption,
                                        color: "#8FE3A1",
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

                            {/\* Full-width text input *\/}
                            <TextInput
                              className="font-body text-on-surface"
                              style={{
                                ...theme.text.body,
                                padding: 14,
                                textAlignVertical: "top",
                                minHeight: 92,
                                borderRadius: theme.radius.sm,
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

                            {/\* Suggestions accordion — full-width row, properly aligned
                                leading sparkle + label + trailing count badge + chevron. *\/}
                            {hasSuggestions && (
                              <View
                                style={{
                                  borderRadius: theme.radius.sm,
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
                                        ...theme.text.caption,
                                        flex: 1,
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
                                            ...theme.text.caption,
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
                                              ...theme.text.caption,
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
                                                    borderRadius: theme.radius.pill,
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
                                                      ...theme.text.caption,
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
                      </>
                      )}
                    </View>
                    )}
        ─────────────────────────────────────────────────────────── */}

        {/* Seed controls removed (2026-07): the backend omits `seed`
            entirely when unset (TemplateInputResolver only sends it if
            non-null), so Replicate randomizes every run — which is the
            behavior users actually want. Power-user seed pinning can
            return post-launch if data asks for it. */}

      </ScrollView>

      {/* Floating CTA — BottomBar handles the safe-area + tab-bar math so
          the Next button always sits a breathing-cushion above the blurred
          tab bar pill. */}
      {/* Generate lives here now (P2-8). The Review screen this used to lead
          to re-stated Style / Room / Quality / Outputs — choices the user had
          made seconds earlier on this very screen and the one before it — so
          it read as a confirmation of a confirmation. What Review genuinely
          carried is kept: the photo about to be sent, the resolved selections,
          and the price, all in the strip below the button. Every gate and the
          idempotency-key lifecycle moved into useGenerate() unchanged. */}
      <BottomBar overTabBar>
        <View style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 4,
            }}
          >
            {photo?.uri ? (
              <Image
                source={{ uri: photo.uri }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: theme.radius.sm,
                }}
                contentFit="cover"
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={{
                ...theme.text.caption,
                color: theme.color.onSurfaceMuted,
                flex: 1,
              }}
            >
              {generationSummary}
            </Text>
            <Text style={{ ...theme.text.subtitle, color: theme.color.goldMidday }}>
              {t("studio.cost_credits", { count: cost })}
            </Text>
          </View>
          <PrimaryButton
            label={t("studio.generate")}
            onPress={generate}
            disabled={isSubmitting}
            loading={isSubmitting}
          />
        </View>
      </BottomBar>

      {/* ─── Palette Picker Sheet ─────────────────────────────────────
          iOS pageSheet — same convention as the room-type / style
          pickers. Renders the curated 8 themes as a vertical list with
          larger swatches than the trigger row, plus a "None" option for
          users who want the model to pick its own palette. */}
      <Modal
        visible={paletteSheetOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPaletteSheetOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#131313" }}>
          {/* Sheet header — X left, title centered */}
          <View
            style={{
              height: 64,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: theme.space.gutter,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(77,70,60,0.15)",
            }}
          >
            <Pressable
              onPress={() => setPaletteSheetOpen(false)}
              hitSlop={12}
              style={{
                width: 36,
                height: 36,
                borderRadius: theme.radius.md,
                backgroundColor: "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
              }}
            >
              <Ionicons name="close" size={18} color="#E5E2E1" />
            </Pressable>
            <Text
              style={{
                ...theme.text.headline,
                position: "absolute",
                left: 0,
                right: 0,
                textAlign: "center",
                color: "#E5E2E1",
              }}
            >
              {t("studio.choose_palette")}
            </Text>
          </View>

          {/*
            Sheet rows are visual siblings of the trigger panel on the
            studio screen — same `#1C1B1B` chrome, header (label + check),
            full-width gradient swatch, and gold border on selection.
            That way the moment a user taps a row in the sheet, the
            trigger they came from updates with a swatch that's already
            been "previewed" at the same proportions. Premium continuity.
            "None" leads the list as an explicit escape hatch from a
            stale selection. */}

          {/* "None" / clear option */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setColorPalette("");
              setPaletteSheetOpen(false);
            }}
            style={({ pressed }) => ({
              marginTop: 16,
              marginHorizontal: 20,
              padding: 18,
              borderRadius: theme.radius.md,
              backgroundColor: "#1C1B1B",
              borderWidth: colorPalette === "" ? 1.5 : 1,
              borderColor:
                colorPalette === ""
                  ? "#E1C39B"
                  : "rgba(77,70,60,0.22)",
              transform: [{ scale: pressed ? 0.995 : 1 }],
              ...(colorPalette === "" && {
                shadowColor: "#E1C39B",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.22,
                shadowRadius: 7,
                elevation: 4,
              }),
            })}
          >
            <View
              className="flex-row items-center justify-between"
              style={{ marginBottom: 12 }}
            >
              <Text
                className="font-headline"
                style={{
                  ...theme.text.title,
                  color: colorPalette === "" ? "#E0C29A" : "#D0C5B8",
                }}
              >
                {t("studio.palette_none")}
              </Text>
              {colorPalette === "" ? (
                <Ionicons name="checkmark-circle" size={20} color="#E0C29A" />
              ) : null}
            </View>
            <View
              style={{
                height: 36,
                width: "100%",
                borderRadius: theme.radius.sm,
                borderWidth: 1,
                borderColor: "rgba(77,70,60,0.4)",
                borderStyle: "dashed",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Ionicons name="color-palette-outline" size={14} color="#998F84" />
              <Text
                className="font-label"
                style={{ ...theme.text.caption, color: "#998F84" }}
              >
                {t("studio.palette_placeholder")}
              </Text>
            </View>
          </Pressable>

          <FlatList
            data={PALETTE_THEMES}
            keyExtractor={(palette) => palette.id}
            contentContainerStyle={{
              paddingHorizontal: theme.space.gutter,
              paddingTop: 12,
              // The bar here stacks a summary strip on top of the button, so
              // it needs more clearance than a lone CTA would.
              paddingBottom: BOTTOM_BAR_SCROLL_PADDING(true, 120),
              gap: 12,
            }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: palette }) => {
              const encoded = encodePalette(palette.colors);
              const isSelected = colorPalette === encoded;
              return (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setColorPalette(encoded);
                    setPaletteSheetOpen(false);
                  }}
                  style={({ pressed }) => ({
                    padding: 18,
                    borderRadius: theme.radius.md,
                    backgroundColor: "#1C1B1B",
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected
                      ? "#E1C39B"
                      : "rgba(77,70,60,0.22)",
                    transform: [{ scale: pressed ? 0.995 : 1 }],
                    ...(isSelected && {
                      shadowColor: "#E1C39B",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.22,
                      shadowRadius: 7,
                      elevation: 4,
                    }),
                  })}
                >
                  <View
                    className="flex-row items-center justify-between"
                    style={{ marginBottom: 12 }}
                  >
                    <Text
                      numberOfLines={1}
                      className="font-headline"
                      style={{
                        ...theme.text.title,
                        flex: 1,
                        color: isSelected ? "#E0C29A" : "#D0C5B8",
                        marginRight: 12,
                      }}
                    >
                      {t(palette.labelKey)}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color="#E0C29A" />
                    ) : null}
                  </View>
                  <LinearGradient
                    colors={palette.colors as unknown as [string, string, string]}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{
                      height: 36,
                      width: "100%",
                      borderRadius: theme.radius.sm,
                      borderWidth: 1,
                      borderColor: "rgba(225,195,155,0.35)",
                    }}
                  />
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
