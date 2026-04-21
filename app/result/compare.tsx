import {
  View,
  Text,
  ScrollView,
  Pressable,
  PanResponder,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useTranslation } from "react-i18next";

/**
 * Before/After comparison slider.
 *
 * Layout model:
 *   AFTER image:  absolute-fill (always visible behind)
 *   BEFORE image: positioned on the left, clipped to `revealPx` width
 *   Handle:       vertical divider + circular knob at x = revealPx
 *
 * Dragging anywhere on the container (not just the handle) updates the slider
 * position — PanResponder captures touches across the whole image.
 */
function BeforeAfterSlider({
  beforeUri,
  afterUri,
  authHeaders,
}: {
  beforeUri?: string;
  afterUri?: string;
  authHeaders: Record<string, string>;
}) {
  const { t } = useTranslation();
  const [containerWidth, setContainerWidth] = useState(1);
  const [revealPx, setRevealPx] = useState(0);
  const containerWidthRef = useRef(1);

  // Initialize to 50/50 on first layout.
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    containerWidthRef.current = w;
    setContainerWidth(w);
    if (revealPx === 0) setRevealPx(w / 2);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: e => {
        const x = Math.max(
          0,
          Math.min(containerWidthRef.current, e.nativeEvent.locationX),
        );
        setRevealPx(x);
      },
      onPanResponderMove: e => {
        const x = Math.max(
          0,
          Math.min(containerWidthRef.current, e.nativeEvent.locationX),
        );
        setRevealPx(x);
      },
    }),
  ).current;

  const beforeSource = useMemo(
    () => (beforeUri ? { uri: beforeUri, headers: authHeaders } : undefined),
    [beforeUri, authHeaders],
  );
  const afterSource = useMemo(
    () => (afterUri ? { uri: afterUri, headers: authHeaders } : undefined),
    [afterUri, authHeaders],
  );

  return (
    <View
      onLayout={onLayout}
      {...panResponder.panHandlers}
      className="rounded-xl overflow-hidden bg-surface-container-low"
      style={{ aspectRatio: 4 / 5, width: "100%" }}
    >
      {/* AFTER — base layer, always rendered full-bleed */}
      {afterSource ? (
        <Image
          source={afterSource}
          style={{ position: "absolute", inset: 0 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#1C1B1B",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="image-outline" size={32} color="#998F84" />
        </View>
      )}

      {/* BEFORE — clipped to the reveal width on the left */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: revealPx,
          overflow: "hidden",
          borderRightWidth: 0,
        }}
      >
        {beforeSource ? (
          <Image
            source={beforeSource}
            style={{ width: containerWidth, height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: "#2A2A2A",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="image-outline" size={32} color="#998F84" />
          </View>
        )}
      </View>

      {/* Labels — BEFORE on left (visible while revealed), AFTER on right */}
      <View
        className="absolute rounded-full"
        style={{
          top: 16,
          left: 16,
          backgroundColor: "rgba(19,19,19,0.8)",
          paddingHorizontal: 12,
          paddingVertical: 4,
          opacity: revealPx > 50 ? 1 : 0,
        }}
      >
        <Text
          className="font-label text-on-surface-variant"
          style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}
        >
          {t("result.before")}
        </Text>
      </View>
      <View
        className="absolute rounded-full"
        style={{
          top: 16,
          right: 16,
          backgroundColor: "rgba(254,223,181,0.9)",
          paddingHorizontal: 12,
          paddingVertical: 4,
          opacity: containerWidth - revealPx > 50 ? 1 : 0,
        }}
      >
        <Text
          className="font-label font-semibold"
          style={{
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#281801",
          }}
        >
          {t("result.after")}
        </Text>
      </View>

      {/* Slider handle — divider line + circular knob at revealPx */}
      <View
        className="absolute items-center justify-center"
        style={{
          top: 0,
          bottom: 0,
          left: revealPx - 24,
          width: 48,
        }}
        pointerEvents="none"
      >
        <View
          style={{
            position: "absolute",
            width: 2,
            height: "100%",
            backgroundColor: "rgba(254,223,181,0.7)",
            shadowColor: "#FEDFB5",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
          }}
        />
        <View
          className="items-center justify-center bg-surface"
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: "#FEDFB5",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Ionicons name="swap-horizontal" size={20} color="#FEDFB5" />
        </View>
      </View>
    </View>
  );
}

export default function CompareScreen() {
  const { t } = useTranslation();
  const { beforeUrl, afterUrl } = useLocalSearchParams<{
    beforeUrl: string;
    afterUrl: string;
  }>();
  const authHeaders = useAuthHeaders();

  // `useAuthHeaders` hydrates asynchronously from SecureStore — the first
  // render sees an empty object. expo-image caches the initial failed
  // (unauthenticated) request, so rendering the BEFORE image before the
  // token arrives leaves it blank. Gate the slider behind the hydrated flag.
  const authReady = Object.keys(authHeaders).length > 0;

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(
      "[Compare] beforeUrl:", beforeUrl,
      "afterUrl:", afterUrl,
      "authReady:", authReady,
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-6">
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#E0C29A" />
          </Pressable>
          <Text
            className="font-headline text-primary-container"
            style={{
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {t("result.compare")}
          </Text>
        </View>
        <UserAvatar size="sm" onPress />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {authReady ? (
          <BeforeAfterSlider
            beforeUri={beforeUrl}
            afterUri={afterUrl}
            authHeaders={authHeaders}
          />
        ) : (
          <View
            className="rounded-xl overflow-hidden bg-surface-container-low items-center justify-center"
            style={{ aspectRatio: 4 / 5, width: "100%" }}
          >
            <Ionicons name="hourglass-outline" size={32} color="#998F84" />
          </View>
        )}

        {/* Info */}
        <View className="mt-8" style={{ gap: 16 }}>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 22, lineHeight: 28 }}
          >
            {t("result.before_after_title")}
          </Text>
          <Text
            className="font-body text-on-surface-variant"
            style={{ fontSize: 14, lineHeight: 22 }}
          >
            {t("result.before_after_description")}
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="mt-10" style={{ gap: 16 }}>
          <PrimaryButton
            label={t("result.back_to_result")}
            onPress={() => router.back()}
            leftIcon="arrow-back"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
