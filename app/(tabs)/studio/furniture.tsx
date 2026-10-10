/*
 * Redesign v3 (2026-10-10): every colour comes from theme.umber / theme.v2 —
 * no hex literals in this file. Chips are the Gallery's GalleryFilterChip,
 * product cards and the own-photo card live in components/furniture/.
 *
 * 🔴 The product plate stays LIGHT (umber.productPlate). Every catalogue image
 * is a cut-out shot against white, so a plate that darkened with the rest of
 * the palette would leave each sofa floating on its own pale halo.
 */
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { theme } from "@/config/theme";
import { GalleryFilterChip } from "@/components/gallery/GalleryFilterChip";
import { FurnitureHeader } from "@/components/furniture/FurnitureHeader";
import { FurnitureTile } from "@/components/furniture/FurnitureTile";
import { OwnPhotoCard } from "@/components/furniture/OwnPhotoCard";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useStudioStore } from "@/stores/studioStore";
import { furnitureService } from "@/services/furniture";
import { useImagePicker } from "@/hooks/useImagePicker";
import type { FurnitureItem } from "@/types/api";

/**
 * The furniture catalogue picker (V177).
 *
 * <p>Replaces the straight-to-photo-library tap on the "+" tile. The library
 * is still here — it is the first cell — but it is no longer the only way to
 * add a piece, and it is no longer the *default* way: a catalogue piece
 * carries its real dimensions into the prompt, and wrong scale is the first
 * way an inserted object fails.
 */

const COLUMNS = 3;
const CATEGORIES = [
  "SOFA", "CHAIR", "TABLE", "BED", "LAMP", "RUG", "PLANT", "STORAGE", "DECOR",
] as const;

const U = theme.umber;
const V = theme.v2;
const L = theme.v2Layout;
const EDGE = L.gutterWide;
const GAP = 10;
/** Only the first rows stagger in; later tiles mount settled. */
const ENTER_CAP = 12;
const ENTER_STAGGER = 35;

/**
 * Close the picker. The screen is a modal over the composer, but it can also
 * be the first route (a cold deep link, a restored state) — then there is
 * nothing to go back to and a bare back() is a no-op that strands the user.
 */
const close = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)/studio" as never);
};

export default function FurnitureScreen() {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = Math.floor((screenWidth - EDGE * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const objectRefs = useStudioStore((s) => s.objectRefs);
  const addObjectRef = useStudioStore((s) => s.addObjectRef);
  const { pickImage: pickObjectImage, isUploading } = useImagePicker();

  const [items, setItems] = useState<FurnitureItem[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // V178 — a picked photo waiting to be named. While this is set the screen
  // shows the save form instead of the grid: the same screen, one step on,
  // rather than a second route the back button has to learn about.
  const [pending, setPending] = useState<{ uri: string; fileId: string } | null>(null);
  const [form, setForm] = useState({ name: "", category: "SOFA", w: "", d: "", h: "" });
  const [saving, setSaving] = useState(false);

  const full = objectRefs.length >= 4;

  const load = useCallback(async (cat: string | null) => {
    setLoading(true);
    setFailed(false);
    try {
      setItems(await furnitureService.browse(cat ?? undefined));
    } catch {
      // An empty catalogue and an unreachable one look identical in a grid,
      // so they get different copy — otherwise a network blip reads as
      // "we have no furniture".
      setFailed(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(category); }, [category, load]);

  const chosen = useMemo(
    () => new Set(objectRefs.map((r) => r.catalogItemId).filter(Boolean) as string[]),
    [objectRefs],
  );

  const choose = (item: FurnitureItem) => {
    if (full || chosen.has(item.id)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addObjectRef({
      uri: item.imageUrl,
      // The catalogue image is a file like any other, so removal and dedupe
      // keep working through the same key.
      fileId: item.id,
      catalogItemId: item.id,
      name: item.name,
    });
    close();
  };

  const chooseOwnPhoto = async () => {
    if (full || isUploading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await pickObjectImage();
    if (result?.fileId) {
      setPending({ uri: result.uri, fileId: result.fileId });
      setForm({ name: "", category: category ?? "SOFA", w: "", d: "", h: "" });
    }
  };

  /** Use the photo for this design only — the pre-V178 behaviour. */
  const useOnce = () => {
    if (!pending) return;
    addObjectRef({ uri: pending.uri, fileId: pending.fileId });
    close();
  };

  /** Save it as a catalogue piece; the cutout runs server-side. */
  const saveToCatalogue = async () => {
    if (!pending || saving) return;
    const name = form.name.trim();
    if (!name) return;
    setSaving(true);
    try {
      const num = (v: string) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n > 0 && n <= 1000 ? n : undefined;
      };
      await furnitureService.save({
        fileId: pending.fileId,
        name,
        category: form.category,
        widthCm: num(form.w),
        depthCm: num(form.d),
        heightCm: num(form.h),
      });
      // 202, not 200: the piece is being cut out and will appear once that
      // lands. Saying so beats a list that silently does not contain it.
      Alert.alert(t("furniture.saved_title"), t("furniture.saved_body"));
      setPending(null);
      load(category);
    } catch {
      Alert.alert(t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  // ── V178: name the piece you just photographed ──────────────────────
  if (pending) {
    const input = {
      color: U.ink,
      backgroundColor: U.surface,
      borderWidth: 1,
      borderColor: U.lineNeutral,
      borderRadius: L.radius.inline,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...theme.text.body,
    } as const;
    const label = { ...V.captionStrong, color: U.inkMuted } as const;
    const canSave = !saving && !!form.name.trim();
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: U.ground }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <FurnitureHeader
            title={t("furniture.save_title")}
            closeLabel={t("common.close")}
            onClose={() => setPending(null)}
          />

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: EDGE, paddingBottom: 28, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                height: 190,
                padding: 6,
                borderRadius: L.radius.card,
                backgroundColor: U.surface,
                borderWidth: 1,
                borderColor: U.lineNeutral,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: L.radius.card - 6,
                  overflow: "hidden",
                  backgroundColor: U.sheetSurface,
                }}
              >
                <Image source={{ uri: pending.uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
              </View>
            </View>

            <View style={{ gap: 7 }}>
              <Text style={label}>{t("furniture.field_name")}</Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder={t("furniture.field_name_hint")}
                placeholderTextColor={U.inkMuted}
                selectionColor={U.accent}
                maxLength={120}
                style={input}
              />
            </View>

            <View style={{ gap: 7 }}>
              <Text style={label}>{t("furniture.field_category")}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, flexShrink: 0, marginHorizontal: -EDGE }}
                contentContainerStyle={{ gap: 8, alignItems: "center", paddingHorizontal: EDGE, paddingVertical: 4 }}
              >
                {CATEGORIES.map((c) => (
                  <GalleryFilterChip
                    key={c}
                    label={t(`furniture.category.${c.toLowerCase()}`)}
                    active={form.category === c}
                    onPress={() => setForm((f) => ({ ...f, category: c }))}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Centimetres are the reason a catalogue piece beats a photograph:
                they are the one fact the model otherwise has to guess, and
                scale is what it guesses wrong. Optional, but asked for. */}
            <View style={{ gap: 7 }}>
              <Text style={label}>{t("furniture.field_size")}</Text>
              <View className="flex-row" style={{ gap: 8 }}>
                {(["w", "d", "h"] as const).map((k) => (
                  <TextInput
                    key={k}
                    value={form[k]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [k]: v.replace(/[^0-9]/g, "") }))}
                    placeholder={t(`furniture.field_${k}`)}
                    placeholderTextColor={U.inkMuted}
                    selectionColor={U.accent}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={{ ...input, flex: 1, textAlign: "center" }}
                  />
                ))}
              </View>
            </View>

            <Pressable
              onPress={saveToCatalogue}
              disabled={saving || !form.name.trim()}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave, busy: saving }}
              style={{
                height: 54,
                marginTop: 4,
                borderRadius: L.radius.button,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: U.buttonFill,
                opacity: canSave || saving ? 1 : 0.45,
              }}
            >
              {saving
                ? <ActivityIndicator size="small" color={U.buttonInk} />
                : <Text style={{ ...V.button, color: U.buttonInk }}>{t("furniture.save_action")}</Text>}
            </Pressable>

            <Pressable
              onPress={useOnce}
              disabled={saving}
              accessibilityRole="button"
              style={{ alignItems: "center", paddingVertical: 10 }}
            >
              <Text style={{ ...V.row, color: U.accent }}>{t("furniture.use_once")}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: U.ground }} edges={["top", "bottom"]}>
      <FurnitureHeader
        title={t("furniture.title")}
        closeLabel={t("common.close")}
        onClose={close}
      />

      {/* categories */}
      {/* flexGrow 0: the parent is flex-1 and the grid below it shrinks when a
          category has few items — without this the chip strip absorbed the
          slack and the chips stretched into tall ovals. alignItems keeps each
          chip its own height rather than the tallest sibling's. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{
          paddingHorizontal: EDGE,
          gap: 8,
          paddingTop: 4,
          paddingBottom: 16,
          alignItems: "center",
        }}
      >
        {[null, ...CATEGORIES].map((c) => (
          <GalleryFilterChip
            key={c ?? "ALL"}
            label={c === null ? t("furniture.all") : t(`furniture.category.${c.toLowerCase()}`)}
            active={category === c}
            onPress={() => setCategory(c)}
            reduceMotion={reduceMotion}
          />
        ))}
      </ScrollView>

      {full && (
        <Text
          style={{
            ...V.rowQuiet,
            color: U.accentBright,
            paddingHorizontal: EDGE,
            paddingBottom: 12,
          }}
        >
          {t("furniture.limit_reached")}
        </Text>
      )}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={COLUMNS}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: EDGE,
          paddingBottom: 32,
          gap: GAP,
        }}
        columnWrapperStyle={{ gap: GAP }}
        ListHeaderComponent={
          <View style={{ paddingBottom: 14 }}>
            <OwnPhotoCard
              title={t("furniture.own_photo")}
              hint={t("furniture.own_photo_hint")}
              uploading={isUploading}
              disabled={full || isUploading}
              reduceMotion={reduceMotion}
              onPress={chooseOwnPhoto}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator size="small" color={U.accent} />
            </View>
          ) : (
            <View style={{ paddingVertical: 40, alignItems: "center", gap: 8 }}>
              <Ionicons
                name={failed ? "cloud-offline-outline" : "bed-outline"}
                size={28}
                color={U.inkMuted}
              />
              <Text style={{ ...V.rowQuiet, color: U.inkMuted, textAlign: "center" }}>
                {failed ? t("furniture.load_failed") : t("furniture.empty")}
              </Text>
              {failed && (
                <Pressable onPress={() => load(category)} hitSlop={8} accessibilityRole="button">
                  <Text style={{ ...V.row, color: U.accent }}>
                    {t("common.retry")}
                  </Text>
                </Pressable>
              )}
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const already = chosen.has(item.id);
          const disabled = already || full;
          return (
            <FurnitureTile
              width={tileWidth}
              name={item.name}
              imageUrl={item.imageUrl}
              widthCm={item.widthCm}
              chosen={already}
              disabled={disabled}
              enterDelay={index < ENTER_CAP ? index * ENTER_STAGGER : null}
              reduceMotion={reduceMotion}
              onPress={() => choose(item)}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}
