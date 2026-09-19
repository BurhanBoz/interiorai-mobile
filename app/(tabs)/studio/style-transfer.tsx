import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { theme } from "@/config/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useStudioStore } from "@/stores/studioStore";
import { TAB_BAR_HEIGHT } from "@/components/layout/GlassNavBar";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useCreditCost } from "@/hooks/useCreditCost";
import { AvatarMenu } from "@/components/ui/AvatarMenu";
import Slider from "@react-native-community/slider";

// Height of the global GlassNavBar (icon row + label + home-indicator pad).
// Sticky wizard footers must sit above this so the CTA stays tappable.

// Fallback hero when the user lands here without a source photo (e.g. via
// deep link). Editorial interior shot, matches the dark-luxe aesthetic.
const PLACEHOLDER_ROOM =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDY-BQvBeDvm_wjubZLoxxq_fdlB5DKLCs169xupU4TBlveZuXhYoh8b2cOxE9_z84iGFq8qjXZc-c896-Aciya2jHbgH7Psc7YEK26HW7MMJMiUfHeZBwmR7GV-bRLJ8_vkNjbLHLonBtC8eFH0GoGOpKUkNebi4AJqLpCVbwKo1OB-ahMCRo2YHyno3Fm4MlQmMuSvzu_wEyG8nzEZ7jJu-GPQZtnXXZ74fzGjvo45HHVaF3amPj6cKSibyrOMLFCxCMjicmhr_g";

// Label-only mapping. The product calls ULTRA_HD "4K" in the UI — the
// underlying enum stays the same.
export default function StyleTransferScreen() {
  const { t } = useTranslation();
  const photo = useStudioStore(s => s.photo);
  const referencePhoto = useStudioStore(s => s.referencePhoto);
  const extraStyleRefs = useStudioStore(s => s.extraStyleRefs);
  const addExtraStyleRef = useStudioStore(s => s.addExtraStyleRef);
  const removeExtraStyleRef = useStudioStore(s => s.removeExtraStyleRef);
  const strength = useStudioStore(s => s.strength);
  const setStrength = useStudioStore(s => s.setStrength);
  const setReferencePhoto = useStudioStore(s => s.setReferencePhoto);
  const { cost } = useCreditCost();
  const { pickImage, isUploading } = useImagePicker();
  const subscription = useSubscriptionStore(s => s.subscription);
  const planLabel = subscription?.planName ?? "Max";

  const roomImage = photo?.uri ?? PLACEHOLDER_ROOM;
  const strengthPercent = Math.round(strength * 100);

  const handlePickReference = async () => {
    if (isUploading) return; // one in-flight upload at a time
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await pickImage();
    if (result) {
      setReferencePhoto({ uri: result.uri, fileId: result.fileId ?? "" });
    }
  };

  // IO-2 — extra style reference for the "+" tile (max 2, store-capped;
  // each bills +1 credit, mirrored in useCreditCost).
  const handlePickExtraRef = async () => {
    if (isUploading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await pickImage();
    if (result?.fileId) {
      addExtraStyleRef({ uri: result.uri, fileId: result.fileId });
    }
  };

  // A reference image is mandatory for Style Transfer — without it the
  // backend has no "target style" to apply and the render collapses to
  // a plain redesign. Gate the Next CTA until one is uploaded.
  const canProceed = !!referencePhoto?.fileId;

  // wizard=1 → entered right after photo upload (2026-07 IA rework):
  // continue the shared chain (style → options). Otherwise this screen was
  // opened from Options to (re)pick the reference, so go back there —
  // Options owns Generate since the Review step was folded into it (P2-8).
  const { wizard } = useLocalSearchParams<{ wizard?: string }>();
  const handleNext = () => {
    if (!canProceed) return;
    Haptics.selectionAsync();
    // The reference is collected here; the decision and the charge happen in
    // the composer, which owns the only statement of cost in the app. This
    // used to land on the old "Step 3 / 3" options screen.
    router.replace("/studio/composer" as never);
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: theme.umber.ground }}>
      {/* Composer-language header: 34px back, a kicker naming the mode, a
          matching spacer. No step counter — this is one collection step, not
          a numbered stage of a wizard. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 18,
          paddingTop: 8,
          paddingBottom: 14,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: theme.umber.lineNeutral,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: theme.umber.ink, fontSize: 18, lineHeight: 20 }}>‹</Text>
        </Pressable>
        <Text
          style={{ ...theme.v2.kicker, color: theme.umber.inkMuted, flex: 1, textAlign: "center" }}
        >
          {t("studio.mode_style_transfer").toUpperCase()}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: theme.space.gutter,
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
                  ...theme.text.caption,
                  color: "#FEDFB5",
                }}
              >
                {t("studio.mode_style_transfer")}
              </Text>
            </View>
            <Text
              className="font-label text-on-surface-variant"
              style={{
                ...theme.text.label,
              }}
            >
              {planLabel}
            </Text>
          </View>
          <Text
            className="font-headline text-on-surface"
            style={{ ...theme.text.display }}
          >
            {t("studio.style_transfer_headline")}
          </Text>
        </View>

        {/* Image Pair — Your Room & Ref Style */}
        <View className="flex-row" style={{ gap: 16, marginBottom: 48 }}>
          {/* Your Room */}
          <View style={{ flex: 1, gap: 16 }}>
            <Text
              className="font-label text-on-surface-variant"
              style={{
                ...theme.text.caption,
                textAlign: "center",
              }}
            >
              {t("studio.style_transfer_subject_label")}
            </Text>
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
            <Text
              className="font-label text-on-surface-variant"
              style={{
                ...theme.text.caption,
                textAlign: "center",
              }}
            >
              {t("studio.style_transfer_reference_label")}
            </Text>
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
                    borderRadius: theme.radius.md,
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
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#DDB477" style={{ marginBottom: 16 }} />
                  ) : (
                    <Ionicons
                      name="cloud-upload-outline"
                      size={36}
                      color="#9A8F7D"
                      style={{ marginBottom: 16 }}
                    />
                  )}
                  <Text
                    className="font-label"
                    style={{
                      ...theme.text.caption,
                      color: isUploading ? "#DDB477" : "#9A8F7D",
                    }}
                  >
                    {isUploading
                      ? t("studio.uploading")
                      : t("studio.upload_reference")}
                  </Text>
                </View>
              </Pressable>
            )}

            {/* IO-2 — extra style reference "+" tiles (max 2, +1 credit each).
                Only offered once the primary reference exists: the extras are
                "more of the same aesthetic", not a substitute for it. */}
            {referencePhoto?.uri ? (
              <View style={{ marginTop: 16 }}>
                {/* Top-aligned so the captioned empty tile doesn't push the
                    thumbnails off the shared edge. */}
                <View className="flex-row" style={{ gap: 10, alignItems: "flex-start" }}>
                  {extraStyleRefs.map((ref) => (
                    <View key={ref.fileId} style={{ position: "relative", width: 76, height: 76 }}>
                      <View className="rounded-xl overflow-hidden" style={{ width: 76, height: 76 }}>
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
                          removeExtraStyleRef(ref.fileId);
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
                  {extraStyleRefs.length < 2 ? (
                    <Pressable onPress={handlePickExtraRef} disabled={isUploading}>
                      <View style={{ alignItems: "center", gap: 7 }}>
                        <View
                          className="rounded-xl items-center justify-center bg-surface-container-low"
                          style={{
                            width: 76,
                            height: 76,
                            borderWidth: 1.5,
                            borderColor: "rgba(225,195,155,0.32)",
                            borderStyle: "dashed",
                            gap: 3,
                          }}
                        >
                          {isUploading ? (
                            <ActivityIndicator size="small" color="#DDB477" />
                          ) : (
                            <>
                              <Ionicons name="images-outline" size={22} color="#8C8378" />
                              <Ionicons name="add" size={14} color="#A79C8E" />
                            </>
                          )}
                        </View>
                        <Text
                          style={{
                            fontFamily: "Inter",
                            fontSize: 10,
                            lineHeight: 13,
                            letterSpacing: 0.2,
                            textAlign: "center",
                            color: "#8C8378",
                            width: 76,
                          }}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          {t("studio.add_reference")}
                        </Text>
                      </View>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* The influence slider came off (2026-09-19). It is the same
            `strength` value the composer's Advanced sheet already owns, and
            two controls writing one field is how they drift — the user sets
            70% here, opens Advanced, and reads 50% because that screen last
            wrote it. One owner, on the screen that also states the cost. */}

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
            paddingHorizontal: theme.space.gutter,
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
                ...theme.text.caption,
                color: "#9A8F7D",
              }}
            >
              {t("studio.style_transfer_cost_label")}
            </Text>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Ionicons name="flash" size={13} color="#FEDFB5" />
              <Text
                className="font-headline"
                style={{
                  ...theme.text.title,
                  fontStyle: "italic",
                  color: "#F6F1E7",
                }}
              >
                {t("studio.cost_credits", { count: cost })}
              </Text>
            </View>
          </View>

          {/* CTA Button */}
          <Pressable
            onPress={handleNext}
            disabled={!canProceed || isUploading}
            style={({ pressed }) => ({
              transform: [{ scale: pressed && canProceed ? 0.98 : 1 }],
              opacity: canProceed ? 1 : 0.55,
            })}
          >
            <LinearGradient
              colors={["#DDB477", "#C09B62"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                height: 54,
                borderRadius: theme.radius.md,
                paddingHorizontal: 22,
                borderWidth: 1,
                borderColor: "rgba(254,223,181,0.35)",
                shadowColor: "#DDB477",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  ...theme.text.caption,
                  color: "#231B10",
                }}
              >
                {canProceed
                  ? t("studio.next_review")
                  : t("studio.upload_reference_first")}
              </Text>
              <Ionicons
                name={canProceed ? "arrow-forward" : "cloud-upload-outline"}
                size={20}
                color="#231B10"
              />
            </LinearGradient>
          </Pressable>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}
