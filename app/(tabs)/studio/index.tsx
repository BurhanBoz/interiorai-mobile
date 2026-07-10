import { View, Text, Pressable, ScrollView, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { useStudioStore } from "@/stores/studioStore";
import { useDismissible } from "@/hooks/useDismissible";
import { useEffectivePlanCode } from "@/hooks/useEntitlement";
import { AvatarMenu } from "@/components/ui/AvatarMenu";
import { WelcomeTrialBanner, TrialCountdownBadge } from "@/components/ui/WelcomeTrialBanner";
import { Brand } from "@/components/brand/Brand";
import { FeatureCard } from "@/components/studio/FeatureCard";
import { STUDIO_FEATURES, isFeatureLocked } from "@/components/studio/featureCatalog";
import type { StudioFeature } from "@/components/studio/featureCatalog";
import { theme } from "@/config/theme";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Studio home — the flow picker (2026-07 IA rework).
 *
 * <p>The user chooses WHAT to do first (Redesign / Empty Room / Smart Edit
 * / Style Transfer as rich feature cards with live before/after teasers),
 * THEN uploads the photo (/studio/upload). Mode lands in the store here,
 * and the wizard chain (uploaded → style → options → review) stays fully
 * mode-agnostic — review's INPAINT/STYLE_TRANSFER guards pull the user
 * into the mask / reference steps exactly when they're needed.
 *
 * <p>Locked features (plan-gated) still show — tapping routes to /plans
 * (conversion surface), mirroring options.tsx chip behavior.
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
  // First-visit intro (2026-07 review round 2): the trial banner + tips form
  // ONE spotlight moment floating over a blurred, dimmed backdrop. ANY exit —
  // either X, a tap outside the cards, or leaving the screen — dismisses BOTH
  // permanently, revealing the feature list behind.
  const [introVisible, markIntroSeen] = useDismissible("studio_intro_seen");
  const introVisibleRef = useRef(false);
  introVisibleRef.current = introVisible;

  const introAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (introVisible) {
      Animated.timing(introAnim, {
        toValue: 1,
        duration: 520,
        easing: theme.motion.easing.standard,
        useNativeDriver: true,
      }).start();
    }
  }, [introVisible, introAnim]);

  /** Any explicit exit (either X, backdrop tap): fade the spotlight out,
      then persist "seen" so it never returns. */
  const dismissingRef = useRef(false);
  const dismissIntro = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    Animated.timing(introAnim, {
      toValue: 0,
      duration: 220,
      easing: theme.motion.easing.standard,
      useNativeDriver: true,
    }).start(() => markIntroSeen());
  }, [introAnim, markIntroSeen]);

  // Leaving the screen while the intro is up also counts as "seen" — next
  // visit opens clean.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (introVisibleRef.current) markIntroSeen();
      };
    }, [markIntroSeen]),
  );

  const { t } = useTranslation();
  const setMode = useStudioStore((s) => s.setMode);

  // Coming back to the tab always opens at the top (2026-07 finding:
  // a stale scroll position made the home feel "stuck mid-list").
  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );
  const planCode = useEffectivePlanCode();

  const handleFeaturePress = (feature: StudioFeature, locked: boolean) => {
    Haptics.selectionAsync();
    if (locked) {
      // Same conversion route as options.tsx locked chips.
      router.push("/plans");
      return;
    }
    setMode(feature.key);
    router.push("/studio/upload");
  };

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
        {/* Spacer keeps the brand centered — the hamburger is retired
            (2026-07 round 2: drawer removed, tab bar is sole navigation). */}
        <View style={{ width: 40 }} />
        <Brand variant="inline" size="sm" tone="gold" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TrialCountdownBadge />
          <AvatarMenu />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 128 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Eyebrow + headline — centered welcome */}
        <View style={{ marginTop: 12, marginBottom: 10, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: "Inter-SemiBold",
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: theme.color.goldMidday,
            }}
          >
            {t("studio.home_eyebrow")}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: "NotoSerif",
            fontSize: 32,
            lineHeight: 38,
            letterSpacing: -0.4,
            color: theme.color.onSurface,
            marginBottom: 28,
            textAlign: "center",
          }}
        >
          {t("studio.home_title")}
        </Text>

        {/* Feature cards — one per generation flow, registry-driven */}
        <View style={{ gap: 20 }}>
          {STUDIO_FEATURES.map((feature) => {
            const locked = isFeatureLocked(feature.key, planCode);
            return (
              <FeatureCard
                key={feature.key}
                feature={feature}
                locked={locked}
                onPress={() => handleFeaturePress(feature, locked)}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* ── First-visit spotlight (2026-07 review round 2) ──────────────
          Trial banner + tips float above a blurred, dimmed backdrop so
          they read as THE thing on screen. The backdrop itself is a
          dismiss target (tap anywhere outside the cards); both X buttons
          route here too. The tab bar renders above this overlay, and
          switching tabs also dismisses via the focus-loss hook. */}
      {introVisible && (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: introAnim,
          }}
        >
          <Pressable
            onPress={dismissIntro}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <BlurView
              intensity={34}
              tint="dark"
              style={{ flex: 1, backgroundColor: "rgba(12,11,10,0.55)" }}
            />
          </Pressable>

          {/* box-none: empty space between/around cards falls through to
              the dismiss backdrop; the cards themselves stay inert. */}
          <Animated.View
            pointerEvents="box-none"
            style={{
              flex: 1,
              justifyContent: "center",
              paddingBottom: 32,
              transform: [
                {
                  translateY: introAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            }}
          >
            <WelcomeTrialBanner onClose={dismissIntro} />

            {/* Professional tips — same one-shot intro, second card group. */}
            <View
              pointerEvents="box-none"
              style={{ paddingHorizontal: 24, gap: 18, marginTop: 8 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
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
                <Pressable
                  onPress={dismissIntro}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.close")}
                >
                  <Ionicons name="close" size={18} color={theme.color.onSurfaceVariant} />
                </Pressable>
              </View>

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
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
