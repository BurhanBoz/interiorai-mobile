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
} from "react-native";
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
import { TopBar } from "@/components/layout/TopBar";
import { getJob } from "@/services/jobs";
import { getFileDownloadUrl, getOutputDownloadUrl } from "@/services/files";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { useImageActions } from "@/hooks/useImageActions";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useCreditStore } from "@/stores/creditStore";
import { FreeWatermark } from "@/components/ui/FreeWatermark";
import type { JobResponse, JobOutputResponse } from "@/types/api";

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

  // Gate the upscale button by plan: only show when the active plan has at
  // least one ULTRA_HD_UPSCALE credit rule. Free users don't — hiding it
  // avoids confusing 403 responses after they tap.
  const creditRules = useSubscriptionStore(s => s.creditRules);
  const isFeatureEnabled = useSubscriptionStore(s => s.isFeatureEnabled);
  const canUpscale =
    isFeatureEnabled("ULTRA_HD_UPSCALE") &&
    creditRules.some(r => r.featureCode === "ULTRA_HD_UPSCALE");

  // Free plan gets a small corner watermark over the image. Basic+ plans
  // have `watermark=false` in the plan row → no overlay rendered.
  const planCode = useCreditStore(s => s.planCode);
  const showWatermark = !planCode || planCode === "FREE";
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
        edges={["top"]}
        className="flex-1 bg-surface items-center justify-center"
      >
        <ActivityIndicator size="large" color="#C4A882" />
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 bg-surface items-center justify-center px-8"
      >
        <Ionicons name="alert-circle-outline" size={48} color="#998F84" />
        <Text
          className="font-headline text-on-surface mt-4"
          style={{ fontSize: 20 }}
        >
          {t("errors.generic")}
        </Text>
        <Pressable onPress={() => router.back()} className="mt-6">
          <Text
            className="font-label text-secondary"
            style={{
              fontSize: 13,
              letterSpacing: 1.5,
              textTransform: "uppercase",
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
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <TopBar showBack showBranding />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
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
                marginTop: 12,
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
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
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
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

        {/* Action Row */}
        <View className="flex-row items-start mb-10" style={{ gap: 16 }}>
          {/* Compare */}
          <View className="items-center" style={{ gap: 8 }}>
            <Pressable
              onPress={handleCompare}
              className="w-12 h-12 rounded-full bg-surface-container-high items-center justify-center"
            >
              <Ionicons name="git-compare-outline" size={22} color="#D1C5B8" />
            </Pressable>
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {t("result.compare")}
            </Text>
          </View>

          {/* Download — saves to Photos */}
          <View className="items-center" style={{ gap: 8 }}>
            <Pressable
              onPress={handleDownload}
              disabled={isDownloading}
              className="w-12 h-12 rounded-full bg-surface-container-high items-center justify-center"
              style={{ opacity: isDownloading ? 0.5 : 1 }}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#D1C5B8" />
              ) : (
                <Ionicons name="download-outline" size={22} color="#D1C5B8" />
              )}
            </Pressable>
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {t("result.download")}
            </Text>
          </View>

          {/* Share */}
          <View className="items-center" style={{ gap: 8 }}>
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
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {t("result.share")}
            </Text>
          </View>

          {/* Upscale Button — gated by plan entitlement. Free plan has no
              ULTRA_HD_UPSCALE credit rule so the button disappears; Basic+
              see it and land on /generation/upscale where target tier is
              resolved by the backend. */}
          {canUpscale ? (
            <Pressable
              onPress={() => {
                if (!currentOutput?.id) return;
                router.push(
                  `/generation/upscale?parentJobId=${job.id}&outputId=${currentOutput.id}` as any,
                );
              }}
              className="flex-1 flex-row items-center justify-between bg-surface-container-high rounded-xl"
              style={{ height: 48, marginLeft: 8, paddingHorizontal: 20 }}
            >
              <Text
                className="font-label text-on-surface font-bold"
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                {t("result.upscale")}
              </Text>
              <Ionicons name="sparkles" size={20} color="#FEDFB5" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/plans")}
              className="flex-1 flex-row items-center justify-between rounded-xl"
              style={{
                height: 48,
                marginLeft: 8,
                paddingHorizontal: 20,
                borderWidth: 1,
                borderColor: "rgba(225,195,155,0.3)",
                backgroundColor: "rgba(225,195,155,0.06)",
              }}
            >
              <View>
                <Text
                  className="font-label font-bold"
                  style={{
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "#E0C29A",
                  }}
                >
                  {t("result.upscale_locked")}
                </Text>
                <Text
                  className="font-label"
                  style={{
                    fontSize: 9,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    color: "rgba(224,194,154,0.65)",
                  }}
                >
                  {t("result.upscale_locked_hint")}
                </Text>
              </View>
              <Ionicons name="lock-closed" size={16} color="#E0C29A" />
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
                    fontSize: 10,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  className="font-headline text-on-surface"
                  style={{ fontSize: 14 }}
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
                    fontSize: 10,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                  }}
                >
                  {t("result.generation_time")}
                </Text>
                <Text
                  className="font-headline text-on-surface"
                  style={{ fontSize: 14 }}
                >
                  {(currentOutput.generationTimeMs / 1000).toFixed(1)}s
                </Text>
              </View>
              {currentOutput.seed ? (
                <View className="w-1/2 mb-2">
                  <Text
                    className="font-label text-on-surface-variant mb-1"
                    style={{
                      fontSize: 10,
                      letterSpacing: 3,
                      textTransform: "uppercase",
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
                        fontSize: 14,
                        letterSpacing: 0.5,
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
                      fontSize: 10,
                      letterSpacing: 3,
                      textTransform: "uppercase",
                    }}
                  >
                    {t("result.resolution")}
                  </Text>
                  <Text
                    className="font-headline text-on-surface"
                    style={{ fontSize: 14 }}
                  >
                    {currentOutput.width}×{currentOutput.height}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Redesign Again CTA */}
        <View style={{ marginBottom: 40 }}>
          <PrimaryButton
            label={t("result.new_design")}
            icon="refresh"
            onPress={() => router.push("/(tabs)/studio")}
          />
        </View>
      </ScrollView>

      {/* Fullscreen image viewer — tap anywhere to close */}
      <Modal
        visible={fullscreenUrl !== null}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setFullscreenUrl(null)}
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Pressable
          onPress={() => setFullscreenUrl(null)}
          style={{
            flex: 1,
            backgroundColor: "#000",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {fullscreenUrl ? (
            <Image
              // fullscreenUrl comes from getOutputImageUrl → pre-signed S3.
              // No auth header (supplying one → S3 403, see getOutputImageUrl).
              source={{ uri: fullscreenUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          ) : null}
          <Pressable
            onPress={() => setFullscreenUrl(null)}
            style={{
              position: "absolute",
              top: 48,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
