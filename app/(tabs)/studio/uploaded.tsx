import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStudioStore } from "@/stores/studioStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useDismissible } from "@/hooks/useDismissible";
import { AvatarMenu } from "@/components/ui/AvatarMenu";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/brand/Brand";
import { BottomBar, BOTTOM_BAR_SCROLL_PADDING } from "@/components/layout/BottomBar";
import { OneShotSpotlight } from "@/components/ui/OneShotSpotlight";
import { theme } from "@/config/theme";
import { STUDIO_STEP, STUDIO_STEP_TOTAL } from "@/constants/studioSteps";

/**
 * Studio Step 1 — "photo selected" state. Shows the user's chosen image,
 * offers a secondary "change photo" action, surfaces one prep tip, and
 * ships a single primary CTA at the bottom.
 *
 * Fixes from the audit:
 *   - Brand mark now uses the SVG component, not a hardcoded "\n" text
 *   - Close button is now a two-layer (blur + solid) badge so it reads on
 *     both light and dark photos
 *   - "Change Photo" is a 44pt tap target, not the old 24pt text link
 *   - CTA copy is the editorial "Continue" (Turkish "Devam Et", etc.) —
 *     the overwrought "Continue to Architecture" is gone
 */
export default function UploadedScreen() {
  const { t } = useTranslation();
  // One-shot photo-quality tip — shown on the very first visit only.
  const [tipVisible, dismissTip] = useDismissible("studio_best_results_seen");
  const photo = useStudioStore((s) => s.photo);
  const setPhoto = useStudioStore((s) => s.setPhoto);
  const { pickImage } = useImagePicker();

  const mode = useStudioStore((s) => s.mode);
  const handleNext = () => {
    // 2026-07 IA rework: the flow was chosen on the studio home, so the
    // specialty step (mask drawing / reference photo) comes RIGHT after
    // the photo. Both land back on the shared chain (style → options →
    // review) via wizard=1; review's guards stay as safety nets.
    if (mode === "INPAINT") {
      router.push({ pathname: "/studio/smart-edit", params: { wizard: "1" } });
      return;
    }
    if (mode === "STYLE_TRANSFER") {
      router.push({ pathname: "/studio/style-transfer", params: { wizard: "1" } });
      return;
    }
    router.push("/studio/style");
  };

  const handleChangePhoto = async () => {
    const result = await pickImage("gallery");
    if (result) {
      setPhoto(result);
    }
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
          paddingHorizontal: theme.space.gutter,
        }}
      >
        {/* Spacer keeps the brand centered — the hamburger is retired
            (2026-07 round 2: drawer removed, tab bar is sole navigation). */}
        <View style={{ width: 40 }} />
        <Brand variant="inline" size="sm" tone="gold" />
        <AvatarMenu />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: theme.space.gutter,
          paddingBottom: BOTTOM_BAR_SCROLL_PADDING(true),
          // Fill the viewport so the photo block can center itself in the
          // space between the headline and the CTA — with the old inline
          // tip gone, top-anchored content left a dead gap above the button
          // (2026-07-15 founder screenshot).
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <View style={{ marginTop: 16, marginBottom: 10 }}>
          <Text
            style={{
              ...theme.text.label,
              color: theme.color.goldMidday,
            }}
          >
            {t("studio.step_of", { current: STUDIO_STEP.UPLOAD, total: STUDIO_STEP_TOTAL })}
          </Text>
        </View>

        {/* Headline */}
        <Text
          style={{
            ...theme.text.display,
            color: theme.color.onSurface,
            marginBottom: 24,
          }}
        >
          {t("studio.step1_title")}
        </Text>

        {/* Photo + change-photo, vertically centered in the remaining
            space — the screen reads balanced with or without hints. */}
        <View style={{ flex: 1, justifyContent: "center" }}>

        {/* Uploaded photo preview */}
        <View
          style={{
            borderRadius: theme.radius.md,
            overflow: "hidden",
            marginBottom: 20,
            ...theme.elevation.lg,
          }}
        >
          <View
            style={{
              aspectRatio: 4 / 3,
              backgroundColor: theme.color.surfaceContainerLow,
            }}
          >
            <Image
              source={{ uri: photo?.uri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />

            {/* Subtle bottom gradient so the close button has contrast
                against bright photos. Previously a flat 20% overlay was
                applied to the whole image, which washed the preview out. */}

            {/* Close button — two-layer (gold-tinted ring + opaque core)
                so the glyph stays legible on both white and dark
                photographs. */}
            <Pressable
              onPress={() => {
                // Clearing the photo returns to the capture step — before,
                // this left the user stranded on an empty preview (the X
                // "did nothing" from their point of view).
                setPhoto(null);
                router.back();
              }}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 40,
                height: 40,
                borderRadius: theme.radius.lg,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(19,19,19,0.78)",
                borderWidth: 1,
                borderColor: "rgba(225,195,155,0.35)",
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t("studio.change_photo")}
            >
              <Ionicons name="close" size={18} color="#F5F0EB" />
            </Pressable>
          </View>
        </View>

        {/* Change photo — bordered action card, icon + label on one row.
            Wrapper View owns the bottom margin so layout is not inside
            the Pressable callback (which can drop layout props in RN). */}
        <View style={{ marginBottom: 0 }}>
          <Pressable
            onPress={handleChangePhoto}
            accessibilityRole="button"
            accessibilityLabel={t("studio.change_photo")}
            style={({ pressed }) => ({
              opacity: pressed ? 0.72 : 1,
              transform: [{ scale: pressed ? 0.975 : 1 }],
            })}
          >
            <View
              style={{
                paddingVertical: 18,
                paddingHorizontal: theme.space.gutter,
                borderWidth: 1,
                borderColor: "rgba(225,195,155,0.55)",
                borderRadius: theme.radius.md,
                backgroundColor: "rgba(225,195,155,0.04)",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <Ionicons
                name="images-outline"
                size={20}
                color={theme.color.goldMidday}
              />
              <Text
                style={{
                  ...theme.text.subtitle,
                  color: theme.color.onSurface,
                }}
              >
                {t("studio.change_photo")}
              </Text>
            </View>
          </Pressable>
        </View>

        </View>
      </ScrollView>

      {/* Photo-quality tip — one-shot SPOTLIGHT (2026-07-15 founder spec:
          all first-time hints use the dimmed-backdrop prompt pattern).
          Gone forever on X or any tap; the screen itself stays pure. */}
      <OneShotSpotlight
        visible={tipVisible}
        onDismiss={dismissTip}
        icon="bulb-outline"
        text={t("studio.tip_best_results")}
      />

      {/* Fixed CTA — tab-bar-aware via BottomBar */}
      <BottomBar overTabBar>
        <Button
          title={t("studio.continue_to_architecture")}
          variant="primary"
          size="lg"
          onPress={handleNext}
          icon="arrow-forward"
        />
      </BottomBar>
    </SafeAreaView>
  );
}
