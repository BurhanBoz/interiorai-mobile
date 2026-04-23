import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { getOutputDownloadUrl } from "@/services/files";
import { upscaleJob, cancelJob } from "@/services/jobs";
import { useJobPolling } from "@/hooks/useJobPolling";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { useCreditStore } from "@/stores/creditStore";
import type { JobResponse, JobStatus, QualityTier } from "@/types/api";

/**
 * Upscale screen — user-initiated from the result screen.
 *
 * Route params:
 *   - parentJobId  (required) completed parent job to upscale from
 *   - outputId     (optional) specific output; defaults to first
 *
 * Flow:
 *   1. POST /api/jobs/{parentJobId}/upscale → backend creates child job
 *   2. Poll GET /api/jobs/{childJobId} every 3s
 *   3. On COMPLETED → navigate to /result/{childJobId}
 *   4. On FAILED/CANCELLED → show error, allow retry
 */
export default function UpscaleScreen() {
  const { parentJobId, outputId } = useLocalSearchParams<{
    parentJobId: string;
    outputId?: string;
  }>();
  const authHeaders = useAuthHeaders();
  const fetchBalance = useCreditStore((s) => s.fetchBalance);

  const { t } = useTranslation();
  const [upscaleJobId, setUpscaleJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  // Target tier comes back from the backend after job submission. We show
  // "Upscaling to HD" for Free/Basic/Pro and "Upscaling to Ultra HD" for Max.
  // Previously hardcoded to Ultra HD — wrong for everyone below Max.
  const [targetTier, setTargetTier] = useState<QualityTier | null>(null);
  const startedAt = useRef<number>(Date.now());
  const spinRotation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Peek at the parent output as a backdrop while upscaling
  const previewUrl =
    parentJobId && outputId ? getOutputDownloadUrl(parentJobId, outputId) : undefined;

  // ─── Submit upscale on mount ───────────────────────────────────
  useEffect(() => {
    if (!parentJobId) {
      setInitError("Missing parent job id");
      return;
    }
    (async () => {
      try {
        const job = await upscaleJob(parentJobId, outputId ?? undefined);
        setUpscaleJobId(job.id);
        setStatus(job.status);
        if (job.qualityTier) setTargetTier(job.qualityTier);
      } catch (e: any) {
        const message =
          e?.response?.data?.message ??
          e?.message ??
          "Failed to start the upscale.";
        setInitError(message);
      }
    })();
  }, [parentJobId, outputId]);

  // ─── Poll the child job ────────────────────────────────────────
  useJobPolling(upscaleJobId, (job: JobResponse) => {
    setStatus(job.status);
    setProgress(estimateProgress(job.status, startedAt.current));

    if (job.status === "COMPLETED") {
      // Give user a brief confirmation tick, refresh credit balance, navigate.
      fetchBalance().catch(() => {});
      setTimeout(() => {
        router.replace(`/result/${job.id}` as any);
      }, 700);
    } else if (job.status === "FAILED") {
      setError(job.errorMessage ?? "Upscale failed. Your credits have been refunded.");
    } else if (job.status === "CANCELLED") {
      setError("Upscale was cancelled.");
    }
  }, 3000);

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
    if (upscaleJobId && status && !isTerminal(status)) {
      Alert.alert("Cancel upscale?", "Reserved credits will be refunded.", [
        { text: "Keep waiting", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelJob(upscaleJobId);
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
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#E1C39B",
            }}
          >
            Architectural Lens
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-10 mt-4">
          <Text
            className="font-label text-on-surface-variant mb-2"
            style={{ fontSize: 11, letterSpacing: 3.5, textTransform: "uppercase" }}
          >
            Current Workflow
          </Text>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 34, lineHeight: 42, fontStyle: "italic" }}
          >
            {error
              ? t("upscale.failed_title")
              : initError
              ? t("upscale.couldnt_start")
              : targetTier === "HD"
              ? t("upscale.upscaling_to_hd")
              : targetTier === "ULTRA_HD"
              ? t("upscale.upscaling_to_ultra_hd")
              : t("upscale.upscaling_generic")}
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
                  fontSize: 11,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
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
                    borderRadius: 9999,
                  }}
                />
              </View>

              <View className="flex-row items-center justify-between w-full">
                <Text
                  className="font-label text-on-surface-variant"
                  style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}
                >
                  {statusLabel(status, error, initError)}
                </Text>
                <Text className="font-headline text-primary" style={{ fontSize: 14 }}>
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
              className="flex-row items-center justify-between rounded-xl"
              style={{ padding: 20, backgroundColor: "#1C1B1B" }}
            >
              <View className="flex-row items-center" style={{ gap: 16 }}>
                <Animated.View style={{ opacity: pulseAnim }}>
                  <Animated.View style={spinStyle}>
                    <Ionicons name="sync" size={20} color="#FEDFB5" />
                  </Animated.View>
                </Animated.View>
                <Text
                  className="font-label text-primary"
                  style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}
                >
                  {status === "COMPLETED"
                    ? targetTier === "HD"
                      ? t("upscale.hd_complete")
                      : t("upscale.ultra_hd_complete")
                    : targetTier === "HD"
                    ? t("upscale.hd_in_progress")
                    : t("upscale.ultra_hd_in_progress")}
                </Text>
              </View>
              <Text
                className="font-label"
                style={{ fontSize: 10, color: "rgba(209,197,184,0.5)" }}
              >
                {status ?? "Starting"}
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
                style={{ fontSize: 11, letterSpacing: 3.5, textTransform: "uppercase" }}
              >
                {error || initError ? "Close" : "Cancel"}
              </Text>
            </Pressable>

            <Pressable
              disabled={status !== "COMPLETED"}
              onPress={() => {
                if (upscaleJobId) router.replace(`/result/${upscaleJobId}` as any);
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
                  fontSize: 11,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
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
            color: textColor,
            fontSize: 12,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            flex: 1,
          }}
          numberOfLines={2}
        >
          {props.label}
        </Text>
      </View>
      <Text className="font-label" style={{ fontSize: 10, color: "rgba(209,197,184,0.5)" }}>
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
 * Upscales typically take 30-90s; Real-ESRGAN is fast. Map elapsed time to an
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
