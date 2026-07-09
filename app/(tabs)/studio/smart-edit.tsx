import { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  Dimensions,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import Svg, { Polyline, Circle } from "react-native-svg";

import { useStudioStore } from "@/stores/studioStore";
import { TAB_BAR_HEIGHT } from "@/components/layout/GlassNavBar";
import { createMask, type MaskMode, type MaskStroke } from "@/services/files";
import { Button } from "@/components/ui/Button";

/**
 * Smart Edit (INPAINT) — mask drawing screen.
 *
 * The user paints the areas they want the AI to CHANGE; everything left
 * unpainted is preserved pixel-perfect by flux-fill-pro (V37). Strokes are
 * captured in resolution-independent normalized coordinates and rasterized
 * SERVER-SIDE at the photo's original dimensions (the model requires
 * mask size == image size), so this screen never touches pixel data.
 */

const BRUSHES = [
  { key: "S", ratio: 0.035 },
  { key: "M", ratio: 0.07 },
  { key: "L", ratio: 0.12 },
] as const;


/** Skip move-points closer than this many view-px to the previous one. */
const MIN_POINT_DISTANCE = 3;
/** Hard cap per stroke — backend rejects >2000; finger drawing stays ≪ this. */
const MAX_POINTS_PER_STROKE = 600;

const GOLD = "#E1C39B";
/** PROTECT-mode stroke tint — cool green reads as "safe/kept". */
const PROTECT_GREEN = "#9CC5B0";

export default function SmartEditScreen() {
  const { t } = useTranslation();
  // wizard=1 → entered right after photo upload (2026-07 IA rework):
  // saving continues the chain forward instead of popping back.
  const { wizard } = useLocalSearchParams<{ wizard?: string }>();
  const photo = useStudioStore(s => s.photo);
  const setMode = useStudioStore(s => s.setMode);
  const setMask = useStudioStore(s => s.setMask);
  // Re-entering (e.g. back from the style step) restores the saved mask so
  // the user edits what they drew instead of starting from a blank canvas.
  const savedStrokes = useStudioStore(s => s.maskStrokes);
  const savedMaskMode = useStudioStore(s => s.maskMode);

  const [strokes, setStrokes] = useState<MaskStroke[]>(() => savedStrokes ?? []);
  const [livePoints, setLivePoints] = useState<{ x: number; y: number }[]>([]);
  const [brushRatio, setBrushRatio] = useState<number>(BRUSHES[1].ratio);
  const [maskMode, setMaskMode] = useState<MaskMode>(() => savedMaskMode ?? "CHANGE");
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const strokeColor = maskMode === "PROTECT" ? PROTECT_GREEN : GOLD;

  // Canvas geometry — computed up-front from the photo's aspect ratio so
  // normalized coordinates are exact (no onLayout race).
  const { canvasW, canvasH } = useMemo(() => {
    const screen = Dimensions.get("window");
    const maxW = screen.width - 32;
    // Everything except the canvas needs ~(header 72 + mode toggle 50 +
    // hint 40 + controls 62 + save 50 + tab bar 96 + margins ~60) ≈ 430px —
    // size the canvas to the REMAINING space so the save button never
    // slides under the tab bar, even on small devices.
    const maxH = Math.max(200, screen.height - 430);
    const aspect =
      photo?.width && photo?.height ? photo.width / photo.height : 3 / 4;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    return { canvasW: w, canvasH: h };
  }, [photo?.width, photo?.height]);

  // Refs mirror the live stroke for the PanResponder closure (created once).
  const livePointsRef = useRef<{ x: number; y: number }[]>([]);
  const brushRef = useRef(brushRatio);
  brushRef.current = brushRatio;
  const canvasRef = useRef({ w: canvasW, h: canvasH });
  canvasRef.current = { w: canvasW, h: canvasH };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => {
        const { locationX, locationY } = evt.nativeEvent;
        const p = clampToCanvas(locationX, locationY, canvasRef.current);
        livePointsRef.current = [p];
        setLivePoints([p]);
      },
      onPanResponderMove: evt => {
        const { locationX, locationY } = evt.nativeEvent;
        const pts = livePointsRef.current;
        if (pts.length >= MAX_POINTS_PER_STROKE) return;
        const p = clampToCanvas(locationX, locationY, canvasRef.current);
        const last = pts[pts.length - 1];
        if (
          last &&
          Math.hypot(p.x - last.x, p.y - last.y) < MIN_POINT_DISTANCE
        ) {
          return;
        }
        pts.push(p);
        setLivePoints([...pts]);
      },
      onPanResponderRelease: () => {
        const pts = livePointsRef.current;
        if (pts.length > 0) {
          const { w, h } = canvasRef.current;
          const normalized = pts.map(p => ({
            x: +(p.x / w).toFixed(4),
            y: +(p.y / h).toFixed(4),
          }));
          setStrokes(prev => [
            ...prev,
            { brush: brushRef.current, points: normalized },
          ]);
          Haptics.selectionAsync();
        }
        livePointsRef.current = [];
        setLivePoints([]);
      },
      onPanResponderTerminate: () => {
        livePointsRef.current = [];
        setLivePoints([]);
      },
    }),
  ).current;

  const handleSave = async () => {
    if (!photo?.fileId) return;
    if (strokes.length === 0) {
      // Premium feedback (2026-07): no popup — warning haptic + inline
      // hint above the CTA; clears itself as soon as a stroke lands.
      setAttempted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSaving(true);
    try {
      const mask = await createMask(photo.fileId, strokes, maskMode);
      setMode("INPAINT");
      // Keep the strokes too — Review renders them over the photo preview
      // so the user SEES what will change before generating.
      setMask(mask.id, strokes, maskMode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (wizard === "1") router.push("/studio/style");
      else router.back();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      Alert.alert(
        t("studio.smart_edit_title"),
        msg || t("studio.smart_edit_error"),
      );
    } finally {
      setSaving(false);
    }
  };

  // No photo yet — the mask belongs to an uploaded input image.
  if (!photo?.uri || !photo.fileId) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#131313" }}>
        <Header title={t("studio.smart_edit_title")} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Ionicons name="image-outline" size={40} color={GOLD} />
          <Text style={{ color: "#EDE4D7", fontSize: 16, textAlign: "center", marginTop: 16 }}>
            {t("studio.smart_edit_no_photo")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#131313" }}>
      <Header title={t("studio.smart_edit_title")} />

      {/* Mode: paint-to-change vs paint-to-protect. Both mental models are
          valid (a tester painted the sofa meaning "keep this"); make the
          semantic an explicit choice instead of a footnote. */}
      <View
        style={{
          flexDirection: "row",
          marginHorizontal: 24,
          marginBottom: 10,
          borderRadius: 12,
          backgroundColor: "rgba(42,42,42,0.8)",
          borderWidth: 1,
          borderColor: "rgba(77,70,60,0.15)",
          padding: 3,
        }}
      >
        {(["CHANGE", "PROTECT"] as const).map(m => {
          const active = maskMode === m;
          const tint = m === "PROTECT" ? PROTECT_GREEN : GOLD;
          return (
            <Pressable
              key={m}
              onPress={() => {
                Haptics.selectionAsync();
                setMaskMode(m);
              }}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 9,
                alignItems: "center",
                backgroundColor: active ? "rgba(225,195,155,0.14)" : "transparent",
                borderWidth: active ? 1 : 0,
                borderColor: tint,
              }}
            >
              <Text style={{ color: active ? tint : "#8D8271", fontSize: 13, fontWeight: "600" }}>
                {t(m === "CHANGE" ? "studio.smart_edit_mode_change" : "studio.smart_edit_mode_protect")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text
        style={{
          color: "#B8AC9C",
          fontSize: 13,
          textAlign: "center",
          paddingHorizontal: 32,
          marginBottom: 12,
        }}
      >
        {t(maskMode === "PROTECT" ? "studio.smart_edit_hint_protect" : "studio.smart_edit_hint")}
      </Text>

      {/* Canvas */}
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: canvasW,
            height: canvasH,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: "#1C1C1C",
          }}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri: photo.uri }}
            style={{ width: canvasW, height: canvasH }}
            contentFit="cover"
          />
          <Svg
            width={canvasW}
            height={canvasH}
            style={{ position: "absolute", top: 0, left: 0 }}
            pointerEvents="none"
          >
            {strokes.map((s, i) => (
              <StrokeShape
                key={i}
                points={s.points.map(p => ({ x: p.x * canvasW, y: p.y * canvasH }))}
                width={s.brush * canvasW}
                color={strokeColor}
              />
            ))}
            {livePoints.length > 0 && (
              <StrokeShape
                points={livePoints}
                width={brushRatio * canvasW}
                color={strokeColor}
              />
            )}
          </Svg>
        </View>
      </View>

      {/* Controls */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          marginTop: 18,
        }}
      >
        {BRUSHES.map(b => {
          const active = brushRatio === b.ratio;
          const dot = 10 + BRUSHES.findIndex(x => x.key === b.key) * 7;
          return (
            <Pressable
              key={b.key}
              onPress={() => {
                Haptics.selectionAsync();
                setBrushRatio(b.ratio);
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? "rgba(225,195,155,0.18)" : "rgba(42,42,42,0.8)",
                borderWidth: 1,
                borderColor: active ? GOLD : "rgba(77,70,60,0.15)",
              }}
            >
              <View
                style={{
                  width: dot,
                  height: dot,
                  borderRadius: dot / 2,
                  backgroundColor: active ? GOLD : "#8D8271",
                }}
              />
            </Pressable>
          );
        })}

        <View style={{ width: 1, height: 28, backgroundColor: "rgba(77,70,60,0.4)" }} />

        <ControlButton
          icon="arrow-undo-outline"
          label={t("studio.smart_edit_undo")}
          disabled={strokes.length === 0}
          onPress={() => setStrokes(prev => prev.slice(0, -1))}
        />
        <ControlButton
          icon="trash-outline"
          label={t("studio.smart_edit_clear")}
          disabled={strokes.length === 0}
          onPress={() => setStrokes([])}
        />
      </View>

      {/* Save — cleared above the (tabs) bar; see TAB_BAR_HEIGHT. */}
      <View
        style={{
          paddingHorizontal: 24,
          marginTop: "auto",
          marginBottom: TAB_BAR_HEIGHT + 16,
        }}
      >
        {attempted && strokes.length === 0 && (
          <Text
            style={{
              marginBottom: 10,
              fontSize: 12.5,
              lineHeight: 17,
              textAlign: "center",
              fontFamily: "Inter",
              color: "#D98A7B",
            }}
          >
            {t("studio.smart_edit_mask_required")}
          </Text>
        )}
        <Button
          title={saving ? t("studio.smart_edit_saving") : t("studio.smart_edit_save")}
          onPress={handleSave}
          loading={saving}
        />
      </View>
    </SafeAreaView>
  );
}

function clampToCanvas(
  x: number,
  y: number,
  canvas: { w: number; h: number },
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, 0), canvas.w),
    y: Math.min(Math.max(y, 0), canvas.h),
  };
}

function ControlButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Haptics.selectionAsync();
        onPress();
      }}
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(42,42,42,0.8)",
        borderWidth: 1,
        borderColor: "rgba(77,70,60,0.15)",
        opacity: disabled ? 0.4 : 1,
        flexDirection: "row",
        gap: 6,
      }}
    >
      <Ionicons name={icon} size={16} color={GOLD} />
      <Text style={{ color: "#EDE4D7", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

/** Translucent stroke (gold=change, green=protect); a lone point renders as a dot. */
function StrokeShape({
  points,
  width,
  color,
}: {
  points: { x: number; y: number }[];
  width: number;
  color: string;
}) {
  if (points.length === 1) {
    return (
      <Circle
        cx={points[0].x}
        cy={points[0].y}
        r={width / 2}
        fill={color}
        opacity={0.5}
      />
    );
  }
  return (
    <Polyline
      points={points.map(p => `${p.x},${p.y}`).join(" ")}
      fill="none"
      stroke={color}
      strokeOpacity={0.5}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Header({ title }: { title: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 16,
      }}
    >
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
        <Ionicons name="chevron-back" size={22} color={GOLD} />
      </Pressable>
      <Text
        style={{
          color: "#EDE4D7",
          fontSize: 18,
          fontWeight: "600",
          marginLeft: 16,
        }}
      >
        {title}
      </Text>
    </View>
  );
}
