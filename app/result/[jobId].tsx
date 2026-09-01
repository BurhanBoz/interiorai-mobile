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
} from "react-native";
import { theme } from "@/config/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SourceSheet } from "@/components/ui/SourceSheet";
import { TopBar } from "@/components/layout/TopBar";
import { getJob, sendOutputSignal } from "@/services/jobs";
import { getFileDownloadUrl, getOutputDownloadUrl } from "@/services/files";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { useImageActions } from "@/hooks/useImageActions";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useCreditStore } from "@/stores/creditStore";
import { useStudioStore } from "@/stores/studioStore";
import { useEntitlement, useEffectiveWatermark, useEffectiveCreditRules, useEffectivePlanCode } from "@/hooks/useEntitlement";
import { FreeWatermark } from "@/components/ui/FreeWatermark";
import { ZoomableImage } from "@/components/ui/ZoomableImage";
import type { JobResponse, JobOutputResponse } from "@/types/api";
import { useReviewPrompt } from "@/hooks/useReviewPrompt";
import { usePushPermissionAsk } from "@/hooks/usePushRegistration";
import { useAccountPrompt } from "@/hooks/useAccountPrompt";

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

  const outputs = job?.outputs ?? [];
  const currentOutput = outputs[activeIndex];

  // ASO: single, well-timed rating ask — fires on the user's 2nd successfully
  // viewed result (see useReviewPrompt for the full strategy).
  useReviewPrompt(outputs.length > 0);
  // Notification permission, asked on the 3rd success — deliberately behind
  // the rating prompt (2nd success). Two system sheets in one visit gets both
  // dismissed, and on iOS the push prompt is one-shot forever.
  usePushPermissionAsk(outputs.length > 0);
  useAccountPrompt(outputs.length > 0);

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
    // No auth headers — see getOutputImageUrl.
    await saveToPhotos(url, {
      nameHint: job?.designStyleName?.toLowerCase().replace(/\s+/g, "-"),
    });
  };

  const handleCompare = () => {
    if (!currentOutput) return;
    // Surface the inputFile state up front so we can diagnose missing
    // before-images in the wild. The earlier silent `return` when
    // `inputFile.id` was absent is what prevented the compare screen
    // from opening at all — now we at least navigate with an empty
    // beforeUrl and the target screen can show a clear message.
    const beforeUrl = job?.inputFile?.id
      ? getFileDownloadUrl(job.inputFile.id)
      : "";
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(
        "[Result] handleCompare — inputFile:",
        job?.inputFile,
        "beforeUrl:",
        beforeUrl,
      );
    }
    router.push({
      pathname: "/result/compare",
      params: {
        beforeUrl,
        afterUrl: getOutputImageUrl(job!.id, currentOutput),
      },
    } as any);
  };

  if (loading) {
    return (
      <SafeAreaView
        edges={[]}
        className="flex-1 bg-surface items-center justify-center"
      >
        <ActivityIndicator size="large" color="#C4A882" />
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView
        edges={[]}
        className="flex-1 bg-surface items-center justify-center px-8"
      >
        <Ionicons name="alert-circle-outline" size={48} color="#998F84" />
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

  const metadata = [
    { label: t("result.room"), value: job.roomTypeName || "—" },
    { label: t("result.style"), value: job.designStyleName || "—" },
    { label: t("result.mode"), value: modeLabelKeys[job.designMode] ? t(modeLabelKeys[job.designMode]) : job.designMode },
    {
      label: t("result.quality"),
      value: qualityLabelKeys[job.qualityTier] ? t(qualityLabelKeys[job.qualityTier]) : job.qualityTier,
    },
  ];

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-surface">
      <TopBar showBack showBranding />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: theme.space.gutter, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Image Stage */}
        <View
          className="mb-8 rounded-xl overflow-hidden"
          style={{ aspectRatio: 4 / 5, backgroundColor: "#2A2A2A" }}
        >
          {/* Loading indicator behind image */}
          <View
            className="absolute inset-0 items-center justify-center"
            style={{ zIndex: 0 }}
          >
            <ActivityIndicator size="large" color="#C4A882" />
            <Text
              className="font-label text-on-surface-variant"
              style={{
                ...theme.text.caption,
                marginTop: 12,
              }}
            >
              {t("common.loading")}
            </Text>
          </View>

          {outputs.length > 1 ? (
            <FlatList
              ref={flatListRef}
              data={outputs}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              onMomentumScrollEnd={e => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / IMAGE_WIDTH,
                );
                setActiveIndex(index);
              }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setFullscreenUrl(getOutputImageUrl(job!.id, item))}
                  style={{ width: IMAGE_WIDTH, height: "100%", zIndex: 1 }}
                >
                  <Image
                    source={getImageSource(item)}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    onError={e =>
                      console.log(
                        "[Result] Image load error:",
                        getOutputImageUrl(job!.id, item),
                        e,
                      )
                    }
                  />
                </Pressable>
              )}
            />
          ) : currentOutput ? (
            <Pressable
              onPress={() => setFullscreenUrl(getOutputImageUrl(job!.id, currentOutput))}
              style={{ width: "100%", height: "100%", zIndex: 1 }}
            >
              <Image
                source={getImageSource(currentOutput)}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                onError={e =>
                  console.log(
                    "[Result] Image load error:",
                    getOutputImageUrl(job!.id, currentOutput),
                    e,
                  )
                }
              />
            </Pressable>
          ) : (
            <View
              className="flex-1 items-center justify-center"
              style={{ backgroundColor: "#2A2A2A" }}
            >
              <Ionicons name="image-outline" size={48} color="#998F84" />
            </View>
          )}

          {/* Credits consumed badge */}
          {job.creditsConsumed > 0 && (
            <View
              className="absolute rounded-full"
              style={{
                top: 16,
                left: 16,
                backgroundColor: "rgba(53,53,52,0.8)",
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text
                className="font-label text-primary font-semibold"
                style={{
                  ...theme.text.caption,
                }}
              >
                {t("studio.cost_credits", { count: job.creditsConsumed })}
              </Text>
            </View>
          )}

          {/* Free plan corner mark — bottom-right, non-intrusive. Replaces
              the earlier "reklamımız" that covered the entire image. */}
          {showWatermark && <FreeWatermark size="md" />}

          {/* Pagination Dots */}
          {outputs.length > 1 && (
            <View
              className="absolute left-0 right-0 flex-row items-center justify-center"
              style={{ bottom: 24, gap: 8 }}
            >
              {outputs.map((_, i) => (
                <View
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor:
                      i === activeIndex ? "#FEDFB5" : "rgba(229,226,225,0.3)",
                    ...(i === activeIndex
                      ? {
                          shadowColor: "#FEDFB5",
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                        }
                      : {}),
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* ────────── Action area ──────────
            Three tiers, ordered by what we actually want to happen:
              • Save to Photos — full-width primary. Keeping the render
                is the strongest quality signal a user can give us, and
                until 2026-09-01 it was a muted icon-circle sitting
                between Compare and Share while UPSCALE — a paid action
                most users cannot even reach — owned the only full-width
                pill on the screen. We were shouting the thing that
                costs the user money and whispering the thing that means
                "this one was good". 81 generations had produced 2
                downloads.
              • Utility row — Compare and Share as icon-circles.
                Variation is PARKED (2026-07-10 founder call) — backend
                + VariationSheet stay intact in git history.
              • Upscale — still its own pill below the divider, still
                gold, just no longer the loudest thing here. It reads
                better AFTER the save anyway: you upscale a render you
                have decided you want, and V69 made the base output 2 MP
                so upscale is now "print size", not "finally usable". */}
        <View style={{ marginBottom: 24 }}>
          {/* Three actions, one row, equal footing — Compare · Save · Share.
              A full-width primary for Save was tried on device and read badly:
              it crowded the two circles beneath it and made the row look like
              leftovers. Emphasis is carried by TREATMENT instead of size — the
              Save circle is gold-tinted with a gold glyph while its neighbours
              stay muted — so keeping the render still reads as the main move
              without breaking the row's rhythm.

              Each action owns an equal third of the row (flex: 1) rather than
              being spaced apart. space-around distributes the GAPS evenly, not
              the items, so the widest label drags its neighbours off centre —
              on device "KARŞILAŞTIR" pushed the row visibly right of centre
              while "İNDİR" and "PAYLAŞ" bunched up. Equal thirds put each icon
              on the centre line of its own column, which holds for any label
              length in any language. */}
          <View
            className="flex-row items-start"
            style={{ marginBottom: 18 }}
          >
            {/* Compare */}
            <View className="items-center" style={{ flex: 1, gap: 8 }}>
              <Pressable
                onPress={handleCompare}
                className="w-12 h-12 rounded-full bg-surface-container-high items-center justify-center"
              >
                <Ionicons name="git-compare-outline" size={22} color="#D1C5B8" />
              </Pressable>
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  ...theme.text.label,
                }}
              >
                {t("result.compare")}
              </Text>
            </View>

            {/* Save — same shape as its neighbours, gold-tinted. Keeping the
                render is the strongest quality signal a user gives us, so it
                gets the accent; it does not get a different size. */}
            <View className="items-center" style={{ flex: 1, gap: 8 }}>
              <Pressable
                onPress={handleDownload}
                disabled={isDownloading}
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{
                  opacity: isDownloading ? 0.5 : 1,
                  backgroundColor: "rgba(225,195,155,0.14)",
                  borderWidth: 1,
                  borderColor: "rgba(225,195,155,0.32)",
                }}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#E1C39B" />
                ) : (
                  <Ionicons name="download-outline" size={22} color="#E1C39B" />
                )}
              </Pressable>
              <Text
                className="font-label"
                style={{
                  ...theme.text.label,
                  color: "#E1C39B",
                }}
              >
                {t("result.download")}
              </Text>
            </View>

            {/* Share */}
            <View className="items-center" style={{ flex: 1, gap: 8 }}>
              <Pressable
                onPress={handleShare}
                disabled={isSharing}
                className="w-12 h-12 rounded-full bg-surface-container-high items-center justify-center"
                style={{ opacity: isSharing ? 0.5 : 1 }}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="#D1C5B8" />
                ) : (
                  <Ionicons name="share-social-outline" size={22} color="#D1C5B8" />
                )}
              </Pressable>
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  ...theme.text.label,
                }}
              >
                {t("result.share")}
              </Text>
            </View>
          </View>

          {/* Bottom row — Upscale full-width premium pill.
              Free/Basic plan has no ULTRA_HD_UPSCALE credit rule so
              the locked variant routes to /plans for upgrade.
              Visual treatment uses a soft gold gradient wash + thin
              gold border + sparkles icon left, arrow right — reads as
              a premium action without screaming. Hairline divider
              above subtly separates the two tiers of actions. */}
          <View
            style={{
              height: 1,
              backgroundColor: "rgba(225,195,155,0.10)",
              marginBottom: 14,
            }}
          />
          {isAlreadyUpscaled ? (
            // Already-upscaled state — flat, non-interactive affordance.
            // Communicates "this job has been enhanced" so the user
            // doesn't think the action is missing or broken. We do NOT
            // render a Pressable here because there's nothing to do; a
            // disabled Pressable still takes hit area + ripples on
            // Android and would suggest tappability.
            <View
              style={{
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: "rgba(143,227,161,0.22)",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 18,
                paddingVertical: 14,
                gap: 12,
                backgroundColor: "rgba(143,227,161,0.05)",
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: theme.radius.md,
                  backgroundColor: "rgba(143,227,161,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark" size={16} color="#8FE3A1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...theme.text.caption,
                    color: "#8FE3A1",
                  }}
                >
                  {t("result.already_upscaled", {
                    defaultValue: "Already upscaled",
                  })}
                </Text>
                <Text
                  style={{
                    ...theme.text.caption,
                    color: "rgba(143,227,161,0.65)",
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {t("result.already_upscaled_subtitle", {
                    defaultValue: "This render has been enhanced",
                  })}
                </Text>
              </View>
            </View>
          ) : canUpscale ? (
            <Pressable
              onPress={() => {
                if (!currentOutput?.id) return;
                Haptics.selectionAsync();
                // Pre-flight cost confirmation — the upscale starts a paid
                // job, so we never debit without an explicit user OK.
                Alert.alert(
                  t("result.upscale_confirm_title_res", {
                    defaultValue: "Upscale to {{resolution}}?",
                    resolution: upscaleResolution,
                  }),
                  t("result.upscale_confirm_body_res", {
                    defaultValue: "{{cost}} credits will be used to enhance this image to {{resolution}}.",
                    resolution: upscaleResolution,
                    cost: upscaleCost,
                  }),
                  [
                    { text: t("common.cancel"), style: "cancel" },
                    {
                      text: t("result.upscale", { defaultValue: "Upscale" }),
                      onPress: () =>
                        router.push(
                          `/generation/upscale?parentJobId=${job.id}&outputId=${currentOutput.id}` as any,
                        ),
                    },
                  ],
                );
              }}
              style={({ pressed }) => ({
                borderRadius: theme.radius.md,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: pressed
                  ? "rgba(225,195,155,0.55)"
                  : "rgba(225,195,155,0.32)",
                transform: [{ scale: pressed ? 0.99 : 1 }],
              })}
            >
              <LinearGradient
                colors={["rgba(253,222,181,0.10)", "rgba(225,195,155,0.04)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: theme.radius.md,
                    backgroundColor: "rgba(253,222,181,0.14)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="sparkles" size={16} color="#FEDFB5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      ...theme.text.label,
                      color: "#F4DDB6",
                    }}
                  >
                    {t("result.upscale")}
                  </Text>
                  <Text
                    style={{
                      ...theme.text.caption,
                      color: "rgba(225,195,155,0.65)",
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {t("result.upscale_subtitle_res", {
                      defaultValue: "Enhance to {{resolution}} · {{cost}} credits",
                      resolution: upscaleResolution,
                      cost: upscaleCost,
                    })}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#E0C29A" />
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/plans")}
              style={({ pressed }) => ({
                borderRadius: theme.radius.md,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: pressed
                  ? "rgba(225,195,155,0.45)"
                  : "rgba(225,195,155,0.22)",
                transform: [{ scale: pressed ? 0.99 : 1 }],
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 18,
                paddingVertical: 14,
                gap: 12,
                backgroundColor: "rgba(225,195,155,0.04)",
              })}
            >
              {/* Deterministic inner row (2026-07-15 founder screenshot:
                  the lock/title/subtitle/arrow rendered stacked). The inner
                  View owns the row layout with explicit full width so no
                  outer-style interaction can collapse it into a column. */}
              <View
                style={{
                  width: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: theme.radius.md,
                    backgroundColor: "rgba(225,195,155,0.10)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="lock-closed" size={14} color="#E0C29A" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      ...theme.text.label,
                      color: "#E0C29A",
                    }}
                    numberOfLines={1}
                  >
                    {t("result.upscale_locked")}
                  </Text>
                  <Text
                    style={{
                      ...theme.text.caption,
                      color: "rgba(225,195,155,0.55)",
                      marginTop: 2,
                    }}
                    numberOfLines={2}
                  >
                    {t("result.upscale_locked_subtitle", {
                      defaultValue: "Unlock 4× Ultra HD upscaling with Pro",
                    })}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#E0C29A" />
              </View>
            </Pressable>
          )}

          {/* IO-1 — Expand pill (2026-08-11). Same premium-pill grammar as
              Upscale, one step quieter (no gradient wash). Hidden on chain
              jobs (backend rejects expand-of-upscale/expand — the right
              order is expand first, then upscale). Single alert carries
              both the mode choice and the cost consent. */}
          {canExpand && (
            <Pressable
              onPress={() => {
                if (!currentOutput?.id) return;
                Haptics.selectionAsync();
                Alert.alert(
                  t("result.expand_title"),
                  t("result.expand_body", { cost: expandCost }),
                  [
                    {
                      text: t("result.expand_zoom_15"),
                      onPress: () =>
                        router.push(
                          `/generation/expand?parentJobId=${job.id}&outputId=${currentOutput.id}&mode=ZOOM_OUT_15` as any,
                        ),
                    },
                    {
                      text: t("result.expand_zoom_2"),
                      onPress: () =>
                        router.push(
                          `/generation/expand?parentJobId=${job.id}&outputId=${currentOutput.id}&mode=ZOOM_OUT_2` as any,
                        ),
                    },
                    {
                      text: t("result.expand_square"),
                      onPress: () =>
                        router.push(
                          `/generation/expand?parentJobId=${job.id}&outputId=${currentOutput.id}&mode=MAKE_SQUARE` as any,
                        ),
                    },
                    { text: t("common.cancel"), style: "cancel" },
                  ],
                );
              }}
              style={({ pressed }) => ({
                marginTop: 10,
                borderRadius: theme.radius.md,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: pressed
                  ? "rgba(225,195,155,0.45)"
                  : "rgba(225,195,155,0.22)",
                transform: [{ scale: pressed ? 0.99 : 1 }],
                backgroundColor: "rgba(225,195,155,0.04)",
              })}
            >
              <View
                style={{
                  width: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: theme.radius.md,
                    backgroundColor: "rgba(225,195,155,0.10)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="expand-outline" size={16} color="#E0C29A" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ ...theme.text.label, color: "#F4DDB6" }} numberOfLines={1}>
                    {t("result.expand")}
                  </Text>
                  <Text
                    style={{
                      ...theme.text.caption,
                      color: "rgba(225,195,155,0.65)",
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {t("result.expand_subtitle", { cost: expandCost })}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#E0C29A" />
              </View>
            </Pressable>
          )}
        </View>

        {/* Metadata Card */}
        <View className="bg-surface-container-low rounded-xl p-6 mb-8">
          <View className="flex-row flex-wrap">
            {metadata.map(item => (
              <View key={item.label} className="w-1/2 mb-6">
                <Text
                  className="font-label text-on-surface-variant mb-1"
                  style={{
                    ...theme.text.caption,
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  className="font-headline text-on-surface"
                  style={{ ...theme.text.title }}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Generation Info + Seed (Copy) */}
        {currentOutput?.generationTimeMs > 0 && (
          <View className="bg-surface-container-low rounded-xl p-6 mb-8">
            <View className="flex-row flex-wrap">
              <View className="w-1/2 mb-2">
                <Text
                  className="font-label text-on-surface-variant mb-1"
                  style={{
                    ...theme.text.caption,
                  }}
                >
                  {t("result.generation_time")}
                </Text>
                <Text
                  className="font-headline text-on-surface"
                  style={{ ...theme.text.title }}
                >
                  {(currentOutput.generationTimeMs / 1000).toFixed(1)}s
                </Text>
              </View>
              {currentOutput.seed ? (
                <View className="w-1/2 mb-2">
                  <Text
                    className="font-label text-on-surface-variant mb-1"
                    style={{
                      ...theme.text.caption,
                    }}
                  >
                    {t("result.seed")}
                  </Text>
                  {/* Seed pill — monospace for legibility, Copy icon
                      writes the value to the clipboard + haptic tick.
                      Lets Pro+ users lock compositions across iterations. */}
                  <Pressable
                    onPress={async () => {
                      await Clipboard.setStringAsync(String(currentOutput.seed));
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success,
                      );
                      setSeedCopied(true);
                      setTimeout(() => setSeedCopied(false), 1600);
                    }}
                    className="flex-row items-center"
                    style={{ gap: 8 }}
                    hitSlop={6}
                  >
                    <Text
                      className="font-headline text-on-surface"
                      style={{
                        ...theme.text.title,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {currentOutput.seed}
                    </Text>
                    <Ionicons
                      name={seedCopied ? "checkmark-circle" : "copy-outline"}
                      size={14}
                      color={seedCopied ? "#8FE3A1" : "#E0C29A"}
                    />
                  </Pressable>
                </View>
              ) : null}
              {currentOutput.width && currentOutput.height ? (
                <View className="w-1/2 mb-2">
                  <Text
                    className="font-label text-on-surface-variant mb-1"
                    style={{
                      ...theme.text.caption,
                    }}
                  >
                    {t("result.resolution")}
                  </Text>
                  <Text
                    className="font-headline text-on-surface"
                    style={{ ...theme.text.title }}
                  >
                    {currentOutput.width}×{currentOutput.height}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Two ways back into the studio — they are NOT the same journey.
            "Try another style" keeps the photo the user already uploaded and
            only clears the style, so a second render is two taps instead of
            the eight that re-picking a photo costs. That gap is the single
            biggest reason a session ended at one render. "New design" stays
            below for a genuinely fresh start. */}
        <View style={{ marginBottom: 12 }}>
          <PrimaryButton
            label={t("result.try_another_style")}
            icon="color-palette-outline"
            onPress={() => {
              // Keep the photo, drop the style: the studio's style step is the
              // next screen, and everything downstream re-derives from it.
              setDesignStyle(null);
              router.push("/studio/style");
            }}
          />
        </View>

        {/* Redesign Again CTA.
            Was a `Button variant="secondary"`, which rendered the icon stacked
            above the label with no container at all. Two attempts to force the
            row from the outside (`iconLeft`, then an explicit flexDirection in
            `style`) both shipped and both still came out stacked — the override
            never reached the element doing the stacking. Pushing on it a third
            time would have been the same guess again.

            So this stops overriding a component that resists it and uses the one
            that already renders the exact shape we want, one row above: same 56px
            row, label left, icon right, identical press feedback. The only thing
            that changes is the palette. That also removes the last caller of
            `Button`'s secondary+icon combination from this screen, so the two
            buttons can no longer drift apart visually. */}
        <View style={{ marginBottom: 40 }}>
          <PrimaryButton
            label={t("result.new_design")}
            icon="refresh"
            colors={theme.gradient.mutedCta}
            onPress={() => { resetStudio(); router.push("/(tabs)/studio"); }}
          />
        </View>
      </ScrollView>

      {/* Fullscreen image viewer with pinch-to-zoom + pan + double-tap.
          The ZoomableImage absorbs all gestures so a single tap can't
          accidentally dismiss the modal while the user is mid-zoom. The
          close button stays absolute-positioned and tappable above the
          gesture surface. To dismiss without zooming, tap the X. */}
      <Modal
        visible={fullscreenUrl !== null}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setFullscreenUrl(null)}
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View
          style={{
            flex: 1,
            backgroundColor: "#000",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {fullscreenUrl ? (
            <ZoomableImage
              uri={fullscreenUrl}
              style={{ width: "100%", height: "100%" }}
            />
          ) : null}
          <Pressable
            onPress={() => setFullscreenUrl(null)}
            hitSlop={12}
            style={{
              position: "absolute",
              top: 48,
              right: 20,
              width: 44,
              height: 44,
              borderRadius: theme.radius.lg,
              backgroundColor: "rgba(0,0,0,0.55)",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>
      </Modal>

      {/* "How did you hear about us" — the only per-user channel signal we can
          get for anything that is not Apple Search Ads. Gated on a COMPLETED
          job on purpose: asked after the first render the user has actually
          seen, it costs nothing, whereas the same question on the first screen
          would sit next to the paywall and be charged against activation.
          The sheet handles its own once-per-identity flag. */}
      <SourceSheet enabled={job?.status === "COMPLETED"} />
    </SafeAreaView>
  );
}
