import { View, Text, Pressable, Animated, Easing, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { theme } from "@/config/theme";
import { useJobPolling } from "@/hooks/useJobPolling";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { useCreditStore } from "@/stores/creditStore";
import { cancelJob } from "@/services/jobs";
import { getFileDownloadUrl } from "@/services/files";
import type { JobResponse, JobStatus } from "@/types/api";

const U = theme.umber;

/**
 * Waiting for a room video (V183).
 *
 * Route params:
 *   - jobId  (required) the VIDEO job the result screen just created
 *
 * The clip's own job is polled — nothing is created here. Its `inputFile`
 * IS the still being animated (the backend sets it so), which is why the
 * poster needs no extra parameter and no second request.
 *
 * 🔴 Ten minutes, not the three every picture gets. A five-second Kling
 * clip takes 60–150 s on a healthy queue; the backend's own watchdog for a
 * clip is ten minutes too (app.jobs.video-timeout-minutes), so the two fail
 * and refund in lockstep. The picture screens' three-minute cap would have
 * told the user "unexpected error" while the clip was still rendering.
 */
const VIDEO_TIMEOUT_MS = 10 * 60 * 1000;
/** Where the progress bar heads while the provider works; the last stretch creeps. */
const EXPECTED_MS = 110_000;

type Phase = "queued" | "rendering" | "polishing" | "ready" | "error";

export default function VideoProgressScreen() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const { t } = useTranslation();
  const authHeaders = useAuthHeaders();
  const fetchBalance = useCreditStore((s) => s.fetchBalance);

  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef(Date.now());
  const rotation = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 360,
        duration: theme.motion.duration.base * 12,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    const ticker = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 500);
    return () => {
      loop.stop();
      clearInterval(ticker);
    };
  }, [rotation]);

  useJobPolling(
    jobId ?? null,
    (polled) => {
      setJob(polled);
      if (polled.status === "COMPLETED") {
        fetchBalance().catch(() => {});
        setTimeout(() => router.replace(`/result/${polled.id}` as never), 600);
      } else if (polled.status === "FAILED") {
        // The credits are already back (the backend releases them on
        // failure); refresh so the header does not keep the old number.
        fetchBalance().catch(() => {});
        if (polled.errorMessage) console.warn("[video] job failed:", polled.errorCode, polled.errorMessage);
        setError(t("generation.video_failed_body"));
      } else if (polled.status === "CANCELLED") {
        fetchBalance().catch(() => {});
        setError(t("history.status_cancelled"));
      }
    },
    3000,
    {
      timeoutMs: VIDEO_TIMEOUT_MS,
      onTimeout: () => {
        fetchBalance().catch(() => {});
        setError(t("generation.timeout_generic"));
      },
    },
  );

  const phase: Phase = useMemo(() => {
    if (error) return "error";
    const status: JobStatus | undefined = job?.status;
    if (status === "COMPLETED") return "ready";
    if (!status || status === "PENDING" || status === "SUBMITTED") return "queued";
    return elapsedMs < EXPECTED_MS * 0.8 ? "rendering" : "polishing";
  }, [error, job?.status, elapsedMs]);

  const targetProgress = useMemo(() => {
    if (phase === "ready" || phase === "error") return 100;
    if (phase === "queued") return 8;
    const linear = Math.min(1, elapsedMs / EXPECTED_MS);
    if (phase === "rendering") return Math.round(8 + linear * 72);
    return Math.min(95, Math.round(80 + linear * 15));
  }, [phase, elapsedMs]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: targetProgress,
      duration: theme.motion.duration.glacial,
      easing: theme.motion.easing.exit,
      useNativeDriver: false,
    }).start();
  }, [targetProgress, progressAnim]);

  const posterUrl = job?.inputFile?.id ? getFileDownloadUrl(job.inputFile.id) : null;
  const live = !error && job?.status !== "COMPLETED";

  const handleCancel = () => {
    if (!jobId || !live) {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/studio" as never);
      return;
    }
    Alert.alert(t("generation.video_cancel_title"), t("generation.video_cancel_body"), [
      { text: t("generation.keep_waiting"), style: "cancel" },
      {
        text: t("common.cancel"),
        style: "destructive",
        onPress: async () => {
          try {
            await cancelJob(jobId);
          } catch {
            // best-effort — the backend's watchdog settles a clip we could not cancel
          } finally {
            fetchBalance().catch(() => {});
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/studio" as never);
          }
        },
      },
    ]);
  };

  /**
   * Try again goes BACK to the render, not into a second submit here: the
   * backend allows a new clip only once the failed one is settled, and the
   * result screen is where the price is shown before anything is charged.
   */
  const handleRetry = () => {
    Haptics.selectionAsync();
    // dismissTo: the render is the screen below this one, so pop to it
    // rather than stacking a second copy of it (see VideoResult).
    if (job?.parentJobId) router.dismissTo(`/result/${job.parentJobId}` as never);
    else if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/studio" as never);
  };

  const phaseCopy = error ?? t(`generation.video_phase_${phase}`);
  const spin = rotation.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: U.ground }}>
      <View style={{ flex: 1, paddingHorizontal: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 14 }}>
          <View style={{ width: 34 }} />
          <Text style={{ ...theme.v2.kicker, color: U.inkMuted, flex: 1, textAlign: "center" }}>
            {t("result.video_kicker").toUpperCase()}
          </Text>
          <Pressable
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            hitSlop={8}
            style={{
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: U.lineNeutral,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={18} color={U.ink} />
          </Pressable>
        </View>

        {/* The still, dimmed, with the ring over it — the clip is being made
            of exactly this picture, so this is the honest thing to show. */}
        <View style={{ height: 330, borderRadius: 20, overflow: "hidden", backgroundColor: U.surface }}>
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl, headers: authHeaders }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              blurRadius={live ? 6 : 0}
              transition={300}
            />
          ) : null}
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: U.overlayScrim }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
              <View style={{ position: "absolute", width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: U.photoChromeBorder }} />
              {live ? (
                <Animated.View
                  style={{
                    position: "absolute", width: 96, height: 96, borderRadius: 48,
                    borderWidth: 2, borderColor: "transparent",
                    borderTopColor: U.accentBright, borderRightColor: U.lineAccent,
                    transform: [{ rotate: spin }],
                  }}
                />
              ) : null}
              <Ionicons
                name={phase === "error" ? "alert-circle" : phase === "ready" ? "checkmark-circle" : "videocam-outline"}
                size={34}
                color={phase === "error" ? theme.color.danger : phase === "ready" ? theme.color.success : U.accentBright}
              />
            </View>
          </View>
        </View>

        <Text style={{ ...theme.v2.displayS, color: U.ink, marginTop: 22, textAlign: "center" }}>
          {error ? t("generation.failed") : phase === "ready" ? t("generation.video_phase_ready") : t("generation.video_creating")}
        </Text>
        <Text style={{ ...theme.v2.rowQuiet, color: error ? theme.color.danger : U.inkMuted, marginTop: 8, textAlign: "center" }}>
          {phaseCopy}
        </Text>
        {live ? (
          <Text style={{ ...theme.v2.caption, color: U.inkMuted, marginTop: 4, textAlign: "center" }}>
            {t("generation.video_eta")}
          </Text>
        ) : null}

        <View style={{ marginTop: 22 }}>
          <View style={{ height: 3, borderRadius: 2, overflow: "hidden", backgroundColor: U.lineNeutral }}>
            <Animated.View
              style={{
                height: "100%",
                width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
              }}
            >
              <LinearGradient
                colors={error ? [theme.color.danger, theme.color.danger] : [U.accent, U.accentBright]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ ...theme.v2.caption, color: U.inkMuted }}>
              {t("generation.elapsed_label")} · {formatElapsed(elapsedMs, t)}
            </Text>
            <Text style={{ ...theme.v2.caption, color: U.inkMuted, fontVariant: ["tabular-nums"] }}>
              {error ? "—" : `${Math.min(100, targetProgress)}%`}
            </Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {error ? (
          <View style={{ flexDirection: "row", gap: 9, marginBottom: 12 }}>
            <Pressable
              onPress={handleCancel}
              accessibilityRole="button"
              style={{
                flex: 1, height: 52, borderRadius: theme.v2Layout.radius.button,
                borderWidth: 1, borderColor: U.lineNeutral,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ ...theme.v2.button, color: U.ink }}>{t("common.close")}</Text>
            </Pressable>
            <Pressable
              onPress={handleRetry}
              accessibilityRole="button"
              style={{
                flex: 1, height: 52, borderRadius: theme.v2Layout.radius.button,
                borderWidth: 1, borderColor: U.accent,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ ...theme.v2.button, color: U.accentBright }}>{t("common.try_again")}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleCancel}
            accessibilityRole="button"
            disabled={phase === "ready"}
            style={{
              height: 52, borderRadius: theme.v2Layout.radius.button,
              borderWidth: 1, borderColor: U.lineNeutral,
              alignItems: "center", justifyContent: "center",
              marginBottom: 12, opacity: phase === "ready" ? 0.4 : 1,
            }}
          >
            <Text style={{ ...theme.v2.button, color: U.ink }}>{t("common.cancel")}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function formatElapsed(ms: number, t: (k: string, o?: any) => string): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  if (totalSec < 60) return t("generation.seconds_short", { count: totalSec });
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (secs === 0) return t("generation.minutes_short", { count: mins });
  return t("generation.minutes_seconds", { mins, secs });
}
