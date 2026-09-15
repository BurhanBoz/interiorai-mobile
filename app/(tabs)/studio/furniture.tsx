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
} from "react-native";
import { theme } from "@/config/theme";
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

export default function FurnitureScreen() {
  const { t } = useTranslation();
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
    router.back();
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
    router.back();
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
      color: "#F5F0EB",
      backgroundColor: "rgba(255,255,255,0.05)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      ...theme.text.body,
    } as const;
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            className="flex-row items-center justify-between"
            style={{ paddingHorizontal: theme.space.gutter, paddingBottom: 10 }}
          >
            <Text style={{ ...theme.text.headline, color: "#F5F0EB" }}>
              {t("furniture.save_title")}
            </Text>
            <Pressable onPress={() => setPending(null)} hitSlop={10}>
              <Ionicons name="close" size={24} color="#A79C8E" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: theme.space.gutter, paddingBottom: 28, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="rounded-xl overflow-hidden bg-surface-container-low" style={{ height: 180 }}>
              <Image source={{ uri: pending.uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ ...theme.text.caption, color: "#A79C8E" }}>{t("furniture.field_name")}</Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder={t("furniture.field_name_hint")}
                placeholderTextColor="#6E665D"
                maxLength={120}
                style={input}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ ...theme.text.caption, color: "#A79C8E" }}>{t("furniture.field_category")}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, flexShrink: 0 }}
                contentContainerStyle={{ gap: 8, alignItems: "center" }}
              >
                {CATEGORIES.map((c) => {
                  const on = form.category === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setForm((f) => ({ ...f, category: c }))}
                      className="rounded-full"
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        backgroundColor: on ? "rgba(225,195,155,0.16)" : "rgba(255,255,255,0.05)",
                        borderWidth: 1,
                        borderColor: on ? "rgba(225,195,155,0.42)" : "rgba(255,255,255,0.08)",
                      }}
                    >
                      <Text style={{ ...theme.text.caption, color: on ? "#E1C39B" : "#A79C8E" }}>
                        {t(`furniture.category.${c.toLowerCase()}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Centimetres are the reason a catalogue piece beats a photograph:
                they are the one fact the model otherwise has to guess, and
                scale is what it guesses wrong. Optional, but asked for. */}
            <View style={{ gap: 6 }}>
              <Text style={{ ...theme.text.caption, color: "#A79C8E" }}>{t("furniture.field_size")}</Text>
              <View className="flex-row" style={{ gap: 8 }}>
                {(["w", "d", "h"] as const).map((k) => (
                  <TextInput
                    key={k}
                    value={form[k]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [k]: v.replace(/[^0-9]/g, "") }))}
                    placeholder={t(`furniture.field_${k}`)}
                    placeholderTextColor="#6E665D"
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
              className="rounded-xl items-center justify-center"
              style={{
                paddingVertical: 15,
                backgroundColor: "#E1C39B",
                opacity: saving || !form.name.trim() ? 0.45 : 1,
              }}
            >
              {saving
                ? <ActivityIndicator size="small" color="#131313" />
                : <Text style={{ ...theme.text.title, color: "#131313" }}>{t("furniture.save_action")}</Text>}
            </Pressable>

            <Pressable onPress={useOnce} disabled={saving} style={{ alignItems: "center", paddingVertical: 8 }}>
              <Text style={{ ...theme.text.caption, color: "#A79C8E" }}>{t("furniture.use_once")}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
      {/* header */}
      <View
        className="flex-row items-center justify-between"
        style={{ paddingHorizontal: theme.space.gutter, paddingBottom: 10 }}
      >
        <Text style={{ ...theme.text.headline, color: "#F5F0EB" }}>
          {t("furniture.title")}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Ionicons name="close" size={24} color="#A79C8E" />
        </Pressable>
      </View>

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
          paddingHorizontal: theme.space.gutter,
          gap: 8,
          paddingBottom: 14,
          alignItems: "center",
        }}
      >
        {[null, ...CATEGORIES].map((c) => {
          const active = category === c;
          return (
            <Pressable
              key={c ?? "ALL"}
              onPress={() => setCategory(c)}
              className="rounded-full"
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                backgroundColor: active ? "rgba(225,195,155,0.16)" : "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: active ? "rgba(225,195,155,0.42)" : "rgba(255,255,255,0.08)",
              }}
            >
              <Text style={{ ...theme.text.caption, color: active ? "#E1C39B" : "#A79C8E" }}>
                {c === null ? t("furniture.all") : t(`furniture.category.${c.toLowerCase()}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {full && (
        <Text
          style={{
            ...theme.text.caption,
            color: "#C9A227",
            paddingHorizontal: theme.space.gutter,
            paddingBottom: 10,
          }}
        >
          {t("furniture.limit_reached")}
        </Text>
      )}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={COLUMNS}
        contentContainerStyle={{
          paddingHorizontal: theme.space.gutter,
          paddingBottom: 32,
          gap: 12,
        }}
        columnWrapperStyle={{ gap: 12 }}
        ListHeaderComponent={
          <View style={{ paddingBottom: 12 }}>
            <Pressable onPress={chooseOwnPhoto} disabled={full || isUploading}>
              <View
                className="flex-row items-center rounded-xl bg-surface-container-low"
                style={{
                  padding: 14,
                  gap: 12,
                  borderWidth: 1.5,
                  borderColor: "rgba(225,195,155,0.32)",
                  borderStyle: "dashed",
                  opacity: full ? 0.45 : 1,
                }}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#E1C39B" />
                ) : (
                  <Ionicons name="camera-outline" size={22} color="#E1C39B" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ ...theme.text.title, color: "#F5F0EB" }}>
                    {t("furniture.own_photo")}
                  </Text>
                  <Text style={{ ...theme.text.caption, color: "#8C8378" }}>
                    {t("furniture.own_photo_hint")}
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#E1C39B" />
            </View>
          ) : (
            <View style={{ paddingVertical: 40, alignItems: "center", gap: 6 }}>
              <Ionicons
                name={failed ? "cloud-offline-outline" : "bed-outline"}
                size={28}
                color="#6E665D"
              />
              <Text style={{ ...theme.text.caption, color: "#8C8378", textAlign: "center" }}>
                {failed ? t("furniture.load_failed") : t("furniture.empty")}
              </Text>
              {failed && (
                <Pressable onPress={() => load(category)} hitSlop={8}>
                  <Text style={{ ...theme.text.caption, color: "#E1C39B" }}>
                    {t("common.retry")}
                  </Text>
                </Pressable>
              )}
            </View>
          )
        }
        renderItem={({ item }) => {
          const already = chosen.has(item.id);
          const disabled = already || full;
          return (
            <Pressable
              onPress={() => choose(item)}
              disabled={disabled}
              style={{ flex: 1 / COLUMNS, opacity: disabled ? 0.4 : 1 }}
              accessibilityRole="button"
              accessibilityLabel={item.name}
            >
              <View
                className="rounded-xl overflow-hidden bg-surface-container-low"
                style={{ aspectRatio: 1 }}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="contain"
                  transition={160}
                />
                {already && (
                  <View
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: "rgba(19,19,19,0.9)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="checkmark" size={13} color="#E1C39B" />
                  </View>
                )}
              </View>
              <Text
                style={{ ...theme.text.caption, color: "#C4BBB0", marginTop: 5 }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {/* Centimetres, because the whole point of the catalogue is that
                  the size is known rather than inferred from a photograph. */}
              {item.widthCm ? (
                <Text style={{ ...theme.text.caption, color: "#6E665D", fontSize: 10 }}>
                  {item.widthCm} cm
                </Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
