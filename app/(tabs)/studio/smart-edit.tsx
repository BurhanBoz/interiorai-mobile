import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  PanResponder,
  TextInput,
  Keyboard,
  ActivityIndicator,
  ScrollView,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import Svg, { Polyline, Circle } from "react-native-svg";

import { theme } from "@/config/theme";
import { useStudioStore } from "@/stores/studioStore";
import { useCatalogStore } from "@/stores/catalogStore";
import { useGenerate } from "@/hooks/useGenerate";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { TAB_BAR_HEIGHT, BOTTOM_SAFE_GAP } from "@/components/layout/GlassNavBar";
import { createMask, type MaskMode, type MaskStroke } from "@/services/files";
import { getStyleImage } from "@/components/studio/styleImages";
import { catalogName } from "@/utils/catalogI18n";
import type { CatalogItemResponse } from "@/types/api";

/**
 * Magic Edit — the painting screen (redesigned 12 Oct, owner: "sade ve direkt sonuca odaklanan").
 *
 * <p>The photo is the screen. Above it, only what changes the result: Replace's two modes and,
 * for "replace it", one optional line for what should appear. Below it, one toolbar (brush
 * sizes, undo, clear) and one button. The button stays put above the tab bar and is quiet until
 * something is painted — no error text to read after a dead tap.
 *
 * <p>Two tools open it (`tool` param): Replace offers "replace it" (CHANGE) and "remove it"
 * (REMOVE); Keep is PROTECT only — paint the piece that stays, the room is redesigned around it.
 *
 * <p><b>Remove goes straight to the render.</b> Room type and style change nothing about taking
 * an object out, so asking for them in the composer was a step with no effect (owner, TestFlight
 * 109). The button saves the mask and generates in the same tap, with the room and style the
 * user already chose or the catalogue's Living Room and Modern. Everything it sends is handed to
 * the generate call explicitly (see useGenerate's overrides): the store's new mask id is not in
 * that closure yet.
 *
 * <p>Strokes are captured in resolution-independent normalised coordinates and rasterised
 * SERVER-SIDE at the photo's original size, so this screen never touches pixel data.
 *
 * <p><b>3.0.0 (owner, 21 Oct — canvas boards 9 and 10).</b> "Tap the piece — or paint over it":
 * a single tap is a one-point stroke, and the server's object mask grows it to the whole piece
 * at render time (Magic Edit object mask, 30 Sep), so careful painting is the fallback, not the
 * rule. The toolbar (brush sizes, undo, clear) floats on the photo. Replace offers three
 * suggestion chips under "What should appear here?" plus "designer's pick", so nobody has to
 * type. Keep carries its own banner and a style strip — pick a style here and Generate runs at
 * once; "All styles" still opens the composer. The one-shot spotlights are retired: the chip and
 * the banner teach every time, quietly.
 */

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;
const GUTTER = theme.v2Layout.gutterWide;

const BRUSHES = [
  { key: "S", ratio: 0.035, dot: 8 },
  { key: "M", ratio: 0.07, dot: 13 },
  { key: "L", ratio: 0.12, dot: 18 },
] as const;

/** Skip move-points closer than this many view-px to the previous one. */
const MIN_POINT_DISTANCE = 3;
/** Hard cap per stroke — backend rejects >2000; finger drawing stays ≪ this. */
const MAX_POINTS_PER_STROKE = 600;

/** Stroke tints: gold replaces, coral removes, green keeps. */
const TINT: Record<MaskMode, string> = { CHANGE: U.accent, REMOVE: "#E59A86", PROTECT: "#9CC5B0" };
const MODE_LABEL: Record<MaskMode, string> = {
  CHANGE: "studio.smart_edit_mode_replace",
  REMOVE: "studio.smart_edit_mode_remove",
  PROTECT: "studio.smart_edit_mode_protect",
};
const TOOL_MODES: Record<"replace" | "keep", MaskMode[]> = {
  replace: ["CHANGE", "REMOVE"],
  keep: ["PROTECT"],
};

export default function SmartEditScreen() {
  const { t } = useTranslation();
  const { tool: toolParam } = useLocalSearchParams<{ tool?: string }>();
  const photo = useStudioStore(s => s.photo);
  const setMode = useStudioStore(s => s.setMode);
  const setMask = useStudioStore(s => s.setMask);
  const roomType = useStudioStore(s => s.roomType);
  const designStyle = useStudioStore(s => s.designStyle);
  // Re-entering (back from the composer) restores the saved mask so the user edits what they
  // drew instead of starting from a blank canvas.
  const savedStrokes = useStudioStore(s => s.maskStrokes);
  const savedMaskMode = useStudioStore(s => s.maskMode);
  // "What should appear here?" — the same store field the composer's Advanced prompt uses.
  const prompt = useStudioStore(s => s.prompt);
  const setPrompt = useStudioStore(s => s.setPrompt);
  const ensureCatalog = useCatalogStore(s => s.ensureLoaded);
  const designStyles = useCatalogStore(s => s.designStyles);
  const setDesignStyle = useStudioStore(s => s.setDesignStyle);
  const { generate, isSubmitting, cost } = useGenerate();
  const authHeaders = useAuthHeaders();
  useEffect(() => { ensureCatalog().catch(() => {}); }, [ensureCatalog]);
  /** Keep (board 10): the style the rest of the room gets; null = "All styles" → composer. */
  const [keepStyle, setKeepStyle] = useState<CatalogItemResponse | null>(null);

  // An old mask from the other tool does not carry over: Keep never opens on a Replace mask.
  const tool = toolOf(toolParam, savedMaskMode);
  const modes = TOOL_MODES[tool];
  const [strokes, setStrokes] = useState<MaskStroke[]>(() =>
    savedStrokes && savedMaskMode && modes.includes(savedMaskMode) ? savedStrokes : []);
  const [livePoints, setLivePoints] = useState<{ x: number; y: number }[]>([]);
  const [brushRatio, setBrushRatio] = useState<number>(BRUSHES[1].ratio);
  const [maskMode, setMaskMode] = useState<MaskMode>(() =>
    savedMaskMode && modes.includes(savedMaskMode) ? savedMaskMode : modes[0]);
  const [saving, setSaving] = useState(false);

  const title = t(tool === "keep" ? "studio.tool_keep" : "studio.tool_replace");
  const strokeColor = TINT[maskMode];
  const busy = saving || isSubmitting;
  const ready = strokes.length > 0 && !busy;

  // The canvas fills whatever the stage leaves, at the photo's own aspect, so normalised
  // coordinates map exactly onto the photo.
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  const aspect = photo?.width && photo?.height ? photo.width / photo.height : 3 / 4;
  let canvasW = 0;
  let canvasH = 0;
  if (stage) {
    canvasW = stage.w;
    canvasH = canvasW / aspect;
    if (canvasH > stage.h) {
      canvasH = stage.h;
      canvasW = canvasH * aspect;
    }
  }
  const onStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!stage || Math.abs(stage.w - width) > 1 || Math.abs(stage.h - height) > 1) {
      setStage({ w: width, h: height });
    }
  };

  // Refs mirror the live stroke for the PanResponder closure (created once).
  const livePointsRef = useRef<{ x: number; y: number }[]>([]);
  const brushRef = useRef(brushRatio);
  brushRef.current = brushRatio;
  const canvasRef = useRef({ w: canvasW, h: canvasH });
  canvasRef.current = { w: canvasW, h: canvasH };

  // Commits whatever is in the live buffer as a stroke — on release AND on a forced
  // termination, so an OS gesture never silently discards the work.
  const commitLiveStroke = () => {
    const pts = livePointsRef.current;
    const { w, h } = canvasRef.current;
    if (pts.length > 0 && w > 0 && h > 0) {
      const normalized = pts.map(p => ({ x: +(p.x / w).toFixed(4), y: +(p.y / h).toFixed(4) }));
      setStrokes(prev => [...prev, { brush: brushRef.current, points: normalized }]);
      Haptics.selectionAsync();
    }
    livePointsRef.current = [];
    setLivePoints([]);
  };
  const commitRef = useRef(commitLiveStroke);
  commitRef.current = commitLiveStroke;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: evt => {
        Keyboard.dismiss();
        const p = clampToCanvas(evt.nativeEvent.locationX, evt.nativeEvent.locationY, canvasRef.current);
        livePointsRef.current = [p];
        setLivePoints([p]);
      },
      onPanResponderMove: evt => {
        const pts = livePointsRef.current;
        if (pts.length >= MAX_POINTS_PER_STROKE) return;
        const p = clampToCanvas(evt.nativeEvent.locationX, evt.nativeEvent.locationY, canvasRef.current);
        const last = pts[pts.length - 1];
        if (last && Math.hypot(p.x - last.x, p.y - last.y) < MIN_POINT_DISTANCE) return;
        pts.push(p);
        setLivePoints([...pts]);
      },
      onPanResponderRelease: () => commitRef.current(),
      onPanResponderTerminate: () => commitRef.current(),
    }),
  ).current;

  /** The room and style a Remove is sent with: the user's own, or the catalogue's defaults. */
  const removeContext = async () => {
    if (roomType?.id && designStyle?.id) return { room: roomType, style: designStyle };
    await ensureCatalog();
    const { roomTypes, designStyles } = useCatalogStore.getState();
    const room = roomType?.id ? roomType
      : roomTypes.find(r => r.code === "LIVING_ROOM") ?? roomTypes[0] ?? null;
    const style = designStyle?.id ? designStyle
      : designStyles.find(s => s.code === "MODERN") ?? designStyles[0] ?? null;
    return room && style ? { room, style } : null;
  };

  const handlePrimary = async () => {
    if (!photo?.fileId || busy) return;
    if (strokes.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    try {
      const remove = maskMode === "REMOVE";
      const mask = await createMask(
        photo.fileId, strokes, maskMode, maskMode === "CHANGE" && prompt.trim().length > 0,
      );
      setMode("INPAINT");
      setMask(mask.id, strokes, maskMode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const keepNow = maskMode === "PROTECT" && keepStyle != null;
      if (!remove && !keepNow) {
        // Replace, and Keep without a style picked here, go to the composer, which owns the
        // style and the statement of cost.
        router.replace("/studio/composer" as never);
        return;
      }
      if (remove) setPrompt("");
      const ctx = await removeContext();
      if (!ctx) {
        Alert.alert(title, t("errors.network"));
        return;
      }
      // Keep with a style chosen here (3.0.0): the room the user has, or the catalogue's
      // default, and the style from the strip — the same path the composer's Generate takes.
      if (keepNow) setDesignStyle(keepStyle!);
      await generate({
        mode: "INPAINT",
        maskFileId: mask.id,
        roomType: ctx.room,
        designStyle: keepNow ? keepStyle! : ctx.style,
        prompt: keepNow ? prompt : "",
        replace: !keepNow,
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      Alert.alert(title, msg || t("studio.smart_edit_error"));
    } finally {
      setSaving(false);
    }
  };

  // No photo yet — the mask belongs to an uploaded input image.
  if (!photo?.uri || !photo.fileId) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
        <Header title={title} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
          <Ionicons name="image-outline" size={36} color={U.accent} />
          <Text style={{ ...V.body, color: U.ink, textAlign: "center" }}>{t("studio.smart_edit_no_photo")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const remote = /^https?:/i.test(photo.uri);
  const generatesHere = maskMode === "REMOVE" || (maskMode === "PROTECT" && keepStyle != null);
  const ctaLabel = maskMode === "REMOVE" ? t("studio.smart_edit_mode_remove")
    : generatesHere ? t("studio.generate") : t("common.continue");
  const SUGGESTIONS = ["studio.smart_edit_suggest_1", "studio.smart_edit_suggest_2", "studio.smart_edit_suggest_3"] as const;
  const keepStyles = designStyles.slice(0, 6);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
      <Header title={title} />

      <View style={{ flex: 1, paddingHorizontal: GUTTER, gap: 12, paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_GAP + 10 }}>
        {modes.length > 1 && (
          <View
            accessibilityRole="tablist"
            style={{
              flexDirection: "row",
              padding: 3,
              borderRadius: R.pill,
              backgroundColor: U.surface,
              borderWidth: 1,
              borderColor: U.lineNeutral,
            }}
          >
            {modes.map(m => {
              const active = maskMode === m;
              return (
                <Pressable
                  key={m}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    if (active || busy) return;
                    Haptics.selectionAsync();
                    setMaskMode(m);
                  }}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: R.pill,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? U.sheetSurface : "transparent",
                    borderWidth: active ? 1 : 0,
                    borderColor: TINT[m],
                  }}
                >
                  <Text style={{ ...V.row, color: active ? TINT[m] : U.inkMuted }}>{t(MODE_LABEL[m])}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Keep (board 10): the banner says what the paint means, every time. */}
        {tool === "keep" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: R.inline, backgroundColor: "rgba(156,197,176,0.10)" }}>
            <Ionicons name="shield-checkmark-outline" size={18} color={TINT.PROTECT} />
            <Text style={{ ...V.rowQuiet, fontSize: 13.5, lineHeight: 18, color: U.ink, flex: 1 }}>{t("studio.smart_edit_hint_keep")}</Text>
          </View>
        )}

        {/* "Replace it" only: what should appear. Optional — left blank, the designer picks. */}
        {maskMode === "CHANGE" && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              height: 44,
              paddingHorizontal: 14,
              borderRadius: R.inline,
              backgroundColor: U.surface,
              borderWidth: 1,
              borderColor: U.lineNeutral,
            }}
          >
            <Ionicons name="color-wand-outline" size={16} color={U.accent} />
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder={t("studio.smart_edit_content_label")}
              placeholderTextColor={U.inkMuted}
              accessibilityLabel={t("studio.smart_edit_content_label")}
              accessibilityHint={t("studio.smart_edit_content_placeholder")}
              autoCapitalize="sentences"
              returnKeyType="done"
              maxLength={200}
              style={{ ...V.rowQuiet, fontSize: 14, color: U.ink, flex: 1, paddingVertical: 0 }}
            />
          </View>
        )}
        {maskMode === "CHANGE" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, marginTop: -4 }} contentContainerStyle={{ gap: 8 }}>
            {SUGGESTIONS.map((k) => {
              const label = t(k);
              const on = prompt.trim() === label;
              return (
                <Pressable
                  key={k}
                  onPress={() => { Haptics.selectionAsync(); setPrompt(on ? "" : label); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, backgroundColor: on ? U.lineAccent : "rgba(246,241,231,0.06)", borderWidth: on ? 1 : 0, borderColor: U.accent }}
                >
                  <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 12.5, color: on ? U.accentBright : U.ink }}>{label}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setPrompt(""); }}
              accessibilityRole="button"
              style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, backgroundColor: "rgba(246,241,231,0.06)" }}
            >
              <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 12.5, color: U.inkMuted }}>{t("studio.smart_edit_designer_pick")}</Text>
            </Pressable>
          </ScrollView>
        )}

        {/* The photo — as large as the stage allows. */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }} onLayout={onStageLayout}>
          {stage && canvasW > 0 && (
            <View
              style={{ width: canvasW, height: canvasH, borderRadius: R.card, overflow: "hidden", backgroundColor: U.surface }}
              {...panResponder.panHandlers}
            >
              <Image
                source={remote ? { uri: photo.uri, headers: authHeaders } : { uri: photo.uri }}
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
                  <StrokeShape points={livePoints} width={brushRatio * canvasW} color={strokeColor} />
                )}
              </Svg>
            </View>
          )}
          {/* The teaching line, on the photo: "tap the piece — or paint over it", then "piece
              selected" once there is a stroke (the server grows a tap to the whole piece). */}
          {stage && canvasW > 0 && (
            <View pointerEvents="none" style={{ position: "absolute", left: (stage.w - canvasW) / 2 + 10, top: (stage.h - canvasH) / 2 + 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill, backgroundColor: strokes.length > 0 ? strokeColor : U.photoChrome, borderWidth: 1, borderColor: strokes.length > 0 ? strokeColor : U.photoChromeBorder }}>
              <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 12, color: strokes.length > 0 ? U.buttonInk : U.ink }}>
                {strokes.length > 0
                  ? `✓ ${t(tool === "keep" ? "studio.smart_edit_piece_stays" : "studio.smart_edit_piece_selected")}`
                  : t("studio.smart_edit_tap_hint")}
              </Text>
            </View>
          )}
          {/* The toolbar floats on the photo (board 9): brush sizes left, undo and clear right. */}
          {stage && canvasW > 0 && (
            <View style={{ position: "absolute", left: (stage.w - canvasW) / 2 + 10, right: (stage.w - canvasW) / 2 + 10, bottom: (stage.h - canvasH) / 2 + 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          {BRUSHES.map(b => {
            const active = brushRatio === b.ratio;
            return (
              <Pressable
                key={b.key}
                accessibilityRole="button"
                accessibilityLabel={`${t("studio.smart_edit_title")} ${b.key}`}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  Haptics.selectionAsync();
                  setBrushRatio(b.ratio);
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: U.photoChrome,
                  borderWidth: active ? 1.5 : 1,
                  borderColor: active ? strokeColor : U.photoChromeBorder,
                }}
              >
                <View
                  style={{
                    width: b.dot,
                    height: b.dot,
                    borderRadius: b.dot / 2,
                    backgroundColor: active ? strokeColor : "#CFC4B0",
                  }}
                />
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <IconButton
            icon="arrow-undo-outline"
            label={t("studio.smart_edit_undo")}
            disabled={strokes.length === 0 || busy}
            onPress={() => setStrokes(prev => prev.slice(0, -1))}
          />
          <IconButton
            icon="trash-outline"
            label={t("studio.smart_edit_clear")}
            disabled={strokes.length === 0 || busy}
            onPress={() => setStrokes([])}
          />
            </View>
          )}
        </View>

        {/* Keep (board 10): the style the rest gets — pick one here and Generate runs at once;
            "All styles" keeps the composer route. */}
        {tool === "keep" && keepStyles.length > 0 && (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Text style={{ ...V.displayXS, fontSize: 18, color: U.ink }}>{t("studio.smart_edit_rest_as")}</Text>
              <Pressable onPress={() => { Haptics.selectionAsync(); setKeepStyle(null); }} accessibilityRole="button" hitSlop={6}>
                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 12.5, color: keepStyle ? U.accent : U.accentBright }}>{t("studio.all_styles")}</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -GUTTER }} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8 }}>
              {keepStyles.map((st) => {
                const on = keepStyle?.id === st.id;
                const img = getStyleImage(st.code);
                return (
                  <Pressable key={st.id} onPress={() => { Haptics.selectionAsync(); setKeepStyle(on ? null : st); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ width: 96, gap: 5 }}>
                    <View style={{ height: 64, borderRadius: R.thumb, overflow: "hidden", backgroundColor: U.surface, borderWidth: on ? 2 : 0, borderColor: U.accent }}>
                      {img ? <Image source={img as never} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : null}
                    </View>
                    <Text numberOfLines={1} style={{ fontFamily: "Inter-SemiBold", fontSize: 12, color: on ? U.accentBright : U.ink }}>{catalogName(t, "style", st)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* The one action. Quiet until something is painted. */}
        <Pressable
          onPress={handlePrimary}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          accessibilityLabel={generatesHere ? `${ctaLabel}, ${t("studio.credit_cost", { count: cost })}` : ctaLabel}
          style={{
            height: 54,
            borderRadius: R.button,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: ready ? U.buttonFill : U.surface,
            borderWidth: ready ? 0 : 1,
            borderColor: U.lineNeutral,
          }}
        >
          {busy ? (
            <ActivityIndicator color={U.buttonInk} />
          ) : (
            <>
              <Text style={{ ...V.button, color: ready ? U.buttonInk : U.inkMuted }}>{ctaLabel}</Text>
              {generatesHere && (
                <Text style={{ ...V.rowQuiet, color: ready ? U.buttonInk : U.inkMuted, opacity: 0.75 }}>
                  · {t("studio.credit_cost", { count: cost })}
                </Text>
              )}
            </>
          )}
        </Pressable>
      </View>

    </SafeAreaView>
  );
}

/** The tool named by the route, or — reopened without one — the tool the saved mask was drawn with. */
function toolOf(param: string | undefined, saved: MaskMode | null): "replace" | "keep" {
  if (param === "keep" || param === "replace") return param;
  return saved === "PROTECT" ? "keep" : "replace";
}

function clampToCanvas(x: number, y: number, canvas: { w: number; h: number }): { x: number; y: number } {
  return { x: Math.min(Math.max(x, 0), canvas.w), y: Math.min(Math.max(y, 0), canvas.h) };
}

function IconButton({
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={() => {
        if (disabled) return;
        Haptics.selectionAsync();
        onPress();
      }}
      hitSlop={4}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: U.photoChrome,
        borderWidth: 1,
        borderColor: U.photoChromeBorder,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Ionicons name={icon} size={18} color={U.ink} />
    </Pressable>
  );
}

/** Translucent stroke; a lone point renders as a dot. */
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
    return <Circle cx={points[0].x} cy={points[0].y} r={width / 2} fill={color} opacity={0.5} />;
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

/**
 * Composer-language header: a 34px back button, a kicker naming the tool, and a matching spacer
 * so the kicker is optically centred.
 */
function Header({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 }}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: U.lineNeutral,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: U.ink, fontSize: 18, lineHeight: 20 }}>‹</Text>
      </Pressable>
      <Text style={{ ...V.kicker, color: U.inkMuted, flex: 1, textAlign: "center" }}>{title.toUpperCase()}</Text>
      <View style={{ width: 34 }} />
    </View>
  );
}
