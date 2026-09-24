import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useRef } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { theme } from "@/config/theme";
import { useImageActions } from "@/hooks/useImageActions";
import { sendOutputSignal } from "@/services/jobs";
import { track } from "@/services/analytics";
import type { JobResponse } from "@/types/api";

const U = theme.umber;

/**
 * The result screen of a room video (V183).
 *
 * <p>Same route as a picture's result — the gallery and the activity list
 * push `/result/{jobId}` for every job — and the result screen hands a VIDEO
 * job here instead of drawing a before/after of an mp4. Kept as its own
 * component because {@code useVideoPlayer} is a hook and must not run for
 * every picture that is not a clip.
 *
 * <p>Looping and silent. Kling returns no audio for this model and there is
 * nothing to unmute; a clip that started talking would not be what anybody
 * asked for. Save and Share go through the same two doors as a picture —
 * {@link useImageActions} with {@code media: "video"} — so Photos files it as
 * a video and the share sheet announces an MPEG-4.
 */
export function VideoResult({ job }: { job: JobResponse }) {
  const { t } = useTranslation();
  const output = job.outputs?.[0];
  const url = output?.url ?? null;
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const viewRef = useRef<VideoView>(null);
  const { saveToPhotos, shareImage, isDownloading, isSharing } = useImageActions();
  const nameHint = `${(job.designStyleName ?? "room").toLowerCase().replace(/\s+/g, "-")}-video`;

  const handleSave = async () => {
    if (!url) return;
    // A download is the strongest vote a render gets; a clip is no different.
    if (output?.id) sendOutputSignal(output.id, "DOWNLOAD");
    await saveToPhotos(url, { nameHint, media: "video" });
  };

  const handleShare = async () => {
    if (!url) return;
    if (output?.id) sendOutputSignal(output.id, "SHARE");
    track("result_shared", { style: job.designStyleName ?? null, feature: job.featureCode ?? null });
    await shareImage(url, { nameHint, media: "video" });
  };

  /**
   * Back to the render the clip was made from.
   *
   * <p>dismissTo, not replace: opened from "Watch the video" the render is
   * already one screen below, and a replace would leave TWO copies of it in
   * the stack — the user pressed back twice to reach the gallery. dismissTo
   * pops to the render when it is there and navigates to it when it is not
   * (a clip opened straight from a gallery tile).
   */
  const handleBackToDesign = () => {
    Haptics.selectionAsync();
    if (job.parentJobId) router.dismissTo(`/result/${job.parentJobId}` as never);
    else router.back();
  };

  const handleNewDesign = () => {
    Haptics.selectionAsync();
    router.replace("/(tabs)/studio" as never);
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
      <View style={{ flex: 1, paddingHorizontal: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 14 }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            style={{
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: U.lineNeutral,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: U.ink, fontSize: 18, lineHeight: 20 }}>‹</Text>
          </Pressable>
          <Text style={{ ...theme.v2.kicker, color: U.inkMuted, flex: 1, textAlign: "center" }} numberOfLines={1}>
            {[job.designStyleName, t("result.video_kicker")].filter(Boolean).join(" · ").toUpperCase()}
          </Text>
          <View style={{ width: 34 }} />
        </View>

        {/* The clip, in the same frame the picture sat in. */}
        <View style={{ height: 330, borderRadius: 20, overflow: "hidden", backgroundColor: U.surface }}>
          {url ? (
            <VideoView
              ref={viewRef}
              player={player}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              nativeControls={false}
              allowsFullscreen
              accessibilityLabel={t("result.video_kicker")}
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
              <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted, textAlign: "center" }}>
                {t("result.video_unavailable")}
              </Text>
            </View>
          )}

          <View
            pointerEvents="none"
            style={{
              position: "absolute", top: 12, left: 12,
              backgroundColor: U.photoChrome, borderWidth: 1, borderColor: U.photoChromeBorder,
              borderRadius: 100, paddingVertical: 5, paddingHorizontal: 11,
            }}
          >
            <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 10.5, color: "#fff", letterSpacing: 0.6 }}>
              {`${t("gallery.video_badge")} · ${t("result.video_length")}`}
            </Text>
          </View>

          {url ? (
            <Pressable
              onPress={() => viewRef.current?.enterFullscreen()}
              accessibilityRole="button"
              accessibilityLabel={t("result.open_fullscreen")}
              style={{ position: "absolute", bottom: 12, right: 12, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <View style={{
                backgroundColor: U.photoChrome, borderWidth: 1, borderColor: U.photoChromeBorder,
                borderRadius: 100, paddingHorizontal: 10, paddingVertical: 6,
              }}>
                <Text style={{ color: "#fff", fontSize: 12 }}>⤢</Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", gap: 9, marginTop: 12 }}>
          <VideoAction flex={1} label={t("result.save")} busy={isDownloading} onPress={handleSave} disabled={!url} />
          <VideoAction flex={1} label={t("result.share")} busy={isSharing} onPress={handleShare} disabled={!url} />
          <VideoAction flex={1.3} label={t("result.video_back_to_design")} tone="accent" onPress={handleBackToDesign} />
        </View>

        {/* What it cost, in the same quiet voice as the ledger. */}
        {job.creditsConsumed > 0 ? (
          <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted, marginTop: 14, textAlign: "center" }}>
            {t("result.video_cost_used", { cost: job.creditsConsumed })}
          </Text>
        ) : null}

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={handleNewDesign}
          accessibilityRole="button"
          style={{
            height: 52,
            borderRadius: theme.v2Layout.radius.button,
            borderWidth: 1,
            borderColor: U.accent,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <Text style={{ ...theme.v2.button, color: U.accentBright }}>
            {t("result.new_design")}
          </Text>
          <Text style={{ color: U.accentBright, fontSize: 16 }}>→</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function VideoAction({
  label, flex, tone = "ink", busy, disabled, onPress,
}: {
  label: string; flex: number; tone?: "ink" | "accent"; busy?: boolean; disabled?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      style={{
        flex,
        height: 44,
        borderRadius: 12,
        backgroundColor: U.surface,
        borderWidth: 1,
        borderColor: U.lineAccent,
        alignItems: "center",
        justifyContent: "center",
        opacity: busy || disabled ? 0.6 : 1,
        paddingHorizontal: 6,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={U.inkMuted} />
      ) : (
        <Text
          style={{ fontFamily: "Inter-SemiBold", fontSize: 13, color: tone === "accent" ? U.accentBright : U.ink }}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
