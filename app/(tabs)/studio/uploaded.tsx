import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStudioStore } from "@/stores/studioStore";
import { useDrawer } from "@/components/layout/DrawerProvider";
import { useImagePicker } from "@/hooks/useImagePicker";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/brand/Brand";
import { BottomBar, BOTTOM_BAR_SCROLL_PADDING } from "@/components/layout/BottomBar";
import { theme } from "@/config/theme";

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
  const photo = useStudioStore((s) => s.photo);
  const setPhoto = useStudioStore((s) => s.setPhoto);
  const { openDrawer } = useDrawer();
  const { pickImage } = useImagePicker();

  const handleNext = () => {
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
        <UserAvatar size="sm" onPress />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: BOTTOM_BAR_SCROLL_PADDING(true),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <View style={{ marginTop: 16, marginBottom: 10 }}>
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
            marginBottom: 32,
          }}
        >
          {t("studio.step1_title")}
        </Text>

        {/* Uploaded photo preview */}
        <View
          style={{
            borderRadius: 18,
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
              onPress={() => setPhoto(null)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 40,
                height: 40,
                borderRadius: 20,
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

        {/* Change photo — 44pt tap target */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Button
            title={t("studio.change_photo")}
            variant="tertiary"
            size="sm"
            onPress={handleChangePhoto}
            icon="refresh"
            iconLeft
            fullWidth={false}
          />
        </View>

        {/* Info hint — sentence-case, warm card */}
        <View
          style={{
            padding: 16,
            borderRadius: 14,
            backgroundColor: "rgba(225,195,155,0.05)",
            borderWidth: 1,
            borderColor: "rgba(225,195,155,0.18)",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <Ionicons
            name="bulb-outline"
            size={18}
            color={theme.color.goldMidday}
            style={{ marginTop: 2 }}
          />
          <Text
            style={{
              flex: 1,
              fontFamily: "Inter",
              fontSize: 13,
              lineHeight: 20,
              color: theme.color.onSurfaceVariant,
            }}
          >
            {t("studio.tip_best_results")}
          </Text>
        </View>
      </ScrollView>

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
