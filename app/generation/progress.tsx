import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useJobPolling } from "@/hooks/useJobPolling";
import { useCreditStore } from "@/stores/creditStore";
import { Brand } from "@/components/brand/Brand";
import { theme } from "@/config/theme";
import type { JobResponse, JobStatus } from "@/types/api";

/**
 * Maps raw API status + elapsed time to a single visual phase the user can read.
 * Each phase owns a label, a percentage range, and an icon.
 *
 * The backend exposes status transitions PENDING → SUBMITTED → PROCESSING → COMPLETED,
 * so we mirror those instead of relying on a fake timer loop like the previous version.
 * Within PROCESSING we still animate through sub-phases so the copy doesn't feel frozen
 * during the long render window.
 */
type Phase = "queued" | "submitted" | "rendering" | "polishing" | "ready" | "error";

const ESTIMATED_TOTAL_MS = 45_000; // Avg job time — tuned to ControlNet Hough median

export default function GenerationProgressScreen() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();

  const fetchBalance = useCreditStore((s) => s.fetchBalance);

  const [job, setJob] = useState<JobResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef<number>(Date.now());

  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.3)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ─── Spinner animations ───────────────────────────────
  // Motion durations flow through `theme.motion` so the generate phase
  // shares a signature cadence with every other wait state in the app.
  // The rotation is a generous 10× base duration (slow spin = calm);
  // the pulse uses glacial/2 for the two halves of a breath.
  useEffect(() => {
    const rotationLoop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 360,
        duration: theme.motion.duration.base * 12, // ~2880ms
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.7,
          duration: theme.motion.duration.glacial * 3, // ~1680ms
          easing: theme.motion.easing.standard,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: theme.motion.duration.glacial * 3,
          easing: theme.motion.easing.standard,
          useNativeDriver: true,
        }),
      ]),
    );
    rotationLoop.start();
    pulseLoop.start();
    return () => {
      rotationLoop.stop();
      pulseLoop.stop();
    };
  }, [rotation, pulse]);

  // ─── Elapsed-time ticker ──────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startedAt.current);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  // ─── Poll the real job status ─────────────────────────
  useJobPolling(
    jobId ?? null,
    (polled) => {
      setJob(polled);
      if (polled.status === "COMPLETED") {
        fetchBalance();
        // Briefly show the "ready" phase before navigating so the transition feels finished.
        setTimeout(() => router.replace(`/result/${polled.id}` as any), 700);
      } else if (polled.status === "FAILED") {
        setErrorMessage(polled.errorMessage || t("generation.failed"));
      } else if (polled.status === "CANCELLED") {
        setErrorMessage(t("history.status_cancelled"));
      }
    },
    3000,
  );

  const phase: Phase = useMemo(() => {
    if (errorMessage) return "error";
    const status = job?.status;
    if (status === "COMPLETED") return "ready";
    if (status === "FAILED" || status === "CANCELLED") return "error";
    if (status === "PENDING" || !status) return "queued";
    if (status === "SUBMITTED") return "submitted";
    // PROCESSING: split into two sub-phases using elapsed time
    if (elapsedMs < ESTIMATED_TOTAL_MS * 0.75) return "rendering";
    return "polishing";
  }, [job?.status, elapsedMs, errorMessage]);

  // ─── Progress percentage (smooth, time-aware) ─────────
  // Uses the asymptotic curve pattern from upscale.tsx — feels responsive
  // until ~95% then slows so the user isn't stuck on "99% complete".
  const targetProgress = useMemo(() => {
    if (phase === "ready") return 100;
    if (phase === "error") return 100;
    if (phase === "queued") return 6;
    if (phase === "submitted") return 14;
    const linear = Math.min(1, elapsedMs / ESTIMATED_TOTAL_MS);
    if (phase === "rendering") return Math.round(14 + linear * 70);
    // polishing — creep to 95
    return Math.min(95, Math.round(84 + linear * 11));
  }, [phase, elapsedMs]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: targetProgress,
      duration: theme.motion.duration.glacial, // ~560ms — matches token scale
      easing: theme.motion.easing.exit,
      useNativeDriver: false,
    }).start();
  }, [targetProgress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  // ─── Style info card data ─────────────────────────────
  const styleName = job?.designStyleName ?? null;
  const styleDescription = useMemo(() => {
    if (!styleName) return t("generation.style_hint_generic");
    const key = normalizeStyleKey(styleName);
    const translated = t(`styles.${key}`, { defaultValue: "" });
    return translated && translated !== `styles.${key}`
      ? translated
      : t("generation.style_hint_generic");
  }, [styleName, t]);

  const spinStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [0, 360],
          outputRange: ["0deg", "360deg"],
        }),
      },
    ],
  };

  const handleClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/studio" as any);
  };

  const handleRetry = () => {
    router.replace({
      pathname: "/(tabs)/studio/review" as any,
      params: errorMessage ? { error: errorMessage } : {},
    });
  };

  const phaseLabel = t(`generation.phase_${phase === "error" ? "ready" : phase}`);
  const title = errorMessage ? t("generation.failed") : t("generation.creating");

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface">
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Brand variant="inline" size="sm" tone="gold" />
        <Pressable
          onPress={handleClose}
          className="items-center justify-center rounded-full"
          style={{
            width: 40,
            height: 40,
            backgroundColor: theme.color.surfaceContainerHigh,
          }}
        >
          <Ionicons name="close" size={20} color={theme.color.onSurface} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero spinner */}
        <View
          className="items-center justify-center"
          style={{ width: "100%", height: 200, marginTop: 12 }}
        >
          {/* Outer static ring */}
          <View
            className="absolute rounded-full"
            style={{
              width: 180,
              height: 180,
              borderWidth: 1,
              borderColor: "rgba(153,143,131,0.18)",
            }}
          />
          {/* Pulsing warm glow */}
          <Animated.View
            className="absolute rounded-full"
            style={{
              width: 160,
              height: 160,
              borderWidth: 1,
              borderColor: "#C4A882",
              opacity: pulse,
              shadowColor: "#FEDFB5",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 24,
            }}
          />
          {/* Spinning gold arc */}
          <Animated.View
            style={[
              {
                position: "absolute",
                width: 180,
                height: 180,
                borderRadius: 90,
                borderWidth: 2,
                borderColor: "transparent",
                borderTopColor: "#FEDFB5",
                borderRightColor: "rgba(254,223,181,0.3)",
              },
              spinStyle,
            ]}
          />
          {/* Center icon reflects current phase */}
          <PhaseIcon phase={phase} />
        </View>

        {/* Title */}
        <Text
          className="font-headline text-on-background text-center mt-10"
          style={{ fontSize: 28, letterSpacing: -0.3, fontStyle: "italic" }}
        >
          {title}
        </Text>

        {/* Phase label (live) */}
        <Text
          className="text-center mt-4"
          style={{
            fontFamily: "Inter",
            fontSize: 11,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            color: phase === "error" ? "#FFB4AB" : "#E0C29A",
          }}
        >
          {errorMessage ?? phaseLabel}
        </Text>

        {/* Progress bar */}
        <View className="mt-8 mx-2">
          <View
            className="overflow-hidden rounded-full"
            style={{ height: 3, backgroundColor: "rgba(77,70,60,0.25)" }}
          >
            <Animated.View style={{ height: "100%", width: progressWidth }}>
              <LinearGradient
                colors={
                  phase === "error" ? ["#93000A", "#FFB4AB"] : ["#C4A882", "#FEDFB5"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flex: 1,
                  borderRadius: 9999,
                  shadowColor: "#FEDFB5",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                }}
              />
            </Animated.View>
          </View>

          {/* Elapsed / percentage row */}
          <View className="flex-row justify-between items-center mt-3">
            <Text
              className="font-label"
              style={{
                fontSize: 10,
                color: "rgba(209,197,184,0.6)",
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {t("generation.elapsed_label")} · {formatElapsed(elapsedMs, t)}
            </Text>
            <Text
              className="font-headline"
              style={{
                fontSize: 14,
                color: phase === "error" ? "#FFB4AB" : "#FEDFB5",
              }}
            >
              {errorMessage ? "—" : `${Math.min(100, targetProgress)}%`}
            </Text>
          </View>
        </View>

        {/* Retry button (error-only) */}
        {errorMessage && (
          <Pressable
            onPress={handleRetry}
            className="mt-8 self-center rounded-xl"
            style={{
              paddingHorizontal: 24,
              paddingVertical: 14,
              backgroundColor: "#2A2A2A",
              borderWidth: 1,
              borderColor: "rgba(196,168,130,0.3)",
            }}
          >
            <Text
              className="font-label text-secondary"
              style={{
                fontSize: 12,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: "600",
              }}
            >
              {t("common.try_again")}
            </Text>
          </Pressable>
        )}

        {/* Style info card */}
        {!errorMessage && styleName && (
          <StyleInfoCard
            title={t("generation.about_this_style")}
            styleName={styleName}
            description={styleDescription}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function PhaseIcon({ phase }: { phase: Phase }) {
  const base = { size: 40, color: "#FEDFB5" } as const;
  switch (phase) {
    case "queued":
      return <Ionicons name="hourglass-outline" size={base.size} color={base.color} />;
    case "submitted":
      return <Ionicons name="cloud-upload-outline" size={base.size} color={base.color} />;
    case "rendering":
      return <Ionicons name="color-palette-outline" size={base.size} color={base.color} />;
    case "polishing":
      return <Ionicons name="sparkles-outline" size={base.size} color={base.color} />;
    case "ready":
      return <Ionicons name="checkmark-circle" size={base.size} color="#4CAF50" />;
    case "error":
      return <Ionicons name="alert-circle" size={base.size} color="#FFB4AB" />;
  }
}

function StyleInfoCard(props: {
  title: string;
  styleName: string;
  description: string;
}) {
  return (
    <View
      className="rounded-xl overflow-hidden mt-10"
      style={{ backgroundColor: "#1C1B1B", padding: 28 }}
    >
      <View
        className="flex-row items-center justify-between pb-4 mb-5"
        style={{ borderBottomWidth: 1, borderBottomColor: "rgba(77,70,60,0.18)" }}
      >
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 11,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            color: "#E0C29A",
          }}
        >
          {props.title}
        </Text>
        <Ionicons name="sparkles-outline" size={16} color="#D1C5B8" />
      </View>

      <Text
        className="font-headline text-on-surface"
        style={{ fontSize: 22, lineHeight: 28, marginBottom: 12 }}
      >
        {props.styleName}
      </Text>

      <Text
        className="font-body text-on-surface-variant"
        style={{ fontSize: 14, lineHeight: 22, fontStyle: "italic" }}
      >
        {props.description}
      </Text>
    </View>
  );
}

/**
 * Reduces a user-facing style name (e.g. "Mid-Century Modern", "Art Déco")
 * down to the translation-registry key format: snake_case, ASCII-only.
 */
function normalizeStyleKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatElapsed(ms: number, t: (k: string, o?: any) => string): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  if (totalSec < 60) return t("generation.seconds_short", { count: totalSec });
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (secs === 0) return t("generation.minutes_short", { count: mins });
  return t("generation.minutes_seconds", { mins, secs });
}
