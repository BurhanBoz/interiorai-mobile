import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDismissible } from "@/hooks/useDismissible";
import { OneShotSpotlight } from "@/components/ui/OneShotSpotlight";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useStudioStore } from "@/stores/studioStore";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { getFileDownloadUrl } from "@/services/files";
import { useTranslation } from "react-i18next";
import { useJobPolling } from "@/hooks/useJobPolling";
import { usePendingGenerationStore } from "@/stores/pendingGenerationStore";
import { useCreditStore } from "@/stores/creditStore";
import { useGenerate } from "@/hooks/useGenerate";
import { usePushPermissionAsk } from "@/hooks/usePushRegistration";
import { useCatalogLabel } from "@/hooks/useCatalogLabel";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { ScanCard } from "@/components/generation/ScanCard";
import { GoldProgressBar } from "@/components/generation/GoldProgressBar";
import { theme } from "@/config/theme";
import type { JobResponse } from "@/types/api";

const U = theme.umber;

/**
 * Maps raw API status + elapsed time to a single visual phase the user can read.
 * Each phase owns a label and a percentage range.
 *
 * The backend exposes status transitions PENDING → SUBMITTED → PROCESSING → COMPLETED,
 * so we mirror those instead of relying on a fake timer loop like the previous version.
 * Within PROCESSING we still animate through sub-phases so the copy doesn't feel frozen
 * during the long render window.
 *
 * v3 look (redesign, 2026-10-10): the spinner rings are gone. The user's own
 * room fills the screen blurred and darkened, falling to the ground; the same
 * photo sits sharp in a gold-edged card with a gold scan line sweeping down it
 * (ScanCard), over "Designing your <room>", "<style> · about a minute" and a
 * thin gold bar (GoldProgressBar) that shows the same progress value as
 * before. The live phase moved into the bar's accessibility label. Reduce
 * Motion rests the band at the current progress instead of looping.
 */
type Phase = "planning" | "queued" | "submitted" | "rendering" | "polishing" | "ready" | "error";

/** Claude reads the photo and writes the plan before the server answers (Sonnet, 2026-10-05: 40-75 s). */
const ESTIMATED_PLANNING_MS = 50_000;

const ESTIMATED_TOTAL_MS = 45_000; // Avg job time — tuned to ControlNet Hough median

export default function GenerationProgressScreen() {
  // Retry replays the SAME request through the money path — same key, so a
  // transient failure cannot become a second charge.
  const { generate } = useGenerate();
  const { t, i18n } = useTranslation();
  const reduceMotion = useReduceMotion();
  const catalogLabel = useCatalogLabel();
  const { jobId: jobIdParam, pending } = useLocalSearchParams<{ jobId?: string; pending?: string }>();
  // Opened by Generate before the job exists: the request finishes here (pendingGenerationStore).
  const pendingRequest = usePendingGenerationStore((s) =>
    pending && s.current?.id === pending ? s.current : null,
  );
  const jobId = jobIdParam ?? pendingRequest?.jobId ?? undefined;
  const planning = !jobId && !!pendingRequest && !pendingRequest.error;

  const fetchBalance = useCreditStore((s) => s.fetchBalance);

  const [job, setJob] = useState<JobResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // "Want a reminder?" lives here since 2.3.3 (owner's call): the minute the
  // design takes is the natural moment for "we'll tell you when it's done",
  // and it keeps the result screen for the rating alone. First generation
  // only, 3.5 s in, once per install — the hook rations it.
  // From the moment the screen opens, not from the job id: the id arrives only after the plan
  // (most of the minute), so waiting for it put the question right before the result and,
  // with the hook's own 3.5 s delay, on top of the first-result paywall (simulator, 10 Oct).
  usePushPermissionAsk((planning || !!jobId) && !errorMessage);

  // The room being worked on, blurred behind the progress (2026-10-05): the
  // minute-long wait reads as "my room is being designed", not a bare spinner.
  // Opened by Generate it is the studio's own photo (already on the device);
  // opened from the gallery it is the job's input through the file proxy.
  const authHeaders = useAuthHeaders();
  const studioPhotoUri = useStudioStore((s) => s.photo?.uri ?? null);
  const studioRoomName = useStudioStore((s) => s.roomType?.name ?? null);
  const studioStyleName = useStudioStore((s) => s.designStyle?.name ?? null);
  const jobInputId = job?.inputFile?.id ?? null;
  const backdrop = pending && studioPhotoUri
    ? { uri: studioPhotoUri }
    : jobInputId && authHeaders.Authorization
      ? { uri: getFileDownloadUrl(jobInputId), headers: authHeaders }
      : null;

  const startedAt = useRef<number>(Date.now());
  // The render's own clock: the phases after planning are timed from the moment the job exists.
  const jobStartedAt = useRef<number | null>(jobIdParam ? Date.now() : null);
  if (jobId && jobStartedAt.current == null) jobStartedAt.current = Date.now();
  const renderElapsedMs = jobStartedAt.current == null ? 0 : Math.max(0, startedAt.current + elapsedMs - jobStartedAt.current);

  useEffect(() => {
    if (pendingRequest?.error) setErrorMessage(pendingRequest.error);
  }, [pendingRequest?.error]);

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
        // Backend releases the reserved credits on failure — refresh the
        // wallet HERE too, or the header keeps showing the pre-refund
        // balance and users read it as "it failed AND ate my credits"
        // (2026-07-07 tester report).
        fetchBalance();
        // 🔴 NOT polled.errorMessage. That field carries the provider's own
        // string, and a failed render was showing the user
        // `Replicate API error 401 UNAUTHORIZED: {"title":"Unauthenticated"…}` —
        // our vendor's name and its JSON, in place of an explanation. The raw
        // text goes to the log, where it is useful; the screen says what
        // happened and that the credits came back, which is the thing testers
        // ask about first (2026-07-07 report).
        if (polled.errorMessage) {
          console.warn("[generation] job failed:", polled.errorCode, polled.errorMessage);
        }
        setErrorMessage(t("generation.failed_body"));
      } else if (polled.status === "CANCELLED") {
        fetchBalance();
        setErrorMessage(t("history.status_cancelled"));
      }
    },
    3000,
    {
      // 3-min hard cap: if the backend still hasn't terminated, surface the
      // generic recoverable error so the user isn't stranded. The backend's
      // own JobPollingService releases the reserved credits when its
      // matching timeout trips, so wallet stays correct.
      onTimeout: () => {
        fetchBalance();
        setErrorMessage(
          t("generation.timeout_generic", {
            defaultValue: "Unexpected error. Please try again.",
          }),
        );
      },
    },
  );

  const phase: Phase = useMemo(() => {
    if (errorMessage) return "error";
    if (planning) return "planning";
    const status = job?.status;
    if (status === "COMPLETED") return "ready";
    if (status === "FAILED" || status === "CANCELLED") return "error";
    if (status === "PENDING" || !status) return "queued";
    if (status === "SUBMITTED") return "submitted";
    // PROCESSING: split into two sub-phases using elapsed time
    if (renderElapsedMs < ESTIMATED_TOTAL_MS * 0.75) return "rendering";
    return "polishing";
  }, [job?.status, renderElapsedMs, errorMessage, planning]);

  // ─── Progress percentage (smooth, time-aware) ─────────
  // Uses the asymptotic curve pattern from upscale.tsx — feels responsive
  // until ~95% then slows so the user isn't stuck on "99% complete".
  const targetProgress = useMemo(() => {
    if (phase === "ready") return 100;
    if (phase === "error") return 100;
    if (phase === "planning") return Math.round(2 + Math.min(1, elapsedMs / ESTIMATED_PLANNING_MS) * 10);
    if (phase === "queued") return 12;
    if (phase === "submitted") return 14;
    const linear = Math.min(1, renderElapsedMs / ESTIMATED_TOTAL_MS);
    if (phase === "rendering") return Math.round(14 + linear * 70);
    // polishing — creep to 95
    return Math.min(95, Math.round(84 + linear * 11));
  }, [phase, elapsedMs, renderElapsedMs]);

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

  const handleClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/studio" as any);
  };

  /**
   * Retry re-runs the same request. It does not navigate.
   *
   * <p>It used to replace this screen with the old "Step 3 / 3" options
   * wizard — a screen the composer replaced — so a failed generation dropped
   * the user into an interface that no longer exists anywhere else in the
   * app, and asked them to find Generate again.
   *
   * <p>The studio store still holds every selection, so the honest retry is
   * the same call that failed: {@link useGenerate}, which mints and REUSES
   * the idempotency key. A retap after a transient error therefore replays
   * the same key and the backend returns the existing job rather than
   * starting — and charging for — a second one.
   */
  const handleRetry = () => {
    // Replace, not push: the retry's own progress screen takes this one's place.
    setErrorMessage(null);
    generate({ replace: true });
  };

  // "About this style" is a first-generation teaching card (2026-07 tester
  // ask): show once, dismissible via its X, never again after — the spinner
  // block then centers in the freed space on every later run.
  // Keyed PER STYLE (2026-07 founder spec): the first Modern run teaches
  // Modern once; the next Modern shows nothing, while a first Japandi run
  // still gets its own card. The key follows the style, not the screen.
  const styleSlug = (styleName ?? "generic").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const [styleHintVisible, dismissStyleHint] = useDismissible(
    `generation_style_hint_seen_${styleSlug}`,
  );
  // Seen-once semantics (2026-07 founder spec): the card counting as "seen"
  // must not depend on the user finding the X — once it has been SHOWN for
  // a style, leaving the screen marks it permanently. X remains the early
  // hide within the same run.
  const shownRef = useRef(false);
  if (!errorMessage && !!styleName && styleHintVisible) shownRef.current = true;
  useEffect(() => {
    return () => {
      if (shownRef.current) dismissStyleHint();
    };
  }, [dismissStyleHint]);
  const showStyleHint = !errorMessage && !!styleName && styleHintVisible;

  const phaseLabel = t(`generation.phase_${phase === "error" ? "ready" : phase}`);

  // v3 title: "Designing your living room". The room comes from the studio
  // while the request is still planning here, from the job once it exists.
  const roomName = catalogLabel("room", job?.roomTypeName ?? (pending ? studioRoomName : null));
  const styleLabel = catalogLabel("style", job?.designStyleName ?? (pending ? studioStyleName : null));
  const title = errorMessage
    ? t("generation.failed")
    : roomName
      ? t("generation.designing_room", {
          room: i18n.language?.startsWith("en") ? roomName.toLowerCase() : roomName,
        })
      : t("generation.creating");
  const subline = errorMessage
    ?? (styleLabel
      ? t("generation.style_about_a_minute", { style: styleLabel })
      : t("generation.about_a_minute"));

  return (
    <View style={{ flex: 1, backgroundColor: U.ground }}>
      {/* The room, blurred and darkened, falling to the ground at the bottom. */}
      {backdrop ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <Image
            source={backdrop}
            blurRadius={36}
            contentFit="cover"
            transition={400}
            style={{ width: "100%", height: "100%", opacity: 0.8 }}
          />
          <LinearGradient
            colors={["rgba(25,21,16,0.55)", "rgba(25,21,16,0.45)", U.ground]}
            locations={[0, 0.45, 1]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </View>
      ) : null}
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        {/* Top bar — brand + close on photo chrome */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: theme.v2Layout.gutterWide,
            paddingTop: 4,
          }}
        >
          <Text
            style={{ ...theme.v2.brand, color: U.accent }}
            accessibilityRole="header"
          >
            Roomframe
          </Text>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            hitSlop={6}
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.v2Layout.radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: U.photoChrome,
              borderWidth: 1,
              borderColor: U.photoChromeBorder,
            }}
          >
            <Ionicons name="close" size={18} color={U.ink} />
          </Pressable>
        </View>

        {/* Center — the room under the scan line, title, line, bar */}
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: theme.v2Layout.gutterWide,
          }}
        >
          <ScanCard
            source={backdrop}
            scanning={!errorMessage && phase !== "ready"}
            ready={phase === "ready"}
            reduceMotion={reduceMotion}
            progress={targetProgress}
            accessibilityLabel={roomName || undefined}
          />

          <View style={{ alignItems: "center", marginTop: 28 }}>
            <Text
              style={{ ...theme.v2.displayS, color: U.ink, textAlign: "center" }}
              accessibilityRole="header"
            >
              {title}
            </Text>
            <Text
              style={{
                ...theme.v2.body,
                fontSize: 14,
                lineHeight: 21,
                marginTop: 8,
                textAlign: "center",
                color: errorMessage ? "#FFB4AB" : U.inkMuted,
              }}
            >
              {subline}
            </Text>
          </View>

          <View style={{ marginTop: 28 }}>
            <GoldProgressBar
              value={errorMessage ? 100 : targetProgress}
              error={!!errorMessage}
              reduceMotion={reduceMotion}
              accessibilityLabel={errorMessage ?? phaseLabel}
            />
          </View>

          {/* Retry button (error-only) */}
          {errorMessage && (
            <Pressable
              onPress={handleRetry}
              accessibilityRole="button"
              style={{
                marginTop: 28,
                paddingHorizontal: theme.space.gutter,
                paddingVertical: 14,
                borderRadius: theme.v2Layout.radius.button,
                backgroundColor: U.photoChrome,
                borderWidth: 1,
                borderColor: theme.umber.lineAccent,
              }}
            >
              <Text style={{ ...theme.v2.button, color: U.accentBright }}>
                {t("common.try_again")}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Bottom — true: the job runs server-side and this screen recovers it on return. */}
        {!errorMessage ? (
          <Text
            style={{
              ...theme.v2.rowQuiet,
              color: U.inkMuted,
              textAlign: "center",
              paddingHorizontal: theme.v2Layout.gutterWide,
              paddingBottom: 20,
            }}
          >
            {t("generation.leave_app_hint")}
          </Text>
        ) : null}

        {/* "About this style" — one-shot SPOTLIGHT (2026-07-15 founder spec).
            Shown once per style; X or any tap dismisses, leaving the screen
            gets the same seen-once marking via shownRef above. */}
        <OneShotSpotlight
          visible={showStyleHint}
          onDismiss={dismissStyleHint}
          align="stretch"
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 14,
              marginBottom: 4,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(77,70,60,0.18)",
              marginRight: 26,
            }}
          >
            <Text
              style={{
                ...theme.text.caption,
                color: "#DDB477",
              }}
            >
              {t("generation.about_this_style")}
            </Text>
            <Ionicons name="sparkles-outline" size={16} color="#D1C5B8" />
          </View>
          <Text
            className="font-headline text-on-surface"
            style={{ ...theme.text.headline }}
          >
            {catalogLabel("style", styleName)}
          </Text>
          <Text
            className="font-body text-on-surface-variant"
            style={{ ...theme.text.body, fontStyle: "italic" }}
          >
            {styleDescription}
          </Text>
        </OneShotSpotlight>
      </SafeAreaView>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────

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

