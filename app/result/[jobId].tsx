/**
 * The result of a design (and, by early return, of a clip — VideoResult).
 *
 * <p><b>Redesign v3 (2026-10-10, owner's pick "4B · framed card").</b> One
 * large framed card shows the design; a BEFORE / AFTER pill on it replaces the
 * drag slider, and the fullscreen viewer is the same Modal as before. Under it,
 * in order: Save (gold, two thirds) + Share, the room video as a "Walk through
 * it" card, and "Try another style" as one row of thumbnails. Add furniture,
 * New design and the credits-refill reminder moved behind the header's "…"
 * menu — they are still one tap from the screen, but the screen itself shows
 * the design and its actions, nothing else (owner's rule). On arrival the
 * after wipes in over the before, then the actions rise in; Reduce Motion
 * shows the end state. Only layout and motion changed: the rating ladder, the
 * dwell timer, the output signals, the first-result paywall and the video
 * polling below are untouched.
 */
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Modal,
  StatusBar,
  Alert,
  AppState,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { theme } from "@/config/theme";
import { useCatalogStore } from "@/stores/catalogStore";
import { catalogName } from "@/utils/catalogI18n";
import { useCatalogLabel } from "@/hooks/useCatalogLabel";
import { getStyleImage } from "@/components/studio/styleImages";
import { useGenerate } from "@/hooks/useGenerate";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";

const U = theme.umber;
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useEffect, useRef, useMemo, useCallback, type ComponentProps } from "react";
import * as Notifications from "expo-notifications";
import { useJobPolling } from "@/hooks/useJobPolling";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useAuthStore } from "@/stores/authStore";
import { track } from "@/services/analytics";
import { TopBar } from "@/components/layout/TopBar";
import { getJob, sendOutputSignal } from "@/services/jobs";
import { usePendingVideoStore } from "@/stores/pendingVideoStore";
import { VideoResult } from "@/components/result/VideoResult";
import { getFileDownloadUrl, getOutputDownloadUrl } from "@/services/files";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useImageActions } from "@/hooks/useImageActions";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useCreditStore } from "@/stores/creditStore";
import { useStudioStore } from "@/stores/studioStore";
import { useEntitlement, useEffectiveWatermark, useEffectiveCreditRules, useEffectivePlanCode, useEffectiveFeatures } from "@/hooks/useEntitlement";
import { FreeWatermark } from "@/components/ui/FreeWatermark";
import { ZoomableImage } from "@/components/ui/ZoomableImage";
import type { JobResponse, JobOutputResponse, JobStatus } from "@/types/api";
import { useReviewPrompt, type ReviewTrigger } from "@/hooks/useReviewPrompt";
import { useSuccessCount } from "@/hooks/useSuccessCount";
import { useResumeNote } from "@/hooks/useResumeNote";
import { ResumeNote } from "@/components/ui/ResumeNote";
import { isPushAskOnScreen } from "@/hooks/usePushRegistration";
import { useAccountPrompt } from "@/hooks/useAccountPrompt";
import { useFirstResultPaywall } from "@/hooks/useFirstResultPaywall";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { ResultFrame } from "@/components/result/ResultFrame";
import { Rise } from "@/components/result/Rise";
import { WalkThroughCard } from "@/components/result/WalkThroughCard";
import { AnotherStyleRow } from "@/components/result/AnotherStyleRow";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_WIDTH = SCREEN_WIDTH - 48;
/**
 * The framed card: 470pt on an 844pt phone (the approved mockup), the same
 * share of the screen on a smaller one so the actions under it stay in view.
 */
const FRAME_HEIGHT = Math.min(470, Math.round(SCREEN_HEIGHT * 0.557));
/**
 * The actions rise in once the after starts its wipe — a little before it
 * lands, so the screen reads as one arrival rather than two. And never later
 * than the fallback: a slow or broken picture must not hide Save.
 */
const ACTIONS_AFTER_WIPE_MS = 480;
const ACTIONS_FALLBACK_MS = 1500;

/**
 * Resolve the image URL for display.
 *
 * Uses the pre-signed S3 URL returned by the backend in
 * {@code JobResponse.outputs[].url} (1-hour expiry, re-issued on every
 * job fetch). We deliberately do NOT go through the backend's
 * {@code /api/jobs/{id}/outputs/{outputId}/download} redirect endpoint
 * — iOS URLSession forwards the {@code Authorization: Bearer} header
 * to the S3 redirect target, which conflicts with S3's
 * {@code X-Amz-Signature} query-param auth and returns 403.
 *
 * The direct {@code output.url} is already presigned by the backend;
 * no auth header is required (or wanted — supplying one breaks S3).
 * The download proxy endpoint is still the right call for
 * save-to-photos / share flows where we intentionally pipe through
 * the backend for transaction logging.
 *
 * @param _jobId   unused — kept in signature so callers don't have to
 *                 re-plumb. Will be dropped in a future cleanup.
 * @param output   the output entity; {@code output.url} is used.
 */
function getOutputImageUrl(_jobId: string, output: JobOutputResponse): string {
  return output.url;
}

/**
 * Twenty minutes: the server's own watchdog for a clip
 * (app.jobs.video-timeout-minutes). Past it the server has already failed
 * and refunded the job; the next time this screen is focused it reads that.
 */
const VIDEO_POLL_TIMEOUT_MS = 20 * 60 * 1000;
/** Attention on a result that counts as a value signal for the rating (2.3.3). */
const RATING_DWELL_MS = 15 * 1000;

const isTerminalStatus = (s?: JobStatus | null) =>
  s === "COMPLETED" || s === "FAILED" || s === "CANCELLED";

const qualityLabelKeys: Record<string, string> = {
  STANDARD: "studio.quality_standard",
  HD: "studio.quality_hd",
  ULTRA_HD: "studio.quality_ultra_hd",
};

const modeLabelKeys: Record<string, string> = {
  REDESIGN: "studio.mode_redesign",
  EMPTY_ROOM: "studio.mode_empty_room",
  INPAINT: "studio.mode_inpaint",
  STYLE_TRANSFER: "studio.mode_style_transfer",
};

export default function ResultDetailScreen() {
  const { t, i18n } = useTranslation();
  const catalogLabel = useCatalogLabel();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [job, setJob] = useState<JobResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [seedCopied, setSeedCopied] = useState(false);
  // Tap on a generated image → fullscreen modal. Null = closed.
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  // Gate the upscale button by plan. CRITICAL: must use the EFFECTIVE
  // credit rules — during the 7-day welcome bonus the user is MAX-tier
  // server-side, so the FREE plan's rule table (which has NO
  // ULTRA_HD_UPSCALE rule) would wrongly lock the button and route the
  // user to /plans. useEffectiveCreditRules returns MAX plan's rules
  // during the trial, matching useEntitlement's feature override below.
  const creditRules = useEffectiveCreditRules();
  // Welcome-bonus-aware feature gating. useEntitlement returns
  // {enabled: true} during the 7-day MAX trial so trial users can use
  // ULTRA_HD_UPSCALE just like a MAX subscriber. Backend honours the same
  // override in ModelRoutingServiceImpl + JobServiceImpl.validateEntitlement.
  const { enabled: upscaleFeatureEnabled } = useEntitlement("ULTRA_HD_UPSCALE");
  const resetStudio = useStudioStore(s => s.reset);
  const setDesignStyle = useStudioStore(s => s.setDesignStyle);
  // The photo the studio holds. "Same room, another style" re-runs the studio
  // with a new style, so it is only the SAME room when that photo is this
  // render's own — see the strip below.
  const studioPhotoFileId = useStudioStore(s => s.photo?.fileId ?? null);
  // An "already upscaled" job is one where the feature_code itself is the
  // upscale chain (jobType="UPSCALE" on the backend → featureCode
  // "ULTRA_HD_UPSCALE"). Allowing a second upscale on top of that produces
  // diminishing visual returns + double-charges credits, and the underlying
  // model (`fermatresearch/high-resolution-controlnet-tile`) refuses 4K
  // input gracefully but slowly — the right product answer is to lock the
  // CTA so the user can't re-trigger the chain. We leave the button
  // visible as a "you already enhanced this" affordance rather than
  // hiding it (hiding would confuse users into thinking they lost
  // access). Pressed while disabled is a no-op.
  const isAlreadyUpscaled = job?.featureCode === "ULTRA_HD_UPSCALE";
  // Effective upscale cost (FLUX MAX rules → 7 cr, PRO → 5 cr, etc.). Shown
  // on the button subtitle and in the pre-flight confirmation so the user
  // never gets debited without knowing the amount up front.
  const upscaleCost =
    creditRules.find(r => r.featureCode === "ULTRA_HD_UPSCALE")?.creditCost ?? null;
  const canUpscale =
    !isAlreadyUpscaled && upscaleFeatureEnabled && upscaleCost != null;
  // IO-1 Expand (V57) — enabled on every active plan; hidden on chain jobs
  // (jobType UPSCALE/EXPAND → featureCode tells us) because the backend
  // rejects chain-of-chain in both directions.
  const { enabled: expandFeatureEnabled } = useEntitlement("EXPAND_VIEW");
  const isChainJob =
    job?.featureCode === "ULTRA_HD_UPSCALE" || job?.featureCode === "EXPAND_VIEW";
  const expandCost =
    creditRules.find(r => r.featureCode === "EXPAND_VIEW")?.creditCost ?? null;
  const canExpand = !isChainJob && expandFeatureEnabled && expandCost != null;
  // Resolution the upscale delivers: PRO (top tier) = 4K Topaz 4x; the 2K
  // branch only serves legacy sandbox tiers. Surfaced in the confirm dialog
  // + button so the user sees the real target before spending credits.
  const effectiveTier = useEffectivePlanCode();
  const upscaleResolution = effectiveTier === "PRO" ? "4K" : "2K";

  /* ── Room video (V183) ─────────────────────────────────────────────
   *
   * Gated through plan_features (ROOM_VIDEO) — BASE and PRO since V187 —
   * read through the same trial-aware hook every other gate uses. The price
   * comes from the effective rules first; FREE has no ROOM_VIDEO rule, so it
   * falls back to the feature's own creditsPerUse (15), the number the locked
   * button shows beside its lock. The backend re-checks all of it and
   * answers 403 PLAN_UPGRADE_REQUIRED if the client is wrong.
   */
  const { enabled: videoFeatureEnabled } = useEntitlement("ROOM_VIDEO");
  const effectiveFeatures = useEffectiveFeatures();
  const videoCost =
    creditRules.find((r) => r.featureCode === "ROOM_VIDEO")?.creditCost
    ?? effectiveFeatures.find((f) => f.featureCode === "ROOM_VIDEO")?.creditsPerUse
    ?? null;
  const canAfford = useCreditStore((s) => s.canAfford);
  const fetchBalance = useCreditStore((s) => s.fetchBalance);
  // The clip is created on its own screen now (video-progress); nothing here is ever mid-request.
  const videoSubmitting = false;
  // The clip of this render, and the button IS its status. Seeded from the
  // server's answer on the job (videoJobId / videoStatus), set the moment
  // the user starts one, and kept current by polling while it renders.
  //
  // 🔴 The polling is the fix for 2026-09-25: the button said "Video
  // hazırlanıyor" and stayed that way after the clip had finished, because
  // nothing on this screen ever looked at the clip again.
  const [video, setVideo] = useState<{ id: string; status: JobStatus } | null>(null);
  const [isFocused, setIsFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );
  // Whether this device will hear about the finished clip — decides which
  // promise the in-progress button makes (a push, or just the gallery).
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  const videoFailureShown = useRef<string | null>(null);

  // Watermark — FREE plan adds a corner watermark; paid plans AND welcome
  // bonus trial users do not. useEffectiveWatermark mirrors the backend's
  // WatermarkServiceImpl.applyWatermarkIfNeeded welcome-bonus bypass.
  const showWatermark = useEffectiveWatermark();
  const flatListRef = useRef<FlatList>(null);
  const authHeaders = useAuthHeaders();

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      try {
        const data = await getJob(jobId);
        console.log("[Result] Job response:", JSON.stringify(data, null, 2));
        setJob(data);
      } catch (err) {
        console.log("[Result] Error fetching job:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  // Back on this screen from anywhere — the clip, the gallery, a push —
  // read the job again. The screen stays mounted underneath the clip it
  // opened, so without this it kept the state it had when it was left.
  // The first focus is the mount above; only the returns re-read.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        return;
      }
      if (!jobId) return;
      getJob(jobId).then(setJob).catch(() => {});
    }, [jobId]),
  );

  // The server's word on this render's clip. A clip this visit already
  // followed to its end is not overwritten by an older read of the job.
  useEffect(() => {
    const id = job?.videoJobId;
    if (!id) return;
    setVideo((prev) =>
      prev && prev.id === id && isTerminalStatus(prev.status)
        ? prev
        : { id, status: job?.videoStatus ?? "PENDING" });
  }, [job?.videoJobId, job?.videoStatus]);

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then((p) => setPushGranted(p.status === "granted"))
      .catch(() => setPushGranted(false));
  }, []);

  // While the clip renders, look at it. Every five seconds is plenty for a
  // job measured in minutes; twenty minutes matches the server's own
  // watchdog for a clip (app.jobs.video-timeout-minutes), after which the
  // server has failed and refunded it and the next focus reads that.
  useJobPolling(
    // Only while this screen is in front: with the clip's own progress screen on top, that
    // screen follows the clip, and two pollers meant two failure alerts.
    isFocused && video && !isTerminalStatus(video.status) ? video.id : null,
    (polled) => {
      setVideo({ id: polled.id, status: polled.status });
      if (polled.status === "COMPLETED") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchBalance().catch(() => {});
      } else if (
        (polled.status === "FAILED" || polled.status === "CANCELLED")
        && videoFailureShown.current !== polled.id
      ) {
        videoFailureShown.current = polled.id;
        fetchBalance().catch(() => {});
        Alert.alert(t("generation.failed"), t("generation.video_failed_body"));
      }
    },
    5000,
    { timeoutMs: VIDEO_POLL_TIMEOUT_MS },
  );

  const outputs = job?.outputs ?? [];
  const currentOutput = outputs[activeIndex];

  // Post-result prompts: the offer (1st result, below), the notification ask
  // (1st, once the offer has closed), the account ask (5th, guests, when enabled) — and the rating,
  // which is keyed to a value signal rather than a visit number.
  const firstResultBeforeUrl = job?.inputFile?.id ? getFileDownloadUrl(job.inputFile.id) : "";
  const firstResultAfterUrl = job && currentOutput ? getOutputImageUrl(job.id, currentOutput) : undefined;
  useFirstResultPaywall(job, firstResultAfterUrl, firstResultBeforeUrl);
  // RATING FIRST (2.3.3, owner's rule): this screen asks for the rating and
  // nothing else before it. The notification question moved to the progress
  // screen (usePushPermissionAsk there); the account ask waits until the
  // rating has had its turn — asked and left alone for a moment, or ruled out
  // (budget spent, too soon, unavailable) — and the rating in turn waits for
  // anything still on screen, so no two sheets stack.
  const otherAskOnScreen = useRef(false);
  // v3: the header's "…" menu is an action sheet — while it is up, the system
  // rating sheet would land on top of a choice the user is making.
  const menuOnScreen = useRef(false);

  // THE RATING WAITS; IT DOES NOT STAND DOWN (2.0.0)
  //
  // Until 1.7.1 the rating gave up whenever another prompt had "claimed" the
  // visit, and the claims outlived the prompts. The where-did-you-hear sheet
  // left this screen in the 19 September redesign (0243ec2) but its claim
  // did not: its flag could never be set again, so from the third result on
  // every visit was "claimed" and the people most likely to rate were never
  // asked. The first-result paywall claimed the whole first visit, even after
  // it had closed. The owner's call is that the rating must reach people, so
  // the only question left is the one iOS actually cares about — is anything
  // on screen RIGHT NOW that the system sheet would be refused over? — and
  // useReviewPrompt re-asks it until the answer is no.
  const screenFocused = useRef(true);
  useFocusEffect(
    useCallback(() => {
      // A paywall, the welcome screen after a purchase, a clip: while any of
      // them is on top, this screen is not the one the user is looking at.
      screenFocused.current = true;
      return () => { screenFocused.current = false; };
    }, []),
  );
  // The first value signal of this visit wins; later ones do not restart the
  // ask's schedule (2.3.3: the signal names its trigger for `rating_asked`).
  const [valueSignal, setValueSignal] = useState<ReviewTrigger | null>(null);
  const signalValue = useCallback(
    (trigger: ReviewTrigger) => setValueSignal((v) => v ?? trigger),
    [],
  );
  // Back from a purchase this screen started (2.0.0): the video button, or a
  // style in the "another style" strip that ran into an empty wallet.
  const [resumeVideo, hideResumeVideo] = useResumeNote(["RESULT_VIDEO"]);
  const [resumeRestyle, hideResumeRestyle] = useResumeNote(["GENERATE"]);
  // Stable, so the clip's watched-timer is not restarted by every render here.
  const markValue = useCallback(() => signalValue("video"), [signalValue]);

  // MORE DOORS TO THE RATING (2.3.3)
  //
  // Save and share were the only value signals, and in the 30 days to
  // 9 October 152 people generated, 6 saved and nobody shared — the ask could
  // reach seven people a month, and every storefront we advertise in showed
  // zero ratings. Two more signs that a render was worth looking at, both on
  // the user's own time: the second result this install has viewed (one in
  // five users gets there), and fifteen seconds of attention on a result.
  // The fullscreen viewer is the third, in openFullscreen below.
  const successCount = useSuccessCount(outputs.length > 0);
  useEffect(() => {
    if (successCount >= 2) signalValue("second_result");
  }, [successCount, signalValue]);
  useEffect(() => {
    if (outputs.length === 0) return;
    const timer = setTimeout(() => {
      if (screenFocused.current && AppState.currentState === "active") signalValue("dwell");
    }, RATING_DWELL_MS);
    return () => clearTimeout(timer);
  }, [outputs.length, signalValue]);
  const ratingTurn = useReviewPrompt(valueSignal, () =>
    !screenFocused.current
    || otherAskOnScreen.current // the account alert
    || isPushAskOnScreen()      // the progress screen's question, if it is still up
    || fullscreenUrl != null    // the fullscreen viewer is a Modal
    || menuOnScreen.current,    // the header's "…" action sheet (v3)
  );
  const accountAskOnScreen = useAccountPrompt(outputs.length > 0 && ratingTurn === "clear");
  otherAskOnScreen.current = accountAskOnScreen;

  /* ── The arrival (v3) ──────────────────────────────────────────────
   *
   * The card wipes the after in over the before (ResultFrame), and the
   * actions rise in behind it. Pure presentation: nothing here feeds the
   * rating, the dwell timer above (which counts from the outputs arriving,
   * not from the animation ending) or the first-result paywall's own clock.
   * `actionsShown` only ever turns true; the fallback guarantees Save is on
   * screen within 1.5 s of the result even if the picture never loads.
   */
  const reduceMotion = useReduceMotion();
  const [actionsShown, setActionsShown] = useState(false);
  useEffect(() => {
    if (outputs.length === 0 || actionsShown) return;
    if (reduceMotion) {
      setActionsShown(true);
      return;
    }
    const timer = setTimeout(() => setActionsShown(true), ACTIONS_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [outputs.length, actionsShown, reduceMotion]);
  const arrivalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (arrivalTimer.current) clearTimeout(arrivalTimer.current);
  }, []);
  const handleArrived = useCallback(() => {
    if (arrivalTimer.current) return;
    arrivalTimer.current = setTimeout(() => setActionsShown(true), ACTIONS_AFTER_WIPE_MS);
  }, []);

  // How long the result actually held attention (V74). Without this the
  // only thing we could see was that 11% of people downloaded, which says
  // nothing about the other 89% — a render nobody wanted and a render
  // nobody looked at produced identical data.
  //
  // Measured per output: switching between variants closes one window and
  // opens the next, so two variants viewed for a minute each read as two
  // minutes across two outputs rather than one blurred total. Sent on the
  // way out (unmount, or the app going to background) because that is the
  // only moment the duration is known.
  const viewedId = currentOutput?.id;
  useEffect(() => {
    if (!viewedId) return;
    const openedAt = Date.now();
    let sent = false;
    const flush = () => {
      if (sent) return;
      sent = true;
      const dwell = Date.now() - openedAt;
      // Under a second is a swipe passing through, not a view.
      if (dwell >= 1000) sendOutputSignal(viewedId, "VIEW", dwell);
    };
    const sub = AppState.addEventListener("change", (st) => {
      if (st !== "active") flush();
    });
    return () => {
      sub.remove();
      flush();
    };
  }, [viewedId]);



  /**
   * Build the image source for expo-image.
   *
   * No {@code headers} — the URI is a pre-signed S3 URL
   * (see {@link getOutputImageUrl}). Supplying an Authorization
   * header forces S3 to refuse the request (403 — mixed auth
   * mechanisms).
   */
  const getImageSource = (output: JobOutputResponse) => ({
    uri: getOutputImageUrl(job!.id, output),
  });

  const { saveToPhotos, shareImage, isDownloading, isSharing } =
    useImageActions();

  const handleShare = async () => {
    const url = currentOutput
      ? getOutputImageUrl(job!.id, currentOutput)
      : undefined;
    if (!url) return;
    // Sharing is as strong a vote as saving — the render is leaving the
    // app either way — and until V74 it fired no signal at all, so every
    // user who sent a design to WhatsApp counted as someone who did
    // nothing with it.
    if (currentOutput?.id) sendOutputSignal(currentOutput.id, "SHARE");
    // The server already counts THAT a share happened. What it cannot see is
    // how often, against how many saves — the ratio that says whether making
    // the share carry a link is worth doing at all.
    track("result_shared", {
      style: job?.designStyleName ?? null,
      feature: job?.featureCode ?? null,
    });
    signalValue("share");
    // Share the actual image file (downloaded from the pre-signed S3
    // URL), not just the URL string. iMessage / WhatsApp / Mail get a
    // real attachment instead of a paste-this-into-a-browser link.
    // No auth headers — the URL is pre-signed (see getOutputImageUrl).
    await shareImage(url, {
      nameHint: job?.designStyleName?.toLowerCase().replace(/\s+/g, "-"),
    });
  };

  const handleDownload = async () => {
    const url = currentOutput
      ? getOutputImageUrl(job!.id, currentOutput)
      : undefined;
    if (!url) return;
    // C1: a download is the strongest quality vote we have — the user is
    // taking this render OUT of the app. Fire-and-forget by contract.
    if (currentOutput?.id) sendOutputSignal(currentOutput.id, "DOWNLOAD");
    signalValue("save");
    // No auth headers — see getOutputImageUrl.
    await saveToPhotos(url, {
      nameHint: job?.designStyleName?.toLowerCase().replace(/\s+/g, "-"),
    });
  };

  /* ── "Same room, another style" ──────────────────────────────────
   *
   * Re-runs the generation the user is already looking at, with the photo
   * and room type they already chose and one style swapped. It goes through
   * useGenerate like every other charge — the style change does not make it
   * a different kind of transaction, and a second path to the wallet is a
   * second place for a double-charge to live.
   */
  const designStyles = useCatalogStore((s) => s.designStyles);
  const { generate, isSubmitting: restyling, cost: restyleCost } = useGenerate();
  // Which thumbnail is rendering, so the tap shows on the thing tapped.
  const [restyleCode, setRestyleCode] = useState<string | null>(null);

  const handleRestyle = async (code: string) => {
    hideResumeRestyle();
    const style = designStyles.find((s) => s.code === code);
    if (!style || restyling || videoSubmitting) return;
    Haptics.selectionAsync();
    setRestyleCode(code);
    setDesignStyle(style);
    try {
      // The style goes in explicitly — generate() would otherwise use the
      // style of the render it was built in (see useGenerate).
      await generate({ designStyle: style });
    } finally {
      setRestyleCode(null);
    }
  };

  /* ── The reminder toggle IS the notification opt-in ───────────────
   *
   * The OS prompt is requested HERE, on a switch the user just moved,
   * rather than at launch where it arrives before the app has earned it.
   * A refusal leaves the switch off — the toggle must never claim a
   * permission it did not get.
   */
  // 🔴 Bu anahtar da SUNUCUYA yazıyor. Eskiden cihazdaki bir boolean'ı
  // çeviriyordu, yani "Hatırlatma kapalı" diyen kullanıcıya hatırlatma
  // gitmeye devam ediyordu. Ayarlar'daki ana anahtarla aynı kancayı
  // paylaşıyor — tek gerçek, iki yüzey.
  const notifPrefs = useNotificationPrefs();
  const remind = notifPrefs.enabled === true;

  const handleRemindChange = async (next: boolean) => {
    Haptics.selectionAsync();
    if (next === remind) return;
    const now = await notifPrefs.toggle();
    if (next && !now) {
      Alert.alert(t("result.reminder_denied_title"), t("result.reminder_denied_body"));
    }
  };

  /**
   * Büyüt: üretilen görseli tam ekranda, yakınlaştırılabilir olarak açar.
   *
   * <p>Eskiden bu bir NAVİGASYONDU — /result/compare, yani ikinci bir
   * before/after kaydırıcısı. Kullanıcı zaten bir kaydırıcıya bakarken onu
   * ikinci bir kaydırıcıya götürüyordu ve dönüş yolu geri düğmesiydi; hedef
   * ekran da yeniden tasarlanmamış, eski dilde kalmıştı. Şimdi bir modal:
   * aynı yerin üstünde açılıyor, kapanınca hiçbir şey kaybolmuyor — sonuç
   * ekranı, kaydırıcının bırakıldığı yer, seçili stil, hepsi duruyor.
   */
  const openFullscreen = () => {
    if (!currentOutput || !job) return;
    // Looking closer is a value signal too (2.3.3); the ask waits for the
    // viewer to close — it is a Modal, see useReviewPrompt's isBlocked.
    signalValue("fullscreen");
    setFullscreenUrl(getOutputImageUrl(job.id, currentOutput));
  };

  /**
   * Yeni tasarım: Stüdyo'nun ilk ekranına döner.
   *
   * <p>🔴 Sonuç ekranının tek çıkışı sol üstteki geri okuydu ve o, üretim
   * ilerleme ekranına geri dönüyordu — yani biten bir işin ilerlemesine.
   * Kullanıcının buradan gitmek istediği tek yer bir sonraki tasarım.
   * push değil REPLACE: sonuç ekranı yığından düşüyor, böylece Stüdyo'dan
   * geri gelince bitmiş bir işin sonucuna düşülmüyor.
   */
  const handleNewDesign = () => {
    Haptics.selectionAsync();
    router.replace("/(tabs)/studio" as never);
  };

  /**
   * The header's "…" (v3): the three things that used to sit under the
   * design and did not fit the framed card — Add furniture, New design, and
   * the credits-refill reminder. Same handlers as before; only the door moved.
   * The reminder line says what the tap will do (turn it on / off), because a
   * menu row cannot show a switch's state.
   */
  const handleMore = () => {
    Haptics.selectionAsync();
    const items: { label: string; run: () => void }[] = [
      {
        label: t("studio.add_furniture"),
        run: () => router.push({ pathname: "/studio/composer", params: { sheet: "catalogue" } } as never),
      },
      { label: t("result.new_design"), run: handleNewDesign },
      {
        label: remind ? t("result.reminder_turn_off") : t("result.remind_me"),
        run: () => { void handleRemindChange(!remind); },
      },
    ];
    const done = (i: number | undefined) => {
      menuOnScreen.current = false;
      if (i != null && i < items.length) items[i].run();
    };
    menuOnScreen.current = true;
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...items.map((x) => x.label), t("common.cancel")],
          cancelButtonIndex: items.length,
          userInterfaceStyle: "dark",
        },
        done,
      );
    } else {
      Alert.alert(
        t("result.more_actions"),
        undefined,
        [
          ...items.map((x, i) => ({ text: x.label, onPress: () => done(i) })),
          { text: t("common.cancel"), style: "cancel" as const, onPress: () => done(undefined) },
        ],
        { cancelable: true, onDismiss: () => done(undefined) },
      );
    }
  };

  /**
   * The button's three faces, straight from the clip's status. A finished
   * clip is "watch" — a second tap on a finished render can never buy a
   * second clip — and a failed one is "make" again, its credits already back.
   */
  // A clip request still on its way to the server (video-progress, 10–40 s of Claude before the
  // row exists) counts as in progress — otherwise a second tap would start a second, paid clip.
  const videoCreating = usePendingVideoStore((s) => (job ? s.byParent[job.id]?.status === "creating" : false));
  const videoState: "make" | "progress" | "watch" =
    videoCreating ? "progress"
    : !video ? "make"
    : video.status === "COMPLETED" ? "watch"
    : video.status === "FAILED" || video.status === "CANCELLED" ? "make"
    : "progress";

  /**
   * Bring it to life — one tap, no dialog (owner decision 2026-09-24: the
   * price is already printed on the button). Three doors, in this order: a
   * finished clip is opened (nothing is charged); a plan below PRO goes to
   * the paywall; an empty wallet goes to the credits paywall. Otherwise the
   * clip is started and the user is free to leave: it renders in the
   * background, a push says when it is done, and it lands in the gallery.
   * Nobody waits on a screen — the first live clip was still rendering
   * after eight minutes.
   */
  const handleVideo = async () => {
    if (!job || !currentOutput || videoSubmitting) return;
    Haptics.selectionAsync();

    if (videoState === "watch" && video) {
      router.push(`/result/${video.id}` as never);
      return;
    }
    const imageUrl = getOutputImageUrl(job.id, currentOutput);
    if (videoState === "progress") {
      // Back to the wait it was left on — nothing new is started.
      router.push({
        pathname: "/generation/video-progress",
        params: { parentJobId: job.id, outputId: currentOutput.id, imageUrl, videoJobId: video?.id ?? "" },
      } as never);
      return;
    }
    hideResumeVideo();
    // The paywall shows THIS design as the thing about to move, and after a
    // purchase hands the user back here with a note beside this button.
    const videoPaywall = (source: "RESULT_VIDEO" | "CREDITS_EXHAUSTED") =>
      router.push({
        pathname: "/paywall",
        params: { source, afterUrl: imageUrl, resume: "RESULT_VIDEO" },
      } as never);
    if (!videoFeatureEnabled) {
      videoPaywall("RESULT_VIDEO");
      return;
    }
    if (videoCost != null && !canAfford(videoCost)) {
      videoPaywall("CREDITS_EXHAUSTED");
      return;
    }

    // 2.3.0: the wait has a screen of its own (the design blurred behind, a phase, a bar), the
    // same as a design's. It creates the clip, survives being left, and comes back here when the
    // clip is done — this button then reads "Watch the video".
    router.push({
      pathname: "/generation/video-progress",
      params: { parentJobId: job.id, outputId: currentOutput.id, imageUrl },
    } as never);
  };

  if (loading) {
    return (
      <SafeAreaView
        edges={[]}
        className="flex-1 bg-surface items-center justify-center"
      >
        <ActivityIndicator size="large" color="#DDB477" />
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView
        edges={[]}
        className="flex-1 bg-surface items-center justify-center px-8"
      >
        <Ionicons name="alert-circle-outline" size={48} color="#9A8F7D" />
        <Text
          className="font-headline text-on-surface mt-4"
          style={{ ...theme.text.headline }}
        >
          {t("errors.generic")}
        </Text>
        <Pressable onPress={() => router.back()} className="mt-6">
          <Text
            className="font-label text-secondary"
            style={{
              ...theme.text.label,
            }}
          >
            {t("common.back")}
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  /* ── A clip, not a picture (V183) ──────────────────────────────────
   * Same route, different screen: the gallery pushes /result/{id} for every
   * job, and a before/after slider of an mp4 is not a result. Every hook
   * above has already run, so this early return is safe. */
  if (job.jobType === "VIDEO" || (currentOutput?.mimeType ?? "").startsWith("video/")) {
    return <VideoResult job={job} onValue={markValue} />;
  }

  /* ── Umber result (2026-09-19) ─────────────────────────────────────
   *
   * The screen the whole redesign is aimed at. Second-day return is 6.3%:
   * 118 of 126 people who ever rendered did it on one day. The old result
   * screen's primary actions were Save and Share — both of which end the
   * session — and the way back into the product was a metadata table and a
   * bottom tab.
   *
   * The primary next action is now "same room, another style": four
   * thumbnails that re-run the generation the user has already paid
   * attention to, with the photo and room type they already chose.
   *
   * 🔴 Everything above this line — the prompt ladder, the rating gate, the
   * dwell timer, the output signals — is unchanged. Only the layout moved.
   *
   * v3 (2026-10-10): the four thumbnails are now one row (two styles,
   * Reference, "+") under the video card; the framed design comes first.
   */

  const afterUrl = currentOutput ? getOutputImageUrl(job.id, currentOutput) : undefined;
  const beforeUrl = job.inputFile?.id ? getFileDownloadUrl(job.inputFile.id) : "";
  // The presigned URL changes on every read of the job (each focus re-reads
  // it); keyed by id, the picture is not fetched again and does not flash.
  const afterKey = currentOutput?.id ? `output-${currentOutput.id}` : undefined;
  const beforeKey = job.inputFile?.id ? `input-${job.inputFile.id}` : undefined;
  const kicker = [catalogLabel("style", job.designStyleName), catalogLabel("room", job.roomTypeName)]
    .filter(Boolean)
    .join(" · ")
    .toLocaleUpperCase(i18n.language);
  const showRestyle = studioPhotoFileId != null && studioPhotoFileId === job.inputFile?.id;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: theme.v2Layout.gutterWide, paddingBottom: 24 }}
        alwaysBounceVertical={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 4, paddingBottom: 16, gap: 8 }}>
          <HeaderButton icon="chevron-back" label={t("common.back")} onPress={() => router.back()} />
          <Text
            style={{ ...theme.v2.kicker, color: U.inkMuted, flex: 1, textAlign: "center" }}
            numberOfLines={1}
          >
            {kicker}
          </Text>
          <HeaderButton icon="ellipsis-horizontal" label={t("result.more_actions")} onPress={handleMore} />
        </View>

        {/* BEFORE / AFTER is the old slider's two pictures behind a pill; a
            tap on the picture or ⤢ is the same fullscreen viewer (and the
            same "fullscreen" value signal) as before. */}
        <ResultFrame
          beforeUrl={beforeUrl}
          beforeHeaders={authHeaders}
          beforeCacheKey={beforeKey}
          afterUrl={afterUrl}
          afterCacheKey={afterKey}
          height={FRAME_HEIGHT}
          reduceMotion={reduceMotion}
          onOpen={openFullscreen}
          onArrived={handleArrived}
        />

        <Rise shown={actionsShown} index={0} reduceMotion={reduceMotion} style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
          <Pressable
            onPress={handleDownload}
            disabled={isDownloading}
            accessibilityRole="button"
            accessibilityLabel={t("result.save")}
            accessibilityState={{ disabled: isDownloading, busy: isDownloading }}
            style={{ flex: 2, opacity: isDownloading ? 0.7 : 1 }}
          >
            <LinearGradient
              colors={[U.accentBright, U.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 56, borderRadius: theme.v2Layout.radius.button,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={U.buttonInk} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color={U.buttonInk} />
                  <Text style={{ ...theme.v2.button, color: U.buttonInk }} numberOfLines={1}>
                    {t("result.save")}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={handleShare}
            disabled={isSharing}
            accessibilityRole="button"
            accessibilityLabel={t("result.share")}
            accessibilityState={{ disabled: isSharing, busy: isSharing }}
            style={{
              flex: 1, height: 56, borderRadius: theme.v2Layout.radius.button,
              backgroundColor: U.surface, borderWidth: 1, borderColor: U.lineNeutral,
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: isSharing ? 0.7 : 1,
            }}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={U.inkMuted} />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color={U.ink} />
                <Text style={{ ...theme.v2.row, color: U.ink }} numberOfLines={1}>
                  {t("result.share")}
                </Text>
              </>
            )}
          </Pressable>
        </Rise>

        {/* 🔴 Static styles on every Pressable here, never `style={({ pressed }) => …}`: in this
            app's NativeWind setup the function form was dropped whole on the v3 rows (simulator,
            10 Oct) — no background, no row layout. */}
        {/* Bring it to life (V183), now "Walk through it". Hidden on an
            upscale: the backend makes clips from original renders only (Kling
            reads the frame at its own size). The resume note is the one the
            paywall left when it was opened from here. */}
        {!isAlreadyUpscaled && (
          <Rise shown={actionsShown} index={1} reduceMotion={reduceMotion} style={{ marginTop: 16 }}>
            {resumeVideo && (
              <View style={{ marginBottom: 10 }}>
                <ResumeNote text={t("resume.video", { cta: t("result.video_walk_title") })} />
              </View>
            )}
            <WalkThroughCard
              state={videoState}
              cost={videoCost}
              locked={!videoFeatureEnabled}
              busy={videoSubmitting || restyling}
              pushGranted={pushGranted}
              thumbUrl={afterUrl}
              thumbCacheKey={afterKey}
              onPress={handleVideo}
            />
          </Rise>
        )}

        {/* "Same room, another style" re-runs the STUDIO's photo with a new
            style. Opened from the gallery, this render's photo may not be
            the one the studio holds any more — the row would then render
            a different room and charge for it. So it shows only when the
            two match, which is always true straight after a generation. */}
        {showRestyle && (
          <Rise shown={actionsShown} index={2} reduceMotion={reduceMotion} style={{ marginTop: 16 }}>
            {resumeRestyle && (
              <View style={{ marginBottom: 10 }}>
                <ResumeNote text={t("resume.restyle")} />
              </View>
            )}
            <AnotherStyleRow
              currentStyleCode={
                designStyles.find((s) => s.name === job.designStyleName)?.code ?? null
              }
              cost={restyleCost}
              onPick={handleRestyle}
              onLocked={() => router.push("/paywall?source=RESULT_STYLE" as never)}
              // Every other style: the composer, the same photo still loaded.
              onMore={() => {
                hideResumeRestyle();
                router.push("/studio/composer" as never);
              }}
              busy={restyling || videoSubmitting}
              pendingCode={restyleCode}
            />
          </Rise>
        )}
      </ScrollView>

      {/* ── Tam ekran, yakınlaştırılabilir ────────────────────────────────
          Modal, çünkü kapanınca altındaki ekran olduğu gibi duruyor:
          kaydırıcının bırakıldığı yer, seçili stil, kaydırma konumu.
          🔴 GestureHandlerRootView modalın İÇİNDE olmak zorunda — iOS'ta
          Modal ayrı bir native görünüm hiyerarşisine çiziliyor ve kökteki
          sarmalayıcı oraya ulaşmıyor; onsuz pinch/pan sessizce ölü kalır. */}
      <Modal
        visible={fullscreenUrl !== null}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => setFullscreenUrl(null)}
      >
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
          <StatusBar barStyle="light-content" />
          {fullscreenUrl && (
            <ZoomableImage uri={fullscreenUrl} style={{ flex: 1 }} />
          )}
          <Pressable
            onPress={() => setFullscreenUrl(null)}
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
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </GestureHandlerRootView>
      </Modal>
    </SafeAreaView>
  );
}

/** A round 44pt button in the header — back, and the "…" menu. */
function HeaderButton({
  icon, label, onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: U.surface,
        borderWidth: 1, borderColor: U.lineNeutral,
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={18} color={U.ink} />
    </Pressable>
  );
}
