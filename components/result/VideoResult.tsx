import { View, Text, Pressable, ActivityIndicator, Modal, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { theme } from "@/config/theme";
import { useImageActions } from "@/hooks/useImageActions";
import { useJobPolling } from "@/hooks/useJobPolling";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { useCreditStore } from "@/stores/creditStore";
import { sendOutputSignal } from "@/services/jobs";
import { getFileDownloadUrl } from "@/services/files";
import { track } from "@/services/analytics";
import type { JobResponse } from "@/types/api";

const U = theme.umber;

/**
 * 🔴 Twenty minutes, matching the backend's own watchdog for a clip
 * (app.jobs.video-timeout-minutes). The first live clip was still rendering
 * 8.5 minutes after Replicate said "started"; the picture screens' three
 * minutes would have called that an error while the clip was on its way.
 */
const VIDEO_TIMEOUT_MS = 20 * 60 * 1000;

const isTerminal = (s: JobResponse["status"]) =>
  s === "COMPLETED" || s === "FAILED" || s === "CANCELLED";

/**
 * The result screen of a room video (V183) — in every state it can be in.
 *
 * <p>Same route as a picture's result: the gallery, the activity list and the
 * push notification all open `/result/{jobId}`, and the result screen hands
 * a VIDEO job here instead of drawing a before/after of an mp4. Kept as its
 * own component because {@code useVideoPlayer} is a hook and must not run
 * for every picture that is not a clip.
 *
 * <p>A clip renders in the background (owner decision 2026-09-24), so this
 * screen is also where "still rendering" and "didn't finish" are shown: the
 * still it is made from, dimmed, with the state over it. While the clip is
 * not terminal the screen polls its job and flips into the player on its
 * own — for the user who opened it from the activity list rather than from
 * the push.
 *
 * <p>Looping and silent. Kling returns no audio for this model and there is
 * nothing to unmute. Save and Share go through the same two doors as a
 * picture — {@link useImageActions} with {@code media: "video"} — so Photos
 * files it as a video and the share sheet announces an MPEG-4.
 */
export function VideoResult({ job: initialJob }: { job: JobResponse }) {
  const { t } = useTranslation();
  const authHeaders = useAuthHeaders();
  const fetchBalance = useCreditStore((s) => s.fetchBalance);
  const [job, setJob] = useState<JobResponse>(initialJob);
  useEffect(() => setJob(initialJob), [initialJob]);

  useJobPolling(
    isTerminal(job.status) ? null : job.id,
    (polled) => {
      setJob(polled);
      // Consumed on success, released on failure — either way the header's
      // number moved.
      if (isTerminal(polled.status)) fetchBalance().catch(() => {});
    },
    5000,
    { timeoutMs: VIDEO_TIMEOUT_MS },
  );

  const done = job.status === "COMPLETED";
  const failed = job.status === "FAILED" || job.status === "CANCELLED";
  const output = job.outputs?.[0];
  const url = done ? (output?.url ?? null) : null;
  const posterUrl = job.inputFile?.id ? getFileDownloadUrl(job.inputFile.id) : null;

  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  // Our own fullscreen, not the platform's. expo-video enters iOS fullscreen
  // through AVPlayerViewController's private enterFullScreen selector and
  // never turns the controls back on, so with nativeControls={false} the
  // fullscreen player has no Done button at all — on 2026-09-25 the only way
  // out was killing the app. A Modal with our own close button is the same
  // pattern the picture result uses, and it cannot trap anyone.
  const [fullscreen, setFullscreen] = useState(false);
  const navigation = useNavigation();
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
   * Back to the render the clip was made from — without leaving a second
   * copy of it in the stack.
   *
   * <p>Opened from "Watch the video" the render is the screen directly
   * below: that is a plain back. Opened from a gallery tile or a push it is
   * not in the stack at all: that is a replace.
   *
   * <p>🔴 Not router.dismissTo. React Navigation 7's POP_TO matches by route
   * NAME, and when the current screen has the same name it picks the
   * current screen and only swaps its params (StackRouter, "POP_TO"). Both
   * the clip and the render are `result/[jobId]`, so dismissTo turned the
   * clip screen into the render and left the original render underneath —
   * two back presses to reach the gallery (simulator, 2026-09-25).
   */
  const handleBackToDesign = () => {
    Haptics.selectionAsync();
    const parent = job.parentJobId;
    if (!parent) {
      router.back();
      return;
    }
    const state = navigation.getState();
    const below = state && state.index > 0 ? state.routes[state.index - 1] : null;
    const belowJobId = (below?.params as { jobId?: string } | undefined)?.jobId;
    if (belowJobId === parent) router.back();
    else router.replace(`/result/${parent}` as never);
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

        {/* The clip, in the same frame the picture sat in — or, until it
            exists, the picture it is being made from with the state over it. */}
        <View style={{ height: 330, borderRadius: 20, overflow: "hidden", backgroundColor: U.surface }}>
          {url ? (
            <>
              {/* One view holds the player at a time: while the fullscreen
                  modal shows it, the inline one steps aside for the still. */}
              {fullscreen ? (
                posterUrl ? (
                  <Image
                    source={{ uri: posterUrl, headers: authHeaders }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : null
              ) : (
                <VideoView
                  player={player}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  nativeControls={false}
                  fullscreenOptions={{ enable: false }}
                  allowsPictureInPicture={false}
                  accessibilityLabel={t("result.video_kicker")}
                />
              )}
              {/* The whole frame is a door to fullscreen, like the picture's. */}
              <Pressable
                onPress={() => setFullscreen(true)}
                accessibilityRole="button"
                accessibilityLabel={t("result.open_fullscreen")}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />
            </>
          ) : (
            <>
              {posterUrl ? (
                <Image
                  source={{ uri: posterUrl, headers: authHeaders }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  blurRadius={failed ? 0 : 6}
                  transition={300}
                />
              ) : null}
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: U.overlayScrim }} />
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
                {failed ? (
                  <Text style={{ fontSize: 30 }}>!</Text>
                ) : (
                  <ActivityIndicator size="large" color={U.accentBright} />
                )}
                <Text style={{ ...theme.v2.displayXS, color: U.ink, marginTop: 14, textAlign: "center" }}>
                  {failed ? t("generation.failed") : t("generation.video_creating")}
                </Text>
                <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted, marginTop: 6, textAlign: "center" }}>
                  {failed ? t("generation.video_failed_body") : t("generation.video_eta")}
                </Text>
                {!failed ? (
                  <Text style={{ ...theme.v2.caption, color: U.inkMuted, marginTop: 4, textAlign: "center" }}>
                    {t("result.video_in_progress_hint")}
                  </Text>
                ) : null}
              </View>
            </>
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
              onPress={() => setFullscreen(true)}
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
        {done && job.creditsConsumed > 0 ? (
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

      <Modal
        visible={fullscreen && !!url}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => setFullscreen(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <StatusBar barStyle="light-content" />
          {url ? (
            <VideoView
              player={player}
              style={{ flex: 1 }}
              contentFit="contain"
              nativeControls={false}
              fullscreenOptions={{ enable: false }}
              allowsPictureInPicture={false}
              accessibilityLabel={t("result.video_kicker")}
            />
          ) : null}
          <Pressable
            onPress={() => setFullscreen(false)}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            style={{
              position: "absolute",
              top: 58,
              right: 18,
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: U.photoChrome,
              borderWidth: 1,
              borderColor: U.photoChromeBorder,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 17, lineHeight: 19 }}>✕</Text>
          </Pressable>
        </View>
      </Modal>
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
