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
  Animated,
  PanResponder,
} from "react-native";
import { theme } from "@/config/theme";
import { useCatalogStore } from "@/stores/catalogStore";
import { getStyleImage } from "@/components/studio/styleImages";
import { useGenerate } from "@/hooks/useGenerate";
import { requestPushPermission } from "@/hooks/usePushRegistration";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";

const U = theme.umber;
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { useJobPolling } from "@/hooks/useJobPolling";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SourceSheet, sourceSheetWillAsk } from "@/components/ui/SourceSheet";
import { useAuthStore } from "@/stores/authStore";
import { track } from "@/services/analytics";
import { TopBar } from "@/components/layout/TopBar";
import { getJob, sendOutputSignal, createVideoJob } from "@/services/jobs";
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
import { useReviewPrompt } from "@/hooks/useReviewPrompt";
import { usePushPermissionAsk } from "@/hooks/usePushRegistration";
import { useAccountPrompt } from "@/hooks/useAccountPrompt";
import { useFirstResultPaywall } from "@/hooks/useFirstResultPaywall";
import { useSuccessCount } from "@/hooks/useSuccessCount";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_WIDTH = SCREEN_WIDTH - 48;

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
  const { t } = useTranslation();
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
   * PRO-gated through plan_features (ROOM_VIDEO), read through the same
   * trial-aware hook every other gate uses. The price comes from the
   * effective rules first; a plan below PRO has no ROOM_VIDEO rule, so it
   * falls back to the feature's own creditsPerUse (10) — the number the
   * locked button shows next to its PRO tag. The backend re-checks all of it
   * and answers 403 PLAN_UPGRADE_REQUIRED if the client is wrong.
   */
  const { enabled: videoFeatureEnabled } = useEntitlement("ROOM_VIDEO");
  const effectiveFeatures = useEffectiveFeatures();
  const videoCost =
    creditRules.find((r) => r.featureCode === "ROOM_VIDEO")?.creditCost
    ?? effectiveFeatures.find((f) => f.featureCode === "ROOM_VIDEO")?.creditsPerUse
    ?? null;
  const canAfford = useCreditStore((s) => s.canAfford);
  const fetchBalance = useCreditStore((s) => s.fetchBalance);
  const [videoSubmitting, setVideoSubmitting] = useState(false);
  // The clip of this render, and the button IS its status. Seeded from the
  // server's answer on the job (videoJobId / videoStatus), set the moment
  // the user starts one, and kept current by polling while it renders.
  //
  // 🔴 The polling is the fix for 2026-09-25: the button said "Video
  // hazırlanıyor" and stayed that way after the clip had finished, because
  // nothing on this screen ever looked at the clip again.
  const [video, setVideo] = useState<{ id: string; status: JobStatus } | null>(null);
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
    video && !isTerminalStatus(video.status) ? video.id : null,
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

  // Post-result prompts are rationed one per visit, in this order: the offer
  // (1st result, below), the notification ask (2nd), the channel question
  // (3rd), the rating (4th). Two sheets in one visit get both dismissed.
  const successCount = useSuccessCount(outputs.length > 0);
  const firstResultBeforeUrl = job?.inputFile?.id ? getFileDownloadUrl(job.inputFile.id) : "";
  const firstResultAfterUrl = job && currentOutput ? getOutputImageUrl(job.id, currentOutput) : undefined;
  const paywallFiredThisVisit = useFirstResultPaywall(job, firstResultAfterUrl, firstResultBeforeUrl);
  // The rating ask waits for a value signal instead of a render count (see
  // useReviewPrompt), which makes it the ONLY prompt here keyed to behaviour
  // rather than to a visit number — and therefore the only one that can land
  // on a visit another prompt already owns. Until 2026-09-16 it guarded
  // against exactly one of them (the push ask) and collided with the rest;
  // worst of all with the first-result paywall, because iOS refuses to
  // present the review sheet over a modal and we recorded the ask anyway.
  //
  // The ladder below is the whole policy, in one place. Each entry is a visit
  // some other prompt has already claimed:
  const userId = useAuthStore((st) => st.user?.id ?? null);
  const pushAskClaimed = usePushPermissionAsk(outputs.length > 0);
  const accountAskClaimed = useAccountPrompt(outputs.length > 0);

  // WHO OWNS THIS VISIT
  //
  // Only one system sheet may appear per visit; two get both dismissed. Every
  // other prompt here has a fixed slot, and the rating — keyed to a value
  // signal rather than a count — is the one that has to stand aside.
  //
  // Twice now that standing-aside was computed by GUESSING which visit the
  // others would take, from counters. It was wrong both times: the push ask
  // counts successes in "push_prompt_success_count" while this screen counts
  // them in "result_success_count", and for any user who predates one of the
  // two those numbers disagree. On 2026-09-16 the notification sheets opened,
  // the guess said the visit was free, iOS refused the rating over them, and
  // the attempt was recorded anyway.
  //
  // So nothing is inferred any more. Each prompt reports when it has actually
  // committed to showing something, and the rating reads that at the moment
  // it would fire.
  const sourceSheetEligible =
    job?.status === "COMPLETED" && !paywallFiredThisVisit && successCount >= 3;
  // Eligible is not asking: the sheet keeps its own once-per-identity flag.
  const [sourceSheetWillShow, setSourceSheetWillShow] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (!sourceSheetEligible) {
      setSourceSheetWillShow(false);
      return;
    }
    sourceSheetWillAsk(userId)
      .then((will) => { if (!cancelled) setSourceSheetWillShow(will); })
      .catch(() => { if (!cancelled) setSourceSheetWillShow(true); });
    return () => { cancelled = true; };
  }, [sourceSheetEligible, userId]);

  const visitClaimed =
    paywallFiredThisVisit   // the offer, on the first result
    || pushAskClaimed       // notification permission — reported, not guessed
    || accountAskClaimed    // secure your account — reported, not guessed
    || sourceSheetWillShow; // where did you hear about us, if still unanswered

  // A ref so useReviewPrompt can read the CURRENT answer inside its delay,
  // rather than the answer that happened to be true when it was scheduled.
  const visitClaimedRef = useRef(visitClaimed);
  visitClaimedRef.current = visitClaimed;

  const [valueSignal, setValueSignal] = useState(false);
  useReviewPrompt(valueSignal, visitClaimedRef);

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
    setValueSignal(true);
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
    setValueSignal(true);
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
   * The button's three faces, straight from the clip's status. A finished
   * clip is "watch" — a second tap on a finished render can never buy a
   * second clip — and a failed one is "make" again, its credits already back.
   */
  const videoState: "make" | "progress" | "watch" =
    !video ? "make"
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
    if (videoState === "progress") return;
    if (!videoFeatureEnabled) {
      router.push("/paywall?source=RESULT_VIDEO" as never);
      return;
    }
    if (videoCost != null && !canAfford(videoCost)) {
      router.push({ pathname: "/paywall", params: { source: "CREDITS_EXHAUSTED" } } as never);
      return;
    }

    setVideoSubmitting(true);
    try {
      const created = await createVideoJob(job.id, currentOutput.id);
      setVideo({ id: created.id, status: created.status });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // The credits are reserved the moment the job exists; show it.
      fetchBalance().catch(() => {});
      // Ask for notifications NOW — the one moment the user has a reason to
      // say yes: they just started something that finishes while they are
      // away. On 2026-09-25 the clip finished and the push went out, but this
      // install had never been asked, so it had no token to receive it.
      // Already granted: this only re-syncs the token. Refused before: iOS
      // shows nothing, and the button promises the gallery instead.
      requestPushPermission().then(setPushGranted).catch(() => {});
    } catch (e: any) {
      // The server's own verdict on the plan wins over the client's.
      if (e?.response?.data?.errorCode === "PLAN_UPGRADE_REQUIRED") {
        router.push("/paywall?source=RESULT_VIDEO" as never);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t("generation.failed"),
        e?.response?.data?.message ?? t("errors.generic"),
      );
    } finally {
      setVideoSubmitting(false);
    }
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
    return <VideoResult job={job} />;
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
   */

  const afterUrl = currentOutput ? getOutputImageUrl(job.id, currentOutput) : undefined;
  const beforeUrl = job.inputFile?.id ? getFileDownloadUrl(job.inputFile.id) : "";

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
          <Text style={{ ...theme.v2.kicker, color: U.inkMuted, flex: 1, textAlign: "center" }}>
            {(job.designStyleName || "").toUpperCase()}
          </Text>
          <View style={{ width: 34 }} />
        </View>

        <BeforeAfter
          beforeUrl={beforeUrl}
          afterUrl={afterUrl}
          authHeaders={authHeaders}
          onOpen={openFullscreen}
          onTap={openFullscreen}
        />

        <View style={{ flexDirection: "row", gap: 9, marginTop: 12 }}>
          <ResultAction flex={1} label={t("result.save")} busy={isDownloading} onPress={handleDownload} />
          <ResultAction flex={1} label={t("result.share")} busy={isSharing} onPress={handleShare} />
          <ResultAction
            flex={1.3}
            label={t("studio.add_furniture")}
            tone="accent"
            onPress={() => router.push({ pathname: "/studio/composer", params: { sheet: "catalogue" } } as never)}
          />
        </View>

        {/* Bring it to life (V183): a five-second clip of this render. 60% wide
            and centred — narrower than "New design" on purpose, it is an
            option, not the exit. Hidden on an upscale: the backend makes clips
            from original renders only (Kling reads the frame at its own size). */}
        {!isAlreadyUpscaled && (
          <VideoCta
            state={videoState}
            cost={videoCost}
            locked={!videoFeatureEnabled}
            busy={videoSubmitting || restyling}
            pushGranted={pushGranted}
            onPress={handleVideo}
          />
        )}

        {/* "Same room, another style" re-runs the STUDIO's photo with a new
            style. Opened from the gallery, this render's photo may not be
            the one the studio holds any more — the strip would then render
            a different room and charge for it. So it shows only when the
            two match, which is always true straight after a generation. */}
        {studioPhotoFileId != null && studioPhotoFileId === job.inputFile?.id && (
          <>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 20, marginBottom: 12, gap: 12 }}>
              <Text style={{ ...theme.v2.displayS, color: U.ink, flexShrink: 1 }} numberOfLines={1}>
                {t("result.another_style")}
              </Text>
              {/* Every tap here is a charge; the price sits where the tap is. */}
              <Text style={{ fontFamily: "Inter-Bold", fontSize: 12.5, color: U.accentBright }}>
                {t("studio.credit_cost", { count: restyleCost })}
              </Text>
            </View>

            {/* No explanatory line under the heading — the thumbnails carry it. */}
            <AnotherStyleStrip
              currentStyleCode={
                designStyles.find((s) => s.name === job.designStyleName)?.code ?? null
              }
              onPick={handleRestyle}
              onLocked={() => router.push("/paywall?source=RESULT_STYLE" as never)}
              busy={restyling || videoSubmitting}
              pendingCode={restyleCode}
            />
          </>
        )}

        <View style={{ flex: 1 }} />

        {/* Buradan çıkış. Sol üstteki geri oku üretim ilerlemesine dönüyordu;
            biten bir işten sonra kullanıcının istediği tek yer bir sonraki
            tasarım. Dolu düğme değil — Kaydet/Paylaş hâlâ bu ekranın işi,
            bu yalnızca kapı. */}
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
          }}
        >
          <Text style={{ ...theme.v2.button, color: U.accentBright }}>
            {t("result.new_design")}
          </Text>
          <Text style={{ color: U.accentBright, fontSize: 16 }}>→</Text>
        </Pressable>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: U.lineNeutral,
            marginTop: 14,
            paddingTop: 14,
            paddingBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted, flex: 1 }} numberOfLines={1}>
            {remind ? t("result.reminder_on") : t("result.remind_me")}
          </Text>
          <ReminderToggle value={remind} onChange={handleRemindChange} />
        </View>
      </View>

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

/**
 * The comparison, with the reveal following the finger.
 *
 * <p>Kept from v1 because it is the clearest thing in the app: the before is
 * clipped to a left-hand window whose width the user drags. Clamped to 2–98%
 * so neither image can be dragged entirely out of existence, and reset to 55%
 * on every new result.
 */
function BeforeAfter({
  beforeUrl, afterUrl, authHeaders, onOpen, onTap,
}: {
  beforeUrl: string;
  afterUrl?: string;
  authHeaders: Record<string, string>;
  onOpen: () => void;
  /** Sürüklemeden ayırt edilmiş bir dokunuş — tam ekranı açar. */
  onTap: () => void;
}) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const [reveal, setReveal] = useState(55);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setReveal(55);
    Animated.timing(enter, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [afterUrl, enter]);

  /**
   * Kaydırma mı, dokunuş mu.
   *
   * <p>PanResponder her dokunuşu kendine alıyor (onStartShouldSet → true),
   * o yüzden resmin üstüne konan basit bir Pressable hiç ateşlemez — el
   * kaydırıcıya gider. Ayrımı burada yapıyoruz: parmak kalktığında toplam
   * hareket 6 puandan küçük ve süre 250 ms'den kısaysa bu bir dokunuştur,
   * tam ekran açılır. Aksi hâlde kaydırma olarak kalır ve reveal'i sürer.
   *
   * <p>Eşikler el titremesi payı: 6 pt, iOS'un kendi kaydırma eşiğinin
   * (10 pt) altında, yani gerçek bir sürüklemeyi asla dokunuş sanmaz.
   */
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const gestureMoved = useRef(false);
  const gestureStart = useRef(0);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        gestureMoved.current = false;
        gestureStart.current = Date.now();
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6) gestureMoved.current = true;
        setWidth((w) => {
          if (w > 0) {
            const pct = Math.max(2, Math.min(98, (g.moveX - 18) / w * 100));
            setReveal(pct);
          }
          return w;
        });
      },
      onPanResponderRelease: () => {
        if (!gestureMoved.current && Date.now() - gestureStart.current < 250) {
          onTapRef.current();
        }
      },
    }),
  ).current;

  return (
    <Animated.View
      style={{
        height: 330,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: U.surface,
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      {afterUrl ? (
        <Image source={{ uri: afterUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
      ) : null}

      {beforeUrl ? (
        <View style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${reveal}%`, overflow: "hidden" }}>
          <Image
            source={{ uri: beforeUrl, headers: authHeaders }}
            style={{ width, height: "100%" }}
            contentFit="cover"
          />
        </View>
      ) : null}

      <View style={{ position: "absolute", top: 0, bottom: 0, left: `${reveal}%`, width: 2, backgroundColor: "#fff" }} />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: "50%",
          left: `${reveal}%`,
          marginLeft: -18,
          marginTop: -18,
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: "#fff",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <Text style={{ color: "#111", fontSize: 14 }}>⇄</Text>
      </View>

      <PhotoTag style={{ top: 12, left: 12 }} label={t("result.before")} />
      <PhotoTag style={{ top: 12, right: 12 }} label={t("result.after")} />

      <Pressable
        onPress={onOpen}
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
    </Animated.View>
  );
}

/** A pill on a photograph: its own fill and hairline, never a theme colour. */
function PhotoTag({ label, style }: { label: string; style: object }) {
  return (
    <View
      style={{
        position: "absolute",
        backgroundColor: U.photoChrome,
        borderWidth: 1,
        borderColor: U.photoChromeBorder,
        borderRadius: 100,
        paddingVertical: 5,
        paddingHorizontal: 11,
        ...style,
      }}
    >
      <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 10.5, color: "#fff", letterSpacing: 0.6 }}>
        {label}
      </Text>
    </View>
  );
}

function ResultAction({
  label, flex, tone = "ink", busy, onPress,
}: {
  label: string; flex: number; tone?: "ink" | "accent"; busy?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
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
        opacity: busy ? 0.6 : 1,
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

/**
 * Four ways back in.
 *
 * <p>Three styles the user has not used on this room, plus Reference — the
 * PRO one, which taps through to the paywall rather than pretending to be
 * available. The current style is excluded: offering the thing they are
 * already looking at is the one option that cannot be interesting.
 */
function AnotherStyleStrip({
  currentStyleCode, onPick, onLocked, busy, pendingCode,
}: {
  currentStyleCode: string | null;
  onPick: (code: string) => void;
  onLocked: () => void;
  busy: boolean;
  /** The style whose render is being submitted — it carries the spinner. */
  pendingCode: string | null;
}) {
  const { t } = useTranslation();
  const styles = useCatalogStore((s) => s.designStyles);

  const picks = useMemo(() => {
    const preferred = ["MINIMALIST", "SCANDINAVIAN", "WARM_MOCHA", "MODERN", "INDUSTRIAL"];
    const byCode = new Map(styles.map((s) => [s.code?.toUpperCase(), s]));
    const out: { code: string; name: string }[] = [];
    for (const code of preferred) {
      if (out.length === 3) break;
      if (code === currentStyleCode?.toUpperCase()) continue;
      const s = byCode.get(code);
      if (s) out.push({ code: s.code, name: s.name });
    }
    return out;
  }, [styles, currentStyleCode]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 9 }}>
      {picks.map((p) => (
        <Pressable
          key={p.code}
          onPress={() => onPick(p.code)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={p.name}
          style={{ width: 98, opacity: busy ? 0.5 : 1 }}
        >
          <View style={{ height: 82, borderRadius: 12, overflow: "hidden", backgroundColor: U.surface }}>
            {getStyleImage(p.code) ? (
              <Image source={getStyleImage(p.code)!} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : null}
            {pendingCode === p.code ? (
              <View style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: U.overlayScrim, alignItems: "center", justifyContent: "center",
              }}>
                <ActivityIndicator size="small" color={U.accentBright} />
              </View>
            ) : null}
          </View>
          <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 11.5, color: U.ink, marginTop: 6 }} numberOfLines={1}>
            {p.name}
          </Text>
        </Pressable>
      ))}

      <Pressable onPress={onLocked} accessibilityRole="button" style={{ width: 98 }}>
        <View style={{ height: 82, borderRadius: 12, overflow: "hidden", backgroundColor: U.surface }}>
          <Image
            source={require("@/assets/features/style_after.png")}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
          <View style={{
            position: "absolute", top: 6, right: 6,
            backgroundColor: U.ground, borderWidth: 1, borderColor: U.accent,
            borderRadius: 5, paddingVertical: 2, paddingHorizontal: 5,
          }}>
            <Text style={{ fontFamily: "Inter-Bold", fontSize: 8, letterSpacing: 1, color: U.accentBright }}>
              PRO
            </Text>
          </View>
        </View>
        <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 11.5, color: U.ink, marginTop: 6 }} numberOfLines={1}>
          {t("result.reference_style")}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

/**
 * The clip button (V183). Three faces from one control: make (with the price,
 * or a PRO tag when the plan is below it), in progress (opens the wait
 * screen), watch (opens the clip). The price is printed ON the button, the
 * same rule the composer follows for Generate — nobody is charged a number
 * they did not see.
 */
function VideoCta({
  state, cost, locked, busy, pushGranted, onPress,
}: {
  state: "make" | "progress" | "watch";
  cost: number | null;
  locked: boolean;
  busy: boolean;
  /** False = no push will come; the hint promises the gallery instead. */
  pushGranted: boolean | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const label =
    state === "watch" ? t("result.video_watch")
    : state === "progress" ? t("result.video_in_progress")
    : t("result.video_cta");
  const hint =
    state === "watch" ? null
    : state === "progress"
      ? t(pushGranted === false ? "result.video_in_progress_hint_gallery" : "result.video_in_progress_hint")
    : locked ? t("result.video_pro_hint")
    : t("result.video_cta_hint", { cost: cost ?? "" });

  return (
    <View style={{ alignItems: "center", marginTop: 10 }}>
      <Pressable
        onPress={onPress}
        // In progress there is nothing to do here: the clip renders on its
        // own and the push brings the user back.
        disabled={busy || state === "progress"}
        accessibilityRole="button"
        accessibilityLabel={hint ? `${label}. ${hint}` : label}
        style={{
          width: "60%",
          minHeight: 48,
          borderRadius: 14,
          backgroundColor: U.lineAccent,
          borderWidth: 1,
          borderColor: U.accent,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 7,
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy || state === "progress" ? (
          <ActivityIndicator size="small" color={U.accentBright} />
        ) : (
          <Ionicons name={state === "watch" ? "play" : "videocam"} size={16} color={U.accentBright} />
        )}
        <View style={{ alignItems: "center", flexShrink: 1 }}>
          <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 13.5, color: U.accentBright }} numberOfLines={1}>
            {label}
          </Text>
          {hint ? (
            // Two lines, not one: the button is 60% wide and a hint that
            // ends in an ellipsis told the user nothing (seen in the first
            // simulator pass — "…bitince bildiri…").
            <Text style={{ ...theme.v2.caption, color: U.inkMuted, marginTop: 2, textAlign: "center" }} numberOfLines={2}>
              {hint}
            </Text>
          ) : null}
        </View>
        {locked && state === "make" ? (
          <View style={{
            borderWidth: 1, borderColor: U.accent, borderRadius: 5,
            paddingVertical: 2, paddingHorizontal: 5,
          }}>
            <Text style={{ fontFamily: "Inter-Bold", fontSize: 8, letterSpacing: 1, color: U.accentBright }}>
              PRO
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

/** 48 × 28, knob 22, 200ms on translateX. */
function ReminderToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const x = useRef(new Animated.Value(value ? 23 : 3)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 23 : 3, duration: 200, useNativeDriver: true }).start();
  }, [value, x]);
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={t("result.remind_me")}
      hitSlop={10}
      style={{
        width: 48, height: 28, borderRadius: 14,
        backgroundColor: value ? U.accent : U.lineNeutral,
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: U.ground,
          transform: [{ translateX: x }],
        }}
      />
    </Pressable>
  );
}
