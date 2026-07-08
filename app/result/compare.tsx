import {
  View,
  Text,
  ScrollView,
  Pressable,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AvatarMenu } from "@/components/ui/AvatarMenu";
import { useTranslation } from "react-i18next";

/**
 * Before/After comparison slider.
 *
 * Layout model:
 *   AFTER image:  absolute-fill (always visible behind)
 *   BEFORE image: positioned on the left, clipped to the reveal width
 *   Handle:       vertical divider + circular knob at the reveal edge
 *
 * Fluidity: the reveal position lives in a Reanimated shared value and every
 * frame-rate concern (clip width, handle transform, label fades) is an
 * animated style on the UI thread — dragging causes ZERO React re-renders.
 * The previous PanResponder + setState-per-move version re-rendered the
 * whole tree on every touch event, which is exactly the stutter testers felt.
 * Drag anywhere to scrub; a quick tap eases the divider to that point.
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
  const revealX = useSharedValue(0);
  const trackW = useSharedValue(1);

  // Initialize to 50/50 on first layout (layout happens once; drags never
  // touch React state again).
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setContainerWidth(w);
    trackW.value = w;
    if (revealX.value === 0) revealX.value = withTiming(w / 2, { duration: 350 });
  };

  const pan = Gesture.Pan()
    // Claim clearly-horizontal drags; hand vertical intent back to the
    // surrounding ScrollView instead of fighting it (another jank source).
    .activeOffsetX([-4, 4])
    .failOffsetY([-16, 16])
    .onStart(e => {
      revealX.value = Math.min(Math.max(e.x, 0), trackW.value);
    })
    .onUpdate(e => {
      revealX.value = Math.min(Math.max(e.x, 0), trackW.value);
    });

  const tap = Gesture.Tap().onEnd(e => {
    revealX.value = withTiming(Math.min(Math.max(e.x, 0), trackW.value), {
      duration: 180,
    });
  });

  const gesture = Gesture.Race(pan, tap);

  const beforeClipStyle = useAnimatedStyle(() => ({ width: revealX.value }));
  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: revealX.value - 24 }],
  }));
  // Labels fade with position instead of popping at a hard threshold.
  const beforeLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(revealX.value, [28, 64], [0, 1], Extrapolation.CLAMP),
  }));
  const afterLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      trackW.value - revealX.value,
      [28, 64],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // The BEFORE image is served through the authenticated backend proxy
  // (`/api/files/:id/download`) — so it needs the Bearer token in headers.
  // The AFTER image is a pre-signed S3 URL (`output.url`) — attaching an
  // Authorization header makes S3 reject the request with 403 (mixed auth
  // mechanisms). Keep the two sources separated: only BEFORE gets headers.
  const beforeSource = useMemo(
    () => (beforeUri ? { uri: beforeUri, headers: authHeaders } : undefined),
    [beforeUri, authHeaders],
  );
  const afterSource = useMemo(
    () => (afterUri ? { uri: afterUri } : undefined),
    [afterUri],
  );

  return (
    <GestureDetector gesture={gesture}>
    <View
      onLayout={onLayout}
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
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            overflow: "hidden",
          },
          beforeClipStyle,
        ]}
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
      </Animated.View>

      {/* Labels — BEFORE on left (visible while revealed), AFTER on right */}
      <Animated.View
        className="absolute rounded-full"
        style={[
          {
            top: 16,
            left: 16,
            backgroundColor: "rgba(19,19,19,0.8)",
            paddingHorizontal: 12,
            paddingVertical: 4,
          },
          beforeLabelStyle,
        ]}
      >
        <Text
          className="font-label text-on-surface-variant"
          style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}
        >
          {t("result.before")}
        </Text>
      </Animated.View>
      <Animated.View
        className="absolute rounded-full"
        style={[
          {
            top: 16,
            right: 16,
            backgroundColor: "rgba(254,223,181,0.9)",
            paddingHorizontal: 12,
            paddingVertical: 4,
          },
          afterLabelStyle,
        ]}
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
      </Animated.View>

      {/* Slider handle — divider line + circular knob, driven on the UI thread */}
      <Animated.View
        className="absolute items-center justify-center"
        style={[
          {
            top: 0,
            bottom: 0,
            left: 0,
            width: 48,
          },
          handleStyle,
        ]}
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
      </Animated.View>
    </View>
    </GestureDetector>
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
        <AvatarMenu />
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
