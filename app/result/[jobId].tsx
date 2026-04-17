import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { TopBar } from "@/components/layout/TopBar";
import { getJob } from "@/services/jobs";
import { getFileDownloadUrl, getOutputDownloadUrl } from "@/services/files";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import type { JobResponse, JobOutputResponse } from "@/types/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_WIDTH = SCREEN_WIDTH - 48;

/** Resolve the image URL — use backend proxy for private S3 bucket */
function getOutputImageUrl(jobId: string, output: JobOutputResponse): string {
  return getOutputDownloadUrl(jobId, output.id);
}

const qualityLabels: Record<string, string> = {
  STANDARD: "Standard",
  HD: "HD (4K Ready)",
  ULTRA_HD: "8K Ultra Render",
};

const modeLabels: Record<string, string> = {
  REDESIGN: "Architectural",
  EMPTY_ROOM: "Interior Focus",
  INPAINT: "Atmospheric",
  STYLE_TRANSFER: "Style Transfer",
};

export default function ResultDetailScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [job, setJob] = useState<JobResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
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

  /** Build an authenticated image source for expo-image */
  const getImageSource = (output: JobOutputResponse) => ({
    uri: getOutputImageUrl(job!.id, output),
    headers: authHeaders,
  });

  const handleShare = async () => {
    const url = currentOutput
      ? getOutputImageUrl(job!.id, currentOutput)
      : undefined;
    if (!url) return;
    try {
      await Share.share({ url });
    } catch {
      // user cancelled
    }
  };

  const handleCompare = () => {
    if (!job?.inputFile?.id || !currentOutput) return;
    router.push({
      pathname: "/result/compare",
      params: {
        beforeUrl: getFileDownloadUrl(job.inputFile.id),
        afterUrl: getOutputImageUrl(job.id, currentOutput),
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
          Job Not Found
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
            Go Back
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const metadata = [
    { label: "Room Type", value: job.roomTypeName || "—" },
    { label: "Style", value: job.designStyleName || "—" },
    { label: "Mode", value: modeLabels[job.designMode] ?? job.designMode },
    {
      label: "Quality",
      value: qualityLabels[job.qualityTier] ?? job.qualityTier,
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
              Loading render…
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
                <Image
                  source={getImageSource(item)}
                  style={{ width: IMAGE_WIDTH, height: "100%", zIndex: 1 }}
                  contentFit="cover"
                  onError={e =>
                    console.log(
                      "[Result] Image load error:",
                      getOutputImageUrl(job!.id, item),
                      e,
                    )
                  }
                />
              )}
            />
          ) : currentOutput ? (
            <Image
              source={getImageSource(currentOutput)}
              style={{ width: "100%", height: "100%", zIndex: 1 }}
              contentFit="cover"
              onError={e =>
                console.log(
                  "[Result] Image load error:",
                  getOutputImageUrl(job!.id, currentOutput),
                  e,
                )
              }
            />
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
                {job.creditsConsumed} Credit
                {job.creditsConsumed !== 1 ? "s" : ""}
              </Text>
            </View>
          )}

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
              Compare
            </Text>
          </View>

          {/* Share */}
          <View className="items-center" style={{ gap: 8 }}>
            <Pressable
              onPress={handleShare}
              className="w-12 h-12 rounded-full bg-surface-container-high items-center justify-center"
            >
              <Ionicons name="share-social-outline" size={22} color="#D1C5B8" />
            </Pressable>
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Share
            </Text>
          </View>

          {/* Upscale Button */}
          <Pressable
            onPress={() =>
              router.push(
                `/generation/upscale?jobId=${job.id}&outputId=${currentOutput?.id}` as any,
              )
            }
            className="flex-1 flex-row items-center justify-between bg-surface-container-high rounded-xl"
            style={{ height: 48, marginLeft: 8, paddingHorizontal: 20 }}
          >
            <View>
              <Text
                className="font-label text-on-surface font-bold"
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                Upscale
              </Text>
              <Text
                className="font-label"
                style={{
                  fontSize: 9,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: "rgba(254,223,181,0.7)",
                }}
              >
                2 Credits
              </Text>
            </View>
            <Ionicons name="sparkles" size={20} color="#FEDFB5" />
          </Pressable>
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

        {/* Generation Info */}
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
                  Render Time
                </Text>
                <Text
                  className="font-headline text-on-surface"
                  style={{ fontSize: 14 }}
                >
                  {(currentOutput.generationTimeMs / 1000).toFixed(1)}s
                </Text>
              </View>
              <View className="w-1/2 mb-2">
                <Text
                  className="font-label text-on-surface-variant mb-1"
                  style={{
                    fontSize: 10,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                  }}
                >
                  Resolution
                </Text>
                <Text
                  className="font-headline text-on-surface"
                  style={{ fontSize: 14 }}
                >
                  {currentOutput.width}×{currentOutput.height}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Redesign Again CTA */}
        <Pressable
          onPress={() => router.push("/(tabs)/studio")}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.98 : 1 }],
            marginBottom: 40,
          })}
        >
          <LinearGradient
            colors={["#C4A882", "#A68A62"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              height: 56,
              borderRadius: 16,
              paddingHorizontal: 24,
              borderWidth: 1,
              borderColor: "rgba(196,168,130,0.3)",
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 14,
                fontWeight: "700",
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "#3F2D11",
              }}
            >
              Redesign Again
            </Text>
            <Ionicons name="refresh" size={20} color="#3F2D11" />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
