import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useStudioStore } from "@/stores/studioStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useCreditCost } from "@/hooks/useCreditCost";
import { UserAvatar } from "@/components/ui/UserAvatar";
import Slider from "@react-native-community/slider";

// Height of the global GlassNavBar (icon row + label + home-indicator pad).
// Sticky wizard footers must sit above this so the CTA stays tappable.
const TAB_BAR_HEIGHT = 96;

// Fallback hero when the user lands here without a source photo (e.g. via
// deep link). Editorial interior shot, matches the dark-luxe aesthetic.
const PLACEHOLDER_ROOM =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDY-BQvBeDvm_wjubZLoxxq_fdlB5DKLCs169xupU4TBlveZuXhYoh8b2cOxE9_z84iGFq8qjXZc-c896-Aciya2jHbgH7Psc7YEK26HW7MMJMiUfHeZBwmR7GV-bRLJ8_vkNjbLHLonBtC8eFH0GoGOpKUkNebi4AJqLpCVbwKo1OB-ahMCRo2YHyno3Fm4MlQmMuSvzu_wEyG8nzEZ7jJu-GPQZtnXXZ74fzGjvo45HHVaF3amPj6cKSibyrOMLFCxCMjicmhr_g";

// Label-only mapping. The product calls ULTRA_HD "4K" in the UI — the
// underlying enum stays the same.
const QUALITY_DISPLAY: Record<string, string> = {
  STANDARD: "Standard",
  HD: "HD",
  ULTRA_HD: "4K",
};

export default function StyleTransferScreen() {
  const { t } = useTranslation();
  const photo = useStudioStore(s => s.photo);
  const referencePhoto = useStudioStore(s => s.referencePhoto);
  const strength = useStudioStore(s => s.strength);
  const qualityTier = useStudioStore(s => s.qualityTier);
  const numOutputs = useStudioStore(s => s.numOutputs);
  const setStrength = useStudioStore(s => s.setStrength);
  const setReferencePhoto = useStudioStore(s => s.setReferencePhoto);
  const { cost } = useCreditCost();
  const { pickImage } = useImagePicker();
  const subscription = useSubscriptionStore(s => s.subscription);
  const planLabel = subscription?.planName ?? "Max";

  const roomImage = photo?.uri ?? PLACEHOLDER_ROOM;
  const strengthPercent = Math.round(strength * 100);

  const handlePickReference = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await pickImage();
    if (result) {
      setReferencePhoto({ uri: result.uri, fileId: result.fileId ?? "" });
    }
  };

  // A reference image is mandatory for Style Transfer — without it the
  // backend has no "target style" to apply and the render collapses to
  // a plain redesign. Gate the Next CTA until one is uploaded.
  const canProceed = !!referencePhoto?.fileId;

  const handleNext = () => {
    if (!canProceed) return;
    Haptics.selectionAsync();
    router.push("/studio/review");
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* Top App Bar — back chevron mirrors options.tsx so the wizard
          navigation contract is consistent: left = go back one step,
          right = profile. Drawer stays reachable from the main tabs. */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center" style={{ gap: 12 }}>
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
            className="font-headline text-on-surface"
            style={{
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Roomframe AI
          </Text>
        </View>
        <UserAvatar size="sm" onPress />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          // Footer (~120px) sits at bottom: TAB_BAR_HEIGHT (96px). Add a
          // 60px buffer on top of those so the last visible content is
          // never hidden behind the glass bar.
          paddingBottom: TAB_BAR_HEIGHT + 120 + 40,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Badge & Header */}
        <View style={{ marginBottom: 48 }}>
          <View
            className="flex-row items-center mb-6"
            style={{ gap: 12, marginTop: 8 }}
          >
            <View
              className="rounded-full px-3"
              style={{
                paddingVertical: 4,
                backgroundColor: "#584325",
              }}
            >
              <Text
                className="font-label"
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "#FEDFB5",
                }}
              >
                {t("studio.mode_style_transfer")}
              </Text>
            </View>
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 10,
                fontWeight: "500",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {planLabel}
            </Text>
          </View>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 36, lineHeight: 42 }}
          >
            {t("studio.style_transfer_headline")}
          </Text>
        </View>

        {/* Image Pair — Your Room & Ref Style */}
        <View className="flex-row" style={{ gap: 16, marginBottom: 48 }}>
          {/* Your Room */}
          <View style={{ flex: 1, gap: 16 }}>
            <View className="flex-row items-end justify-between">
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {t("studio.style_transfer_subject_label")}
              </Text>
              <Text
                className="font-label"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#998F84",
                }}
              >
                {t("studio.style_transfer_subject_badge")}
              </Text>
            </View>
            <View
              className="rounded-xl overflow-hidden bg-surface-container-low"
              style={{ aspectRatio: 4 / 5 }}
            >
              <Image
                source={{ uri: roomImage }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={300}
              />
              <View
                className="absolute inset-0"
                style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
                pointerEvents="none"
              />
            </View>
          </View>

          {/* Ref. Style */}
          <View style={{ flex: 1, gap: 16 }}>
            <View className="flex-row items-end justify-between">
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {t("studio.style_transfer_reference_label")}
              </Text>
              <Text
                className="font-label"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#FEDFB5",
                }}
              >
                {t("studio.style_transfer_reference_badge")}
              </Text>
            </View>
            {referencePhoto?.uri ? (
              <View style={{ position: "relative" }}>
                <Pressable onPress={handlePickReference}>
                  <View
                    className="rounded-xl overflow-hidden"
                    style={{ aspectRatio: 4 / 5 }}
                  >
                    <Image
                      source={{ uri: referencePhoto.uri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={300}
                    />
                  </View>
                </Pressable>
                {/* Remove reference photo */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setReferencePhoto(null);
                  }}
                  hitSlop={8}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "rgba(19,19,19,0.80)",
                    borderWidth: 1,
                    borderColor: "rgba(225,195,155,0.30)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={15} color="#F5F0EB" />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={handlePickReference}>
                <View
                  className="rounded-xl items-center justify-center bg-surface-container-low"
                  style={{
                    aspectRatio: 4 / 5,
                    borderWidth: 1.5,
                    borderColor: "rgba(225,195,155,0.55)",
                    borderStyle: "dashed",
                  }}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={36}
                    color="#998F84"
                    style={{ marginBottom: 16 }}
                  />
                  <Text
                    className="font-label"
                    style={{
                      fontSize: 11,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: "#998F84",
                    }}
                  >
                    {t("studio.upload_reference")}
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>

        {/* Influence Strength Slider */}
        <View style={{ marginBottom: 32 }}>
          <View className="flex-row items-center justify-between mb-6">
            <Text
              className="font-label text-on-surface"
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {t("studio.strength")}
            </Text>
            <Text
              className="font-headline text-primary"
              style={{
                fontSize: 24,
                letterSpacing: -0.5,
                fontStyle: "italic",
              }}
            >
              {strengthPercent}%
            </Text>
          </View>

          {/* Native slider — matches options.tsx pattern (0.1–1.0 range,
              0.05 step). Previous dual-layer custom slider dropped taps
              because the invisible overlay was offset from the visible
              track; a single native slider both draws and captures. */}
          <Slider
            style={{ width: "100%", height: 36 }}
            minimumValue={0.1}
            maximumValue={1.0}
            step={0.05}
            value={strength}
            onValueChange={setStrength}
            onSlidingStart={() => Haptics.selectionAsync()}
            minimumTrackTintColor="#E1C39B"
            maximumTrackTintColor="#353534"
            thumbTintColor="#FDDEB4"
          />

          <Text
            className="font-label"
            style={{
              fontSize: 11,
              letterSpacing: 0.8,
              fontStyle: "italic",
              lineHeight: 18,
              color: "#998F84",
              marginTop: 8,
            }}
          >
            {t("studio.style_transfer_strength_hint")}
          </Text>
        </View>

        {/* Quality & Variants */}
        <View className="flex-row" style={{ gap: 16, marginBottom: 48 }}>
          <View
            className="flex-1 rounded-xl p-6 bg-surface-container-low"
            style={{ gap: 8 }}
          >
            <Text
              className="font-label"
              style={{
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#998F84",
              }}
            >
              {t("result.quality")}
            </Text>
            <Text
              className="font-headline text-on-surface"
              style={{ fontSize: 20 }}
            >
              {QUALITY_DISPLAY[qualityTier] ?? qualityTier}
            </Text>
          </View>
          <View
            className="flex-1 rounded-xl p-6 bg-surface-container-low"
            style={{ gap: 8 }}
          >
            <Text
              className="font-label"
              style={{
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#998F84",
              }}
            >
              {t("studio.number_of_outputs")}
            </Text>
            <Text
              className="font-headline text-on-surface"
              style={{ fontSize: 20 }}
            >
              {String(numOutputs).padStart(2, "0")}
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* Sticky Footer — sits ABOVE the GlassNavBar so the CTA is always
          tappable. A blurred glass surface mirrors the navbar aesthetic
          (BlurView intensity 55, dark tint) and a faint top-edge gradient
          fades scrolling content into the bar without a hard line. */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: TAB_BAR_HEIGHT,
        }}
      >
        {/* Edge fade — content disappears into the glass instead of
            colliding with the border. Sits ABOVE the BlurView, no taps. */}
        <LinearGradient
          colors={["transparent", "rgba(19,19,19,0.85)"]}
          style={{ height: 32 }}
          pointerEvents="none"
        />

        <BlurView
          intensity={55}
          tint="dark"
          style={{
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 18,
            backgroundColor: "rgba(19,19,19,0.55)",
            borderTopWidth: 1,
            borderTopColor: "rgba(225,195,155,0.18)",
          }}
        >
          {/* Cost row — micro-summary, doesn't crowd the CTA */}
          <View
            className="flex-row items-center justify-between"
            style={{ marginBottom: 12 }}
          >
            <Text
              className="font-label"
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#998F84",
                fontWeight: "600",
              }}
            >
              {t("studio.style_transfer_cost_label")}
            </Text>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Ionicons name="flash" size={13} color="#FEDFB5" />
              <Text
                className="font-headline"
                style={{
                  fontSize: 17,
                  fontStyle: "italic",
                  letterSpacing: -0.3,
                  color: "#E5E2E1",
                }}
              >
                {t("studio.cost_credits", { count: cost })}
              </Text>
            </View>
          </View>

          {/* CTA Button */}
          <Pressable
            onPress={handleNext}
            disabled={!canProceed}
            style={({ pressed }) => ({
              transform: [{ scale: pressed && canProceed ? 0.98 : 1 }],
              opacity: canProceed ? 1 : 0.55,
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
                height: 54,
                borderRadius: 14,
                paddingHorizontal: 22,
                borderWidth: 1,
                borderColor: "rgba(254,223,181,0.35)",
                shadowColor: "#C4A882",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  letterSpacing: 1.8,
                  textTransform: "uppercase",
                  color: "#3F2D11",
                }}
              >
                {canProceed
                  ? t("studio.next_review")
                  : t("studio.upload_reference_first")}
              </Text>
              <Ionicons
                name={canProceed ? "arrow-forward" : "cloud-upload-outline"}
                size={20}
                color="#3F2D11"
              />
            </LinearGradient>
          </Pressable>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}
