import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";
import { useStudioStore } from "@/stores/studioStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { TAB_BAR_HEIGHT, BOTTOM_SAFE_GAP } from "@/components/layout/GlassNavBar";
import { STYLE_IMAGES } from "@/components/studio/styleImages";
import { getRoomGuess, type RoomGuessResponse } from "@/services/files";
import { track } from "@/services/analytics";

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;
const GUTTER = theme.v2Layout.gutterWide;

/**
 * Copy this look — the reference step (3.0.0, owner 21 Oct; canvas boards 11 and 12).
 *
 * <p>Replaces the 2026-07 "Curate Your Aesthetic" screen (its own type scale, a plan badge, a
 * blurred footer). Umber now, like the composer. One ask: WHICH LOOK. Two cards side by side —
 * your room (with a Change pill) and the look — and under the look's dashed door three starter
 * looks, so a first run never dead-ends on "I have no reference" (bundled style pictures, uploaded
 * like a sample room). Once the look is in, the app says what it will copy: the reference's
 * palette, materials and mood, read by the same upload-time Haiku call that names rooms
 * (GET /api/files/{id}/room-guess, polled a few seconds; absent on a server without it). Extra
 * references stay, smaller. The influence slider stays in the composer's Advanced sheet (one
 * owner for that value, 19 Sep); the line under Continue says it comes next.
 */
const STARTERS = [
  { code: "SCANDINAVIAN", labelKey: "studio.look_starter_1" },
  { code: "BOHEMIAN", labelKey: "studio.look_starter_2" },
  { code: "MID_CENTURY", labelKey: "studio.look_starter_3" },
] as const;

export default function StyleTransferScreen() {
  const { t } = useTranslation();
  const photo = useStudioStore((s) => s.photo);
  const replacePhoto = useStudioStore((s) => s.replacePhoto);
  const referencePhoto = useStudioStore((s) => s.referencePhoto);
  const setReferencePhoto = useStudioStore((s) => s.setReferencePhoto);
  const extraStyleRefs = useStudioStore((s) => s.extraStyleRefs);
  const addExtraStyleRef = useStudioStore((s) => s.addExtraStyleRef);
  const removeExtraStyleRef = useStudioStore((s) => s.removeExtraStyleRef);
  const { pickImage, useSampleImage, isUploading } = useImagePicker();
  const authHeaders = useAuthHeaders();

  const [busyWhat, setBusyWhat] = useState<null | "room" | "look" | "extra">(null);
  const busy = isUploading || busyWhat !== null;

  const pickLook = async (source: "gallery" | "camera" = "gallery") => {
    if (busy) return;
    Haptics.selectionAsync();
    setBusyWhat("look");
    try {
      const r = await pickImage(source);
      if (r?.fileId) {
        track("style_reference_set", { source });
        setReferencePhoto({ uri: r.uri, fileId: r.fileId, width: r.width ?? null, height: r.height ?? null });
      }
    } finally {
      setBusyWhat(null);
    }
  };
  const pickStarter = async (code: string) => {
    if (busy) return;
    Haptics.selectionAsync();
    setBusyWhat("look");
    try {
      const r = await useSampleImage(STYLE_IMAGES[code] as number);
      if (r?.fileId) {
        track("style_reference_set", { source: "starter", code });
        setReferencePhoto({ uri: r.uri, fileId: r.fileId, width: r.width ?? null, height: r.height ?? null });
      }
    } finally {
      setBusyWhat(null);
    }
  };
  const changeRoom = async () => {
    if (busy) return;
    Haptics.selectionAsync();
    setBusyWhat("room");
    try {
      const r = await pickImage("gallery");
      if (r) replacePhoto(r);
    } finally {
      setBusyWhat(null);
    }
  };
  const pickExtra = async () => {
    if (busy) return;
    Haptics.selectionAsync();
    setBusyWhat("extra");
    try {
      const r = await pickImage("gallery");
      if (r?.fileId) addExtraStyleRef({ uri: r.uri, fileId: r.fileId });
    } finally {
      setBusyWhat(null);
    }
  };

  // What will be copied: the reference's look, from the upload-time guess. Polled a few
  // seconds; a server without the fields just leaves the line out.
  const [look, setLook] = useState<RoomGuessResponse | null>(null);
  const [reading, setReading] = useState(false);
  const lookFor = useRef<string | null>(null);
  useEffect(() => {
    const id = referencePhoto?.fileId;
    if (!id) { setLook(null); setReading(false); lookFor.current = null; return; }
    if (lookFor.current === id) return;
    lookFor.current = id;
    setLook(null);
    setReading(true);
    let cancelled = false;
    let tries = 0;
    const poll = async () => {
      if (cancelled) return;
      tries += 1;
      try {
        const g = await getRoomGuess(id);
        if (cancelled) return;
        if (g.ready) {
          setLook(g.palette && g.palette.length > 0 ? g : null);
          setReading(false);
          return;
        }
      } catch {
        setReading(false);
        return;
      }
      if (tries < 8) setTimeout(poll, 1400); else setReading(false);
    };
    poll();
    return () => { cancelled = true; };
  }, [referencePhoto?.fileId]);
  const lookLine = look ? [look.paletteName, look.materials, look.mood].filter(Boolean).join(" · ") : "";

  const canProceed = !!referencePhoto?.fileId && !busy;
  const remoteRoom = photo?.uri && /^https?:/i.test(photo.uri);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
      {/* Composer-language header: a 34px back button, a kicker naming the mode, a spacer. */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: U.lineNeutral, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: U.ink, fontSize: 18, lineHeight: 20 }}>‹</Text>
        </Pressable>
        <Text style={{ ...V.kicker, color: U.inkMuted, flex: 1, textAlign: "center" }}>{t("studio.mode_style_transfer").toUpperCase()}</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 6 }}>
          <Text style={{ ...V.displayS, fontSize: 28, lineHeight: 32, color: U.ink }} accessibilityRole="header">
            {referencePhoto ? t("studio.mode_style_transfer") : t("studio.look_which")}
          </Text>
          <Text style={{ ...V.rowQuiet, fontSize: 13.5, lineHeight: 19, color: "#CFC4B0" }}>
            {referencePhoto ? t("studio.look_copy_sub") : t("studio.look_sub")}
          </Text>
        </View>

        {/* The pair: your room (in) and the look (the ask). */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={{ ...V.kicker, color: U.inkMuted }}>{t("studio.look_your_room")}</Text>
            <View style={{ height: 214, borderRadius: R.card, overflow: "hidden", backgroundColor: U.surface }}>
              {photo?.uri ? (
                <Image
                  source={remoteRoom ? { uri: photo.uri, headers: authHeaders } : { uri: photo.uri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
              ) : null}
              <Pressable
                onPress={changeRoom}
                accessibilityRole="button"
                accessibilityLabel={t("studio.change_photo")}
                style={{ position: "absolute", right: 8, bottom: 8, paddingHorizontal: 9, paddingVertical: 5, borderRadius: R.pill, backgroundColor: U.photoChrome, borderWidth: 1, borderColor: U.photoChromeBorder }}
              >
                {busyWhat === "room" ? <ActivityIndicator size="small" color={U.ink} /> : (
                  <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 11, color: U.ink }}>{t("studio.change_reference")}</Text>
                )}
              </Pressable>
            </View>
          </View>

          <View style={{ flex: 1, gap: 8 }}>
            <Text style={{ ...V.kicker, color: U.accentBright }}>{t("studio.look_the_look")}</Text>
            {referencePhoto?.uri ? (
              <View style={{ height: 214, borderRadius: R.card, overflow: "hidden", backgroundColor: U.surface, borderWidth: 2, borderColor: U.accent }}>
                <Pressable onPress={() => pickLook("gallery")} accessibilityRole="button" accessibilityLabel={t("studio.change_reference")} style={{ flex: 1 }}>
                  <Image source={{ uri: referencePhoto.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
                </Pressable>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setReferencePhoto(null); }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("studio.remove_photo")}
                  style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: U.photoChrome, borderWidth: 1, borderColor: U.photoChromeBorder, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="close" size={14} color={U.ink} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => pickLook("gallery")}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t("studio.choose_from_library")}
                style={{ height: 214, borderRadius: R.card, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(221,180,119,0.55)", backgroundColor: "rgba(239,208,160,0.08)", alignItems: "center", justifyContent: "center", gap: 10 }}
              >
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(239,208,160,0.18)", alignItems: "center", justifyContent: "center" }}>
                  {busyWhat === "look" ? <ActivityIndicator color={U.accentBright} /> : <Ionicons name="images-outline" size={22} color={U.accentBright} />}
                </View>
                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 14, color: U.accentBright, textAlign: "center", paddingHorizontal: 8 }}>{t("studio.choose_from_library")}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Look in: what gets copied — the reference's palette and three words. */}
        {referencePhoto ? (
          (reading || look) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: R.inline, backgroundColor: U.surface }}>
              {look ? (
                <View style={{ flexDirection: "row" }}>
                  {look.palette!.slice(0, 4).map((hex, i) => (
                    <View key={hex + i} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: hex, borderWidth: 2, borderColor: U.ground, marginLeft: i ? -6 : 0 }} />
                  ))}
                </View>
              ) : (
                <ActivityIndicator size="small" color={U.accent} />
              )}
              <Text style={{ ...V.rowQuiet, fontSize: 13, lineHeight: 18, color: U.ink, flex: 1 }} numberOfLines={2}>
                {look ? lookLine : t("studio.look_reading")}
              </Text>
            </View>
          ) : null
        ) : (
          /* No look yet: three starter looks, so the first run never dead-ends. */
          <View style={{ gap: 10, marginTop: 2 }}>
            <Text style={{ ...V.kicker, color: U.inkMuted }}>{t("studio.look_start_from")}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {STARTERS.map((s) => (
                <Pressable
                  key={s.code}
                  onPress={() => pickStarter(s.code)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t(s.labelKey)}
                  style={{ flex: 1, height: 92, borderRadius: R.thumb, overflow: "hidden", backgroundColor: U.surface }}
                >
                  <Image source={STYLE_IMAGES[s.code] as never} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  <View style={{ position: "absolute", left: 6, bottom: 6, paddingHorizontal: 7, paddingVertical: 3, borderRadius: R.pill, backgroundColor: U.photoChrome }}>
                    <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 10.5, color: U.ink }} numberOfLines={1}>{t(s.labelKey)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* More of the same look: optional, small (up to two, as before). */}
        {referencePhoto ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {extraStyleRefs.map((ref) => (
              <View key={ref.fileId} style={{ width: 64, height: 64 }}>
                <View style={{ width: 64, height: 64, borderRadius: R.thumb, overflow: "hidden" }}>
                  <Image source={{ uri: ref.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                </View>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); removeExtraStyleRef(ref.fileId); }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("studio.remove_photo")}
                  style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: U.photoChrome, borderWidth: 1, borderColor: U.photoChromeBorder, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="close" size={12} color={U.ink} />
                </Pressable>
              </View>
            ))}
            {extraStyleRefs.length < 2 ? (
              <Pressable
                onPress={pickExtra}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t("studio.add_reference")}
                style={{ width: 64, height: 64, borderRadius: R.thumb, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(221,180,119,0.45)", alignItems: "center", justifyContent: "center" }}
              >
                {busyWhat === "extra" ? <ActivityIndicator size="small" color={U.accent} /> : <Ionicons name="add" size={20} color={U.accent} />}
              </Pressable>
            ) : null}
            <Text style={{ ...V.caption, fontSize: 12.5, lineHeight: 17, color: U.inkMuted, flex: 1 }}>{t("studio.look_more")}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* The one action, above the tab bar. */}
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_GAP + 10, gap: 10 }}>
        <Pressable
          onPress={() => {
            if (!canProceed) return;
            Haptics.selectionAsync();
            router.replace("/studio/composer" as never);
          }}
          disabled={!canProceed}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canProceed }}
          accessibilityLabel={t("common.continue")}
          style={{ height: 54, borderRadius: R.button, alignItems: "center", justifyContent: "center", backgroundColor: canProceed ? U.buttonFill : U.surface, borderWidth: canProceed ? 0 : 1, borderColor: U.lineNeutral }}
        >
          <Text style={{ ...V.button, color: canProceed ? U.buttonInk : U.inkMuted }}>{t("common.continue")}</Text>
        </Pressable>
        <Text style={{ ...V.caption, fontSize: 12.5, color: U.inkMuted, textAlign: "center" }}>{t("studio.look_next")}</Text>
      </View>
    </SafeAreaView>
  );
}
