import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  Modal,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as jobsService from "@/services/jobs";
import { getOutputDownloadUrl } from "@/services/files";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import type { JobResponse } from "@/types/api";
import { useDrawer } from "@/components/layout/DrawerProvider";

/* ─────────────────── Empty State ─────────────────── */
function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8 -mt-12">
      <View style={{ width: 96, height: 96, marginBottom: 32 }}>
        <View
          className="bg-surface-container-low rounded-xl items-center justify-center"
          style={{ width: 96, height: 96 }}
        >
          <Ionicons
            name="grid"
            size={48}
            color="#E0C29A"
            style={{ opacity: 0.6 }}
          />
        </View>
        <View
          className="bg-surface-container-high rounded-lg items-center justify-center absolute"
          style={{
            width: 40,
            height: 40,
            bottom: -8,
            right: -8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons name="compass-outline" size={24} color="#E0C29A" />
        </View>
      </View>

      <View className="items-center mb-10">
        <Text
          className="font-headline text-on-surface text-center mb-3"
          style={{ fontSize: 22 }}
        >
          No designs yet
        </Text>
        <Text
          className="font-body text-on-surface-variant text-center"
          style={{ fontSize: 14, lineHeight: 22, maxWidth: 280, opacity: 0.8 }}
        >
          Your curated architectural portfolio is currently empty. Begin your
          journey by shaping space and form.
        </Text>
      </View>

      <View className="w-full items-center" style={{ maxWidth: 360 }}>
        <Text
          className="font-label text-secondary text-center font-medium mb-6"
          style={{
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Create Your First Design in the Studio
        </Text>

        <Pressable
          onPress={() => router.push("/(tabs)/studio")}
          className="w-full"
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.98 : 1 }],
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
              Go to Studio
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

/* ─────────────────── Flat output item ─────────────────── */
interface GalleryOutput {
  jobId: string;
  outputId: string;
  imageUrl: string;
  roomTypeName: string;
  designStyleName: string;
  qualityTier: string;
  createdAt: string;
}

/* ─────────────────── Main Screen ─────────────────── */
export default function GalleryScreen() {
  const { openDrawer } = useDrawer();
  const { width } = useWindowDimensions();
  const GAP = 2;
  const COLS = 3;
  const tileSize = (width - GAP * (COLS + 1)) / COLS;
  const authHeaders = useAuthHeaders();

  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previewItem, setPreviewItem] = useState<GalleryOutput | null>(null);
  const allJobIds = useRef(new Set<string>());

  const fetchPage = useCallback(async (p: number, replace = false) => {
    try {
      const res = await jobsService.listJobs(p, 20);
      if (replace) {
        allJobIds.current = new Set(res.content.map(j => j.id));
        setJobs(res.content);
      } else {
        const fresh = res.content.filter(j => !allJobIds.current.has(j.id));
        fresh.forEach(j => allJobIds.current.add(j.id));
        setJobs(prev => [...prev, ...fresh]);
      }
      setHasMore(!res.last);
      setPage(p);
    } catch {
      // keep existing items on error
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchPage(0, true);
      setLoading(false);
    })();
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchPage(page + 1);
    setLoadingMore(false);
  }, [hasMore, loadingMore, page, fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(0, true);
    setRefreshing(false);
  }, [fetchPage]);

  // Flatten completed jobs → individual output images, sorted newest first
  const outputs: GalleryOutput[] = useMemo(() => {
    return jobs
      .filter(j => j.status === "COMPLETED" && j.outputs?.length > 0)
      .flatMap(j =>
        j.outputs.map(o => ({
          jobId: j.id,
          outputId: o.id,
          imageUrl: getOutputDownloadUrl(j.id, o.id),
          roomTypeName: j.roomTypeName,
          designStyleName: j.designStyleName,
          qualityTier: j.qualityTier,
          createdAt: j.finishedAt || j.createdAt,
        })),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [jobs]);

  // Grid items = all outputs except the featured (first) one
  const gridItems = useMemo(() => outputs.slice(1), [outputs]);

  const handleItemPress = (item: GalleryOutput) => {
    setPreviewItem(item);
  };

  /* ── Featured Card (latest item, spans full width) ── */
  const FeaturedCard = ({ item }: { item: GalleryOutput }) => (
    <Pressable
      onPress={() => handleItemPress(item)}
      style={({ pressed }) => ({
        height: 220,
        marginHorizontal: GAP,
        borderRadius: 4,
        overflow: "hidden",
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <Image
        source={{ uri: item.imageUrl, headers: authHeaders }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={200}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingTop: 40,
          paddingBottom: 14,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-end justify-between">
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              className="text-white font-headline font-bold"
              style={{ fontSize: 16 }}
              numberOfLines={1}
            >
              {item.designStyleName || "Design"}
            </Text>
            {item.roomTypeName ? (
              <Text
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {item.roomTypeName}
              </Text>
            ) : null}
          </View>
          {item.qualityTier !== "STANDARD" && (
            <View
              style={{
                backgroundColor: "rgba(224,194,154,0.2)",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: "rgba(224,194,154,0.4)",
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color: "#E0C29A",
                  textTransform: "uppercase",
                }}
              >
                {item.qualityTier === "ULTRA_HD" ? "4K" : "HD"}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );

  /* ── Tile Card (square grid item) ── */
  const renderTile = useCallback(
    ({ item }: { item: GalleryOutput }) => (
      <Pressable
        onPress={() => handleItemPress(item)}
        style={({ pressed }) => ({
          width: tileSize,
          height: tileSize,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Image
          source={{ uri: item.imageUrl, headers: authHeaders }}
          style={{ width: tileSize, height: tileSize }}
          contentFit="cover"
          transition={200}
        />
        {item.qualityTier !== "STANDARD" && (
          <View
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              backgroundColor: "rgba(0,0,0,0.55)",
              paddingHorizontal: 5,
              paddingVertical: 2,
              borderRadius: 3,
            }}
          >
            <Text
              style={{
                fontSize: 8,
                fontWeight: "700",
                letterSpacing: 0.8,
                color: "#E0C29A",
              }}
            >
              {item.qualityTier === "ULTRA_HD" ? "4K" : "HD"}
            </Text>
          </View>
        )}
      </Pressable>
    ),
    [tileSize, authHeaders],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: tileSize,
      offset:
        tileSize * Math.floor(index / COLS) + GAP * Math.floor(index / COLS),
      index,
    }),
    [tileSize],
  );

  /* ── Loading State ── */
  if (loading) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 bg-surface items-center justify-center"
      >
        <ActivityIndicator size="large" color="#E1C39B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* ── Top App Bar ── */}
      <View
        className="flex-row items-center justify-between px-6"
        style={{ height: 56 }}
      >
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <Pressable onPress={openDrawer} hitSlop={8}>
            <Ionicons name="menu" size={24} color="#E5E2E1" />
          </Pressable>
          <Text
            className="font-headline text-on-surface"
            style={{
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            The Architectural Lens
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/studio")}
          className="bg-secondary-container rounded items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Ionicons name="add" size={22} color="#E0C29A" />
        </Pressable>
      </View>

      {outputs.length === 0 && !loading ? (
        <View className="flex-1">
          <View className="px-6 pt-4 mb-8">
            <Text
              className="font-label text-secondary font-medium mb-2"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Your Designs
            </Text>
            <Text
              className="text-on-surface font-headline"
              style={{ fontSize: 36, lineHeight: 42 }}
            >
              Gallery
            </Text>
            <View
              className="bg-secondary mt-4"
              style={{ width: 40, height: 2, borderRadius: 1 }}
            />
          </View>
          <EmptyState />
        </View>
      ) : (
        <FlatList
          data={gridItems}
          renderItem={renderTile}
          keyExtractor={item => item.outputId}
          numColumns={3}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: GAP }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120, gap: GAP }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          getItemLayout={getItemLayout}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E0C29A"
              colors={["#E0C29A"]}
            />
          }
          ListHeaderComponent={
            <>
              {/* Header */}
              <View className="px-6 pt-2 pb-3 flex-row items-end justify-between">
                <View>
                  <Text
                    className="text-on-surface font-headline font-bold"
                    style={{ fontSize: 28, lineHeight: 32 }}
                  >
                    Gallery
                  </Text>
                  <Text
                    className="font-label text-on-surface-variant mt-1"
                    style={{ fontSize: 12 }}
                  >
                    {outputs.length} design{outputs.length !== 1 ? "s" : ""} ·{" "}
                    {jobs.filter(j => j.status === "COMPLETED").length} jobs
                  </Text>
                </View>
              </View>

              {/* Featured card */}
              {outputs.length > 0 && <FeaturedCard item={outputs[0]} />}

              {/* Grid section label */}
              {gridItems.length > 0 && (
                <View
                  className="flex-row items-center px-4"
                  style={{ paddingTop: 16, paddingBottom: 8, gap: 8 }}
                >
                  <View
                    style={{
                      width: 3,
                      height: 14,
                      borderRadius: 2,
                      backgroundColor: "#E0C29A",
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                      color: "rgba(224,194,154,0.6)",
                    }}
                  >
                    All Designs
                  </Text>
                </View>
              )}
            </>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#E1C39B"
                style={{ paddingVertical: 16 }}
              />
            ) : null
          }
        />
      )}

      {/* ── Full-Screen Image Preview Modal ── */}
      <Modal
        visible={previewItem !== null}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setPreviewItem(null)}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <StatusBar barStyle="light-content" />
          {previewItem && (
            <Image
              source={{ uri: previewItem.imageUrl, headers: authHeaders }}
              style={{ flex: 1 }}
              contentFit="contain"
              transition={200}
            />
          )}
          {/* Close button */}
          <Pressable
            onPress={() => setPreviewItem(null)}
            hitSlop={12}
            style={{
              position: "absolute",
              top: 56,
              left: 20,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.6)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          {/* Bottom info & action */}
          {previewItem && (
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                paddingHorizontal: 20,
                paddingBottom: 50,
                paddingTop: 24,
              }}
            >
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)"]}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 160,
                }}
              />
              <View style={{ zIndex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#fff",
                    marginBottom: 4,
                  }}
                >
                  {previewItem.designStyleName || "Design"}
                </Text>
                {previewItem.roomTypeName ? (
                  <Text
                    style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}
                  >
                    {previewItem.roomTypeName}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => {
                    const jobId = previewItem.jobId;
                    setPreviewItem(null);
                    router.push(`/result/${jobId}`);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 16,
                    alignSelf: "flex-start",
                    backgroundColor: "rgba(224,194,154,0.2)",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "rgba(224,194,154,0.3)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#E0C29A",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    View Details
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color="#E0C29A" />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
