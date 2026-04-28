import { useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
  ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { LegalFooter } from "@/components/ui/LegalFooter";
import { theme } from "@/config/theme";

/**
 * Conversion-funnel teaser surfaced from the onboarding "Try without an
 * account" CTA. Shows curated before/after pairs so a visitor can browse
 * the brand promise without committing to register.
 *
 * Real anonymous-render gen (1 watermark'lı render) requires backend epic:
 *   - POST /api/auth/anonymous (device-token JWT)
 *   - users.trial_used flag + V18 migration
 *   - per-device throttling
 * Out of scope here — see GO_LIVE_MASTER §20.3 task F.
 */

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Curated before/after pairs ship as bundled assets so the carousel renders
// with no network round-trip — the unauth trial screen must feel instant.
// Filenames are owned by the design pipeline; never rename without updating
// the Stitch source folder too.
const PAIRS = [
  {
    id: "living-room",
    labelKey: "auth.trial_label_living_room",
    before: require("@/assets/trial/livingRoom_Before.png"),
    after: require("@/assets/trial/livingRoom_After.png"),
  },
  {
    id: "kitchen",
    labelKey: "auth.trial_label_kitchen",
    before: require("@/assets/trial/kitchen_Before.png"),
    after: require("@/assets/trial/kitchen_After.png"),
  },
  {
    id: "cafe",
    labelKey: "auth.trial_label_cafe",
    before: require("@/assets/trial/cafe_Before.png"),
    after: require("@/assets/trial/cafe_After.png"),
  },
] as const;

function Caption({ label }: { label: string }) {
  return (
    <View
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        backgroundColor: "rgba(0,0,0,0.62)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
      }}
    >
      <Text
        style={{
          fontFamily: "Inter-SemiBold",
          fontSize: 10,
          letterSpacing: 1.6,
          color: "#E5E2E1",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AnonymousTrialScreen() {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.color.surface }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, flexDirection: "row", alignItems: "center" }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#E5E2E1" />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 18 }}>
        <Text
          style={{
            fontFamily: "NotoSerif",
            fontSize: 28,
            lineHeight: 34,
            letterSpacing: -0.3,
            color: theme.color.onSurface,
          }}
        >
          {t("auth.trial_intro_title")}
        </Text>
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            lineHeight: 20,
            color: theme.color.onSurfaceVariant,
            marginTop: 10,
          }}
        >
          {t("auth.trial_intro_subtitle")}
        </Text>
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        <FlatList
          data={PAIRS}
          renderItem={({ item }) => (
            <View
              style={{
                width: SCREEN_WIDTH,
                paddingHorizontal: 24,
                gap: 12,
              }}
            >
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "rgba(214, 169, 92, 0.14)",
                  borderColor: "rgba(214, 169, 92, 0.32)",
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter-SemiBold",
                    fontSize: 11,
                    letterSpacing: 0.6,
                    color: theme.color.goldMidday,
                  }}
                >
                  {t(item.labelKey)}
                </Text>
              </View>
              <View
                style={{
                  height: 220,
                  borderRadius: 14,
                  overflow: "hidden",
                  backgroundColor: theme.color.surfaceContainerLow,
                }}
              >
                <Image
                  source={item.before}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={300}
                />
                <Caption label={t("auth.trial_caption_before")} />
              </View>
              <View
                style={{
                  height: 220,
                  borderRadius: 14,
                  overflow: "hidden",
                  backgroundColor: theme.color.surfaceContainerLow,
                }}
              >
                <Image
                  source={item.after}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={300}
                />
                <Caption label={t("auth.trial_caption_after")} />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.35)"]}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 60,
                  }}
                />
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />

        <View
          style={{
            flexDirection: "row",
            alignSelf: "center",
            gap: 6,
            marginTop: 18,
          }}
        >
          {PAIRS.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIndex ? 24 : 6,
                height: 5,
                borderRadius: 3,
                backgroundColor:
                  i === activeIndex ? theme.color.goldMidday : "rgba(229,226,225,0.3)",
              }}
            />
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 8, gap: 8 }}>
        <Button
          title={t("auth.trial_cta_primary")}
          variant="primary"
          size="lg"
          onPress={() => router.push("/register")}
          icon="sparkles"
        />
        <View style={{ alignItems: "center" }}>
          <Button
            title={t("auth.trial_cta_secondary")}
            variant="tertiary"
            size="sm"
            onPress={() => router.push("/login")}
            fullWidth={false}
          />
        </View>
        <LegalFooter />
      </View>
    </SafeAreaView>
  );
}
