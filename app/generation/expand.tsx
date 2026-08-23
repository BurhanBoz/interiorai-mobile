import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { theme } from "@/config/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { getOutputDownloadUrl } from "@/services/files";
import { expandJob, cancelJob, type ExpandMode } from "@/services/jobs";
import { useJobPolling } from "@/hooks/useJobPolling";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { useCreditStore } from "@/stores/creditStore";
import type { JobResponse, JobStatus } from "@/types/api";

/**
 * IO-1 Expand screen — user-initiated from the result screen. Extends a
 * finished render beyond its frame via flux-fill outpaint (zoom out 1.5x/2x
 * or make square). Cloned from the upscale chain screen — same submit→poll→
 * navigate lifecycle, different service call and copy.
 *
 * Route params:
 *   - parentJobId  (required) completed parent job to expand from
 *   - outputId     (optional) specific output; defaults to first
 *   - mode         (required) ZOOM_OUT_15 | ZOOM_OUT_2 | MAKE_SQUARE
 *
 * Flow:
 *   1. POST /api/jobs/{parentJobId}/expand?mode= → backend creates child job
 *   2. Poll GET /api/jobs/{childJobId} every 3s
 *   3. On COMPLETED → navigate to /result/{childJobId}
 *   4. On FAILED/CANCELLED → show error, allow retry
 */
export default function ExpandScreen() {
  const { parentJobId, outputId, mode } = useLocalSearchParams<{
    parentJobId: string;
    outputId?: string;
    mode: ExpandMode;
  }>();
  const authHeaders = useAuthHeaders();
  const fetchBalance = useCreditStore((s) => s.fetchBalance);

  const { t } = useTranslation();
  const [expandJobId, setExpandJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const startedAt = useRef<number>(Date.now());
  const spinRotation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Peek at the parent output as a backdrop while upscaling
  const previewUrl =
    parentJobId && outputId ? getOutputDownloadUrl(parentJobId, outputId) : undefined;

  // ─── Submit expand on mount ────────────────────────────────────
  useEffect(() => {
    if (!parentJobId) {
      setInitError("Missing parent job id");
      return;
    }
    (async () => {
      try {
        const job = await expandJob(parentJobId, (mode ?? "ZOOM_OUT_2") as ExpandMode, outputId ?? undefined);
        setExpandJobId(job.id);
        setStatus(job.status);
      } catch (e: any) {
        const message =
          e?.response?.data?.message ??
          e?.message ??
          "Failed to start the expand.";
        setInitError(message);
      }
    })();
  }, [parentJobId, outputId]);

  // ─── Poll the child job ────────────────────────────────────────
  useJobPolling(expandJobId, (job: JobResponse) => {
    setStatus(job.status);
    setProgress(estimateProgress(job.status, startedAt.current));

    if (job.status === "COMPLETED") {
      // Give user a brief confirmation tick, refresh credit balance, navigate.
      fetchBalance().catch(() => {});
      setTimeout(() => {
        router.replace(`/result/${job.id}` as any);
      }, 700);
    } else if (job.status === "FAILED") {
      setError(job.errorMessage ?? "Expand failed. Your credits have been refunded.");
    } else if (job.status === "CANCELLED") {
      setError("Expand was cancelled.");
    }
  }, 3000, {
    // 3-min hard cap — backend timeout releases credits in lockstep.
    onTimeout: () => {
      fetchBalance().catch(() => {});
      setError(
        t("generation.timeout_generic", {
          defaultValue: "Unexpected error. Please try again.",
        }),
      );
    },
  });

  // ─── Spinner animation ─────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinRotation, {
        toValue: 360,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleCancel = async () => {
    if (expandJobId && status && !isTerminal(status)) {
      Alert.alert(t("expand.cancel_confirm"), t("expand.cancel_body"), [
        { text: "Keep waiting", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelJob(expandJobId);
            } catch {
              // best-effort
            } finally {
              router.back();
            }
          },
        },
      ]);
    } else {
      router.back();
    }
  };

  const spinStyle = {
    transform: [
      {
        rotate: spinRotation.interpolate({
          inputRange: [0, 360],
          outputRange: ["0deg", "360deg"],
        }),
      },
    ],
  };

  const phaseLabel =
    progress < 40
      ? "Analyzing Composition"
      : progress < 80
        ? "Enhancing Detail"
        : "Final Refinement";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <Pressable onPress={handleCancel} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#E1C39B" />
          </Pressable>
          <Text
            className="font-headline"
            style={{
              ...theme.text.label,
              color: "#E1C39B",
            }}
          >
            Roomframe AI
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: theme.space.gutter, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-10 mt-4">
          <Text
            className="font-label text-on-surface-variant mb-2"
            style={{ ...theme.text.caption }}
          >
            Current Workflow
          </Text>
          <Text
            className="font-headline text-on-surface"
            style={{ ...theme.text.display, fontStyle: "italic" }}
          >
            {error
              ? t("expand.failed_title")
              : initError
              ? t("expand.couldnt_start")
              : t("expand.expanding")}
          </Text>
        </View>

        {/* Blurred preview */}
        <View
          className="rounded-xl overflow-hidden mb-8"
          style={{
            aspectRatio: 4 / 5,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 20,
          }}
        >
          <Image
            source={
              previewUrl
                ? { uri: previewUrl, headers: authHeaders }
                : require("@/assets/icon.png")
            }
            style={{ width: "100%", height: "100%" }}
            blurRadius={16}
            contentFit="cover"
          />
          <View className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} />

          {/* Progress overlay */}
          <View className="absolute inset-0 items-center justify-center px-12">
            <View className="w-full items-center" style={{ maxWidth: 260 }}>
              <Text
                className="font-label text-primary mb-4"
                style={{
                  ...theme.text.caption,
                  textShadowColor: "rgba(254,223,181,0.6)",
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 4,
                }}
              >
                {error || initError ? "Error" : phaseLabel}
              </Text>

              <View
                className="w-full rounded-full overflow-hidden mb-3"
                style={{ height: 2, backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                <LinearGradient
                  colors={error || initError ? ["#93000A", "#93000A"] : ["#C4A882", "#A68A62"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    height: "100%",
                    width: `${error || initError ? 100 : progress}%`,
                    borderRadius: theme.radius.pill,
                  }}
                />
              </View>

              <View className="flex-row items-center justify-between w-full">
                <Text
                  className="font-label text-on-surface-variant"
                  style={{ ...theme.text.caption }}
                >
                  {statusLabel(status, error, initError)}
                </Text>
                <Text className="font-headline text-primary" style={{ ...theme.text.title }}>
                  {error || initError ? "—" : `${progress}%`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Log entries */}
        <View style={{ gap: 12 }}>
          <LogEntry done label="Standard Render Complete" time="prior" />
          {initError ? (
            <LogEntry error label={initError} time="just now" />
          ) : error ? (
            <LogEntry error label={error} time="just now" />
          ) : (
            <View
              className="flex-row items-center rounded-xl"
              style={{ padding: 20, backgroundColor: "#1C1B1B", gap: 16 }}
            >
              {/* Animated sync icon — the spinner here already conveys
                  "in progress" so the small uppercase status badge that
                  used to sit on the right was redundant noise next to
                  the big "ULTRA HD UPSCALING IN PROGRESS" label. The
                  removed badge restated the same state in a noisier
                  voice (raw enum values like SUBMITTED/PROCESSING
                  leaked the backend lifecycle to the user). */}
              <Animated.View style={{ opacity: pulseAnim }}>
                <Animated.View style={spinStyle}>
                  <Ionicons name="sync" size={20} color="#FEDFB5" />
                </Animated.View>
              </Animated.View>
              <Text
                className="font-label text-primary"
                style={{
                  ...theme.text.caption,
                  flex: 1,
                }}
              >
                {status === "COMPLETED"
                  ? t("expand.complete")
                  : t("expand.in_progress")}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View
        className="absolute bottom-0 left-0 right-0"
        style={{ padding: 24, backgroundColor: "rgba(19,19,19,0.7)" }}
      >
        <SafeAreaView edges={["bottom"]}>
          <View className="flex-row" style={{ gap: 16 }}>
            <Pressable
              onPress={handleCancel}
              className="flex-1 rounded-xl items-center justify-center"
              style={{ height: 52, backgroundColor: "#2A2A2A" }}
            >
              <Text
                className="font-label text-on-surface"
                style={{ ...theme.text.caption }}
              >
                {error || initError ? "Close" : "Cancel"}
              </Text>
            </Pressable>

            <Pressable
              disabled={status !== "COMPLETED"}
              onPress={() => {
                if (expandJobId) router.replace(`/result/${expandJobId}` as any);
              }}
              className="flex-1 rounded-xl items-center justify-center"
              style={{
                height: 52,
                backgroundColor: "rgba(254,223,181,0.2)",
                borderWidth: 1,
                borderColor: "rgba(254,223,181,0.1)",
              }}
            >
              <Text
                className="font-label"
                style={{
                  ...theme.text.caption,
                  color: status === "COMPLETED" ? "#FEDFB5" : "rgba(254,223,181,0.4)",
                }}
              >
                View Result
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function LogEntry(props: { done?: boolean; error?: boolean; label: string; time: string }) {
  const iconName = props.done ? "checkmark-circle" : props.error ? "alert-circle" : "sync";
  const iconColor = props.done ? "#4CAF50" : props.error ? "#FFB4AB" : "#FEDFB5";
  const textColor = props.error ? "#FFB4AB" : "#E5E2E1";
  return (
    <View
      className="flex-row items-center justify-between rounded-xl"
      style={{ padding: 20, backgroundColor: "#1C1B1B" }}
    >
      <View className="flex-row items-center flex-1" style={{ gap: 16 }}>
        <Ionicons name={iconName as any} size={20} color={iconColor} />
        <Text
          className="font-label"
          style={{
            ...theme.text.caption,
            color: textColor,
            flex: 1,
          }}
          numberOfLines={2}
        >
          {props.label}
        </Text>
      </View>
      <Text className="font-label" style={{ ...theme.text.caption, color: "rgba(209,197,184,0.5)" }}>
        {props.time}
      </Text>
    </View>
  );
}

function isTerminal(s: JobStatus): boolean {
  return s === "COMPLETED" || s === "FAILED" || s === "CANCELLED";
}

function statusLabel(
  status: JobStatus | null,
  error: string | null,
  initError: string | null,
): string {
  if (initError || error) return "Error";
  if (status === "COMPLETED") return "Ready";
  if (status === "PROCESSING") return "Processing";
  if (status === "SUBMITTED") return "Submitted";
  return "Starting";
}

/**
 * Expands typically take 20-60s on flux-fill. Map elapsed time to an
 * estimated progress curve so the UI feels responsive without the backend
 * exposing true % progress.
 */
function estimateProgress(status: JobStatus | null, startMs: number): number {
  if (status === "COMPLETED") return 100;
  if (status === "FAILED" || status === "CANCELLED") return 100;
  const elapsed = (Date.now() - startMs) / 1000;
  // 0-85% over ~60s, then 85-95% over the remainder (asymptotic)
  const expected = 60;
  if (elapsed < expected) return Math.round((elapsed / expected) * 85);
  return Math.min(95, Math.round(85 + (elapsed - expected) * 0.3));
}
