import { View, Text, Pressable, ScrollView, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { useStudioStore } from "@/stores/studioStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { AvatarMenu } from "@/components/ui/AvatarMenu";
import { Brand } from "@/components/brand/Brand";
import { BOTTOM_BAR_SCROLL_PADDING } from "@/components/layout/BottomBar";
import { theme } from "@/config/theme";

/**
 * Studio Step 1 — "Analyse Your Space" (photo capture).
 *
 * <p>2026-07 IA rework: the studio HOME now lists the generation flows as
 * feature cards, and the chosen flow routes here to pick the photo. The
 * upload UI itself moved from studio/index.tsx unchanged — dashed primary
 * upload card, OR divider, camera secondary, breathing glyph.
 *
 * <p>Every flow continues to /studio/uploaded after the photo lands; the
 * wizard chain (uploaded → style → options → review) is mode-agnostic, and
 * review's INPAINT/STYLE_TRANSFER guards route to the mask / reference
 * steps at the right moment.
 */
export default function UploadScreen() {
  const { t } = useTranslation();
  const { pickImage, isUploading } = useImagePicker();
  const setPhoto = useStudioStore((s) => s.setPhoto);

  const handleUpload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await pickImage("gallery");
    if (result) {
      setPhoto(result);
      router.push("/studio/uploaded");
    }
  };

  const handleCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await pickImage("camera");
    if (result) {
      setPhoto(result);
      router.push("/studio/uploaded");
    }
  };

  // Breathing animation on the idle upload glyph — a quiet "this is alive"
  // cue. Stopped on unmount so the app doesn't keep animating in the
  // background.
  const uploadPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(uploadPulse, {
          toValue: 0.55,
          duration: 1800,
          easing: theme.motion.easing.standard,
          useNativeDriver: true,
        }),
        Animated.timing(uploadPulse, {
          toValue: 1,
          duration: 1800,
          easing: theme.motion.easing.standard,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [uploadPulse]);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: theme.color.surface }}>
      {/* Top bar — back to the studio feature list */}
      <View
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: theme.space.gutter,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("common.back", { defaultValue: "Back" })}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.color.onSurface} />
        </Pressable>
        <Brand variant="inline" size="sm" tone="gold" />
        <AvatarMenu />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: theme.space.gutter,
          // Step 1's CTA scrolls with the content rather than floating, so it
          // needs the same clearance a BottomBar would have reserved —
          // otherwise it ends up welded to the tab bar (founder screenshot,
          // 2026-08-07). Shared helper, so the four wizard steps stay in step.
          paddingBottom: BOTTOM_BAR_SCROLL_PADDING(true),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Vertically centered cluster — same as the pre-rework studio home */}
        <View style={{ flex: 1, justifyContent: "center" }}>
          {/* Step indicator — the ONE uppercase eyebrow allowed on this screen */}
          <View style={{ marginTop: 12, marginBottom: 10 }}>
            <Text
              style={{
                ...theme.text.label,
                color: theme.color.goldMidday,
              }}
            >
              {t("studio.step_1_of_4")}
            </Text>
          </View>

          {/* Headline */}
          <Text
            style={{
              ...theme.text.display,
              color: theme.color.onSurface,
              marginBottom: 36,
            }}
          >
            {t("studio.step1_title")}
          </Text>

          {/* Two bordered action cards separated by an "OR" divider.
              Upload = primary (dashed, taller, centered column).
              Camera = secondary (solid, row layout). Layout lives in
              inner Views so Pressable callbacks only handle interaction
              styles (scale / opacity / background). */}
          <View style={{ width: "100%", marginBottom: 40 }}>
            {/* ── Primary: gallery upload ── */}
            <Pressable
              onPress={handleUpload}
              disabled={isUploading}
              accessibilityRole="button"
              accessibilityLabel={t("studio.tap_to_upload")}
              style={({ pressed }) => ({
                opacity: isUploading ? 0.55 : pressed ? 0.82 : 1,
                transform: [{ scale: pressed ? 0.975 : 1 }],
              })}
            >
              <View
                style={{
                  width: "100%",
                  paddingVertical: 36,
                  paddingHorizontal: theme.space.gutter,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: "rgba(225,195,155,0.72)",
                  borderRadius: theme.radius.lg,
                  backgroundColor: "rgba(225,195,155,0.05)",
                  alignItems: "center",
                  ...theme.elevation.goldGlowSoft,
                }}
              >
                <Animated.View style={{ opacity: uploadPulse, marginBottom: 16 }}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={40}
                    color={theme.color.goldMidday}
                  />
                </Animated.View>
                <Text
                  style={{
                    ...theme.text.caption,
                    color: theme.color.onSurface,
                    marginBottom: 6,
                  }}
                >
                  {isUploading ? t("studio.uploading") : t("studio.tap_to_upload")}
                </Text>
                <Text
                  style={{
                    ...theme.text.body,
                    color: theme.color.onSurfaceMuted,
                  }}
                >
                  JPEG · HEIC · PNG
                </Text>
              </View>
            </Pressable>

            {/* ── OR divider ── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                marginVertical: 16,
                paddingHorizontal: 4,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(77,70,60,0.35)" }} />
              <Text
                style={{
                  ...theme.text.caption,
                  color: theme.color.onSurfaceMuted,
                }}
              >
                {t("common.or")}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(77,70,60,0.35)" }} />
            </View>

            {/* ── Secondary: camera ── */}
            <Pressable
              onPress={handleCamera}
              disabled={isUploading}
              accessibilityRole="button"
              accessibilityLabel={t("studio.take_a_photo")}
              style={({ pressed }) => ({
                opacity: isUploading ? 0.35 : pressed ? 0.72 : 1,
                transform: [{ scale: pressed ? 0.975 : 1 }],
              })}
            >
              <View
                style={{
                  width: "100%",
                  paddingVertical: 22,
                  paddingHorizontal: theme.space.gutter,
                  borderWidth: 1,
                  borderColor: "rgba(225,195,155,0.45)",
                  borderRadius: theme.radius.lg,
                  backgroundColor: "rgba(225,195,155,0.03)",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <Ionicons
                  name="camera-outline"
                  size={24}
                  color={theme.color.goldMidday}
                />
                <Text
                  style={{
                    ...theme.text.subtitle,
                    color: theme.color.onSurface,
                  }}
                >
                  {t("studio.take_a_photo")}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
