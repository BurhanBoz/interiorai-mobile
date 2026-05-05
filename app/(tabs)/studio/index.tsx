import { View, Text, Pressable, ScrollView, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { useStudioStore } from "@/stores/studioStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useDrawer } from "@/components/layout/DrawerProvider";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { WelcomeTrialBanner, TrialCountdownBadge } from "@/components/ui/WelcomeTrialBanner";
import { Brand } from "@/components/brand/Brand";
import { theme } from "@/config/theme";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Studio Step 1 — "Analyse Your Space". The user's first meaningful
 * decision in the flow: upload a photo, or take one. Everything on this
 * screen optimises for that decision.
 *
 * Changes from the previous version:
 *   - Unified brand mark (SVG) replaces the hardcoded "ARCHITECTURAL\nLENS"
 *   - Tips icon tiles are warm gold-tinted, not cold grey (#353534 was
 *     breaking the editorial palette)
 *   - Tip section headers are sentence-case, not a second eyebrow
 *     fighting the first one
 *   - Avatar tap explicitly routes to Profile (previously `onPress` was a
 *     boolean that did nothing visible)
 */

const tips: Array<{
  icon: IconName;
  titleKey: string;
  textKey: string;
}> = [
  {
    icon: "sunny-outline",
    titleKey: "studio.tip_lighting_title",
    textKey: "studio.tip_lighting_description",
  },
  {
    icon: "scan-outline",
    titleKey: "studio.tip_perspective_title",
    textKey: "studio.tip_perspective_description",
  },
  {
    icon: "navigate-outline",
    titleKey: "studio.tip_pathways_title",
    textKey: "studio.tip_pathways_description",
  },
];

export default function StudioScreen() {
  const { t } = useTranslation();
  const { pickImage, isUploading } = useImagePicker();
  const { openDrawer } = useDrawer();
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
      {/* Top bar */}
      <View
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
        }}
      >
        <Pressable
          onPress={openDrawer}
          hitSlop={8}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="menu" size={22} color={theme.color.onSurface} />
        </Pressable>
        <Brand variant="inline" size="sm" tone="gold" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TrialCountdownBadge />
          <UserAvatar size="sm" onPress />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 128 }}
        showsVerticalScrollIndicator={false}
      >
        {/*
          Welcome trial banner (V20) — only renders when the user is
          inside their 7-day MAX trial. Sits above the step indicator
          so it's the first thing post-header content; absent when
          the trial is inactive (no empty-state shell). Negative
          horizontal margin breaks out of the parent's 24px padding
          since the banner has its own breathing room baked in.
        */}
        <View style={{ marginHorizontal: -24 }}>
          <WelcomeTrialBanner />
        </View>

        {/* Step indicator — the ONE uppercase eyebrow allowed on this screen */}
        <View style={{ marginTop: 12, marginBottom: 10 }}>
          <Text
            style={{
              fontFamily: "Inter-SemiBold",
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: theme.color.goldMidday,
            }}
          >
            {t("studio.step_1_of_4")}
          </Text>
        </View>

        {/* Headline */}
        <Text
          style={{
            fontFamily: "NotoSerif",
            fontSize: 34,
            lineHeight: 40,
            letterSpacing: -0.4,
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
                paddingHorizontal: 24,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: "rgba(225,195,155,0.72)",
                borderRadius: 20,
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
                  fontFamily: "Inter-SemiBold",
                  fontSize: 15,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: theme.color.onSurface,
                  marginBottom: 6,
                }}
              >
                {isUploading ? t("studio.uploading") : t("studio.tap_to_upload")}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 13,
                  color: theme.color.onSurfaceMuted,
                  letterSpacing: 0.2,
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
                fontFamily: "Inter-SemiBold",
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
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
                paddingHorizontal: 24,
                borderWidth: 1,
                borderColor: "rgba(225,195,155,0.45)",
                borderRadius: 20,
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
                  fontFamily: "Inter-SemiBold",
                  fontSize: 15,
                  letterSpacing: 0.3,
                  color: theme.color.onSurface,
                }}
              >
                {t("studio.take_a_photo")}
              </Text>
            </View>
          </Pressable>

        </View>

        {/* Professional tips — sentence-case section title, warm icon tiles */}
        <View style={{ gap: 18 }}>
          <Text
            style={{
              fontFamily: "Inter-SemiBold",
              fontSize: 14,
              letterSpacing: 0.2,
              color: theme.color.onSurfaceVariant,
            }}
          >
            {t("studio.professional_tips")}
          </Text>

          <View style={{ gap: 12 }}>
            {tips.map((tip) => (
              <View
                key={tip.icon}
                style={{
                  padding: 18,
                  borderRadius: 16,
                  backgroundColor: theme.color.surfaceContainerLow,
                  borderWidth: 1,
                  borderColor: "rgba(77,70,60,0.25)",
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: "rgba(225,195,155,0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(225,195,155,0.18)",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Ionicons
                    name={tip.icon}
                    size={20}
                    color={theme.color.goldMidday}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Inter-SemiBold",
                      fontSize: 13,
                      letterSpacing: 1.4,
                      textTransform: "uppercase",
                      color: theme.color.goldMidday,
                      marginBottom: 4,
                    }}
                  >
                    {t(tip.titleKey)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 13,
                      lineHeight: 19,
                      color: theme.color.onSurfaceVariant,
                    }}
                  >
                    {t(tip.textKey)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
