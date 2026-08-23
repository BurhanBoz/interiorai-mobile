import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  FlatList,
  ScrollView,
  useWindowDimensions,
  Modal,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import * as jobsService from "@/services/jobs";
import { JobActivityCard } from "@/components/gallery/JobActivityCard";
import { TAB_BAR_HEIGHT, BOTTOM_SAFE_GAP } from "@/components/layout/GlassNavBar";
import { getOutputDownloadUrl } from "@/services/files";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useCreditStore } from "@/stores/creditStore";
import type { JobResponse } from "@/types/api";
import { useEffectiveWatermark } from "@/hooks/useEntitlement";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { FreeWatermark } from "@/components/ui/FreeWatermark";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { theme } from "@/config/theme";

const FILTER_ALL = "__ALL__";
const FILTER_FAVORITES = "__FAVORITES__";
// P1-5: the History tab's contents live here now. Anything that is not yet a
// finished image — still rendering, failed, cancelled — belongs under this
// filter rather than in a second tab reading the same endpoint. Failed rows
// matter most: they are the only route back to a retry.
const FILTER_ACTIVITY = "__ACTIVITY__";

/* ─────────────────── Empty State ─────────────────── */
// The "no designs yet" state — delegates to the shared <EmptyState/>
// primitive so every blank screen in the app reads as the same product.
// The primitive owns the breathing-icon animation and CTA slot; we only
// supply copy and the action.
function GalleryEmpty() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <EmptyState
        icon="grid-outline"
        title={t("gallery.empty_title")}
        description={t("gallery.empty_description")}
        action={
          <Button
            title={t("gallery.empty_cta")}
            variant="primary"
            size="md"
            onPress={() => router.push("/(tabs)/studio")}
            fullWidth={false}
            icon="arrow-forward"
          />
        }
      />
    </View>
  );
}

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
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  // Layout constants — 2-col grid for the premium "editorial" aesthetic.
  const EDGE = 24; // matches History's px-6 — one horizontal rhythm app-wide
  const GAP = 12;
  const COLS = 2;
  const tileWidth = (width - EDGE * 2 - GAP * (COLS - 1)) / COLS;
  // Tiles are slightly taller than wide so the room reads as a card, not a
  // square thumbnail. Roughly 5:6 ratio matches the screenshot.
  const tileHeight = tileWidth * 1.2;

  const authHeaders = useAuthHeaders();
  const params = useLocalSearchParams<{ filter?: string }>();
  const favoriteIds = useFavoritesStore(s => s.ids);
  const toggleFavorite = useFavoritesStore(s => s.toggle);
  const isFavorite = useFavoritesStore(s => s.isFavorite);
  // Free plan tiles show a corner mark; paid plans AND welcome bonus
  // trial users don't. useEffectiveWatermark applies the same logic
  // the result screen + backend use — single source of truth.
  const showWatermark = useEffectiveWatermark();

  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previewItem, setPreviewItem] = useState<GalleryOutput | null>(null);
  const [activeRoomFilter, setActiveRoomFilter] = useState<string>(FILTER_ALL);

  // Deep link: /gallery?filter=favorites pre-activates the Favorites chip
  // so Profile → Curated Favorites lands straight on the filtered list.
  useEffect(() => {
    if (params.filter === "favorites") {
      setActiveRoomFilter(FILTER_FAVORITES);
    }
  }, [params.filter]);

  const handleToggleFavorite = useCallback(
    (outputId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleFavorite(outputId);
    },
    [toggleFavorite],
  );
  const allJobIds = useRef(new Set<string>());

  const fetchPage = useCallback(async (p: number, replace = false) => {
    try {
      // Page size 10 with pages 0+1 loaded up-front: first paint shows 20,
      // every scroll-load appends 10 (2026-07 founder spec). Mixed sizes
      // would corrupt the backend's page math, so the unit stays 10.
      const res = await jobsService.listJobs(p, 10);
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
      await fetchPage(1);
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
  const allOutputs: GalleryOutput[] = useMemo(() => {
    return jobs
      .filter(j => j.status === "COMPLETED" && j.outputs?.length > 0)
      .flatMap(j =>
        j.outputs.map(o => ({
          jobId: j.id,
          outputId: o.id,
          // Direct pre-signed S3 URL (1-hour expiry). Going through the
          // backend /download redirect breaks on iOS — URLSession forwards
          // the Authorization header to the S3 redirect target and S3
          // returns 403 because the request has both Bearer auth AND
          // X-Amz-Signature query auth. See result/[jobId].tsx.
          imageUrl: o.url,
          roomTypeName: j.roomTypeName ?? "",
          designStyleName: j.designStyleName ?? "",
          qualityTier: j.qualityTier,
          createdAt: j.finishedAt || j.createdAt,
        })),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [jobs]);

  // Everything that is NOT a finished image. Sorted newest-first like the
  // grid so the two views agree about what "recent" means.
  const activityJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.status !== "COMPLETED" || !(j.outputs?.length > 0))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [jobs],
  );

  // Live count for the chip badge — the user should not have to switch
  // filters to discover that something is still rendering.
  const activeCount = useMemo(
    () =>
      jobs.filter((j) =>
        ["PENDING", "SUBMITTED", "PROCESSING", "RUNNING"].includes(j.status),
      ).length,
    [jobs],
  );

  // Unique room types for the filter chip row. Sorted by frequency so the
  // user's most-used rooms surface first — small UX win.
  const roomFilters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of allOutputs) {
      if (!o.roomTypeName) continue;
      counts.set(o.roomTypeName, (counts.get(o.roomTypeName) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [allOutputs]);

  // Apply room-type / favorites filter. Favorites short-circuit any room
  // filter (they're orthogonal categories from the user's point of view).
  // Free-text search was removed in the 2026-07 first review (categories
  // cover discovery at this content volume) — restore from git if needed.
  const outputs = useMemo(() => {
    let base: GalleryOutput[];
    if (activeRoomFilter === FILTER_ALL) {
      base = allOutputs;
    } else if (activeRoomFilter === FILTER_FAVORITES) {
      base = allOutputs.filter(o => favoriteIds.includes(o.outputId));
    } else {
      base = allOutputs.filter(o => o.roomTypeName === activeRoomFilter);
    }

    return base;
  }, [allOutputs, activeRoomFilter, favoriteIds]);

  const showActivity = activeRoomFilter === FILTER_ACTIVITY;

  // Tap navigates directly to the result detail page. Long-press opens a
  // fullscreen zoom preview for a quick peek without losing scroll position.
  const handleTap = useCallback((item: GalleryOutput) => {
    Haptics.selectionAsync();
    router.push(`/result/${item.jobId}`);
  }, []);
  const handleLongPress = useCallback((item: GalleryOutput) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPreviewItem(item);
  }, []);

  /* ── Grid Tile — 2-col with bottom-left label ── */
  const renderTile = useCallback(
    ({ item }: { item: GalleryOutput }) => (
      <Pressable
        onPress={() => handleTap(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={300}
        style={({ pressed }) => ({
          width: tileWidth,
          height: tileHeight,
          borderRadius: theme.radius.md,
          overflow: "hidden",
          backgroundColor: "#1C1B1B",
          borderWidth: 1,
          borderColor: "rgba(225,195,155,0.08)",
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <Image
          // item.imageUrl is the pre-signed S3 URL; no Authorization
          // header (supplying one → S3 403 on redirect target).
          source={{ uri: item.imageUrl }}
          style={{ width: tileWidth, height: tileHeight }}
          contentFit="cover"
          transition={200}
        />

        {/* Bottom-left gradient + label, like the editorial reference */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.85)"]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingTop: 40,
            paddingBottom: 12,
            paddingHorizontal: 12,
          }}
        >
          <Text
            className="text-white font-headline"
            style={{
              ...theme.text.title,
            }}
            numberOfLines={1}
          >
            {item.designStyleName || "Design"}
          </Text>
          {item.roomTypeName ? (
            <Text
              style={{
                ...theme.text.caption,
                color: "rgba(224,194,154,0.75)",
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {item.roomTypeName}
            </Text>
          ) : null}
        </LinearGradient>

        {/* Heart toggle top-right — own Pressable so tapping it favorites
            without triggering the parent tile's navigation. RN Pressable
            stacking handles event precedence correctly here. */}
        <Pressable
          onPress={() => handleToggleFavorite(item.outputId)}
          hitSlop={8}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 34,
            height: 34,
            borderRadius: theme.radius.md,
            backgroundColor: isFavorite(item.outputId)
              ? "rgba(225,195,155,0.22)"
              : "rgba(19,19,19,0.6)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: isFavorite(item.outputId)
              ? "rgba(225,195,155,0.65)"
              : "rgba(255,255,255,0.12)",
          }}
        >
          <Ionicons
            name={isFavorite(item.outputId) ? "heart" : "heart-outline"}
            size={16}
            color={isFavorite(item.outputId) ? theme.color.goldDawn : "#E5E2E1"}
          />
        </Pressable>

        {/* Quality chip top-LEFT — moved off top-right to make room for
            the heart toggle. Only shown above STANDARD tier. */}
        {item.qualityTier !== "STANDARD" && (
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              backgroundColor: "rgba(19,19,19,0.7)",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: "rgba(224,194,154,0.3)",
            }}
          >
            <Text
              style={{
                ...theme.text.caption,
                color: "#E0C29A",
              }}
            >
              {item.qualityTier === "ULTRA_HD" ? "4K" : "HD"}
            </Text>
          </View>
        )}

        {/* Free plan tiny corner mark */}
        {showWatermark && <FreeWatermark size="sm" />}
      </Pressable>
    ),
    [
      tileWidth,
      tileHeight,
      authHeaders,
      handleTap,
      handleLongPress,
      handleToggleFavorite,
      isFavorite,
      showWatermark,
    ],
  );

  /* ── Filter Chip ── */
  const FilterChip = ({
    label,
    value,
    badge,
  }: {
    label: string;
    value: string;
    /** Live count shown as a dot-badge — used by Activity for in-flight jobs. */
    badge?: number;
  }) => {
    const active = activeRoomFilter === value;
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setActiveRoomFilter(value);
        }}
        style={({ pressed }) => ({
          paddingHorizontal: 18,
          paddingVertical: 9,
          borderRadius: theme.radius.pill,
          backgroundColor: active ? "#C4A882" : "rgba(28,27,27,0.85)",
          borderWidth: 1,
          borderColor: active
            ? "rgba(254,223,181,0.5)"
            : "rgba(77,70,60,0.4)",
          transform: [{ scale: pressed ? 0.97 : 1 }],
          // Active chip gets a soft gold glow so the selection reads as
          // "on" at a glance, not just a color swap.
          ...(active && {
            shadowColor: "#E0C29A",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
          }),
        })}
      >

        <Text
          style={{
            ...theme.text.caption,
            color: active ? "#3F2D11" : "#E5E2E1",
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {badge ? (
          <View
            style={{
              minWidth: 18,
              paddingHorizontal: 5,
              paddingVertical: 1,
              borderRadius: theme.radius.pill,
              backgroundColor: active ? theme.color.onGold : theme.color.goldMidday,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                ...theme.text.label,
                color: active ? theme.color.goldDawn : theme.color.onGold,
              }}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

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
        <View className="flex-row items-center" style={{ gap: 14 }}>
          <Text
            className="font-headline text-on-surface"
            style={{
              ...theme.text.label,
            }}
          >
            {t("app.name")}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/studio")}
          className="bg-secondary-container rounded-lg items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Ionicons name="add" size={22} color="#E0C29A" />
        </Pressable>
      </View>

      {allOutputs.length === 0 && !loading ? (
        <View className="flex-1">
          <View className="px-6 pt-4 mb-8">
            <Text
              className="text-on-surface font-headline"
              style={{ ...theme.text.display }}
            >
              {t("gallery.title")}
            </Text>
            <View
              className="bg-secondary mt-3"
              style={{ width: 36, height: 2, borderRadius: 1 }}
            />
          </View>
          <GalleryEmpty />
        </View>
      ) : (
        <FlatList
          // One list, two shapes. Activity renders job rows (single column,
          // no columnWrapperStyle — passing one with numColumns={1} throws);
          // every other filter renders the 2-up image grid.
          key={showActivity ? "activity" : "grid"}
          data={showActivity ? (activityJobs as any[]) : (outputs as any[])}
          renderItem={
            showActivity
              ? ({ item }: any) => (
                  <View style={{ paddingHorizontal: EDGE }}>
                    <JobActivityCard item={item} />
                  </View>
                )
              : (renderTile as any)
          }
          keyExtractor={(item: any) => (showActivity ? item.id : item.outputId)}
          numColumns={showActivity ? 1 : 2}
          columnWrapperStyle={
            showActivity ? undefined : { gap: GAP, paddingHorizontal: EDGE }
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_GAP,
            gap: GAP,
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
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
              {/* Editorial header — Curation 01 / Gallery / underline / collection */}
              <View
                style={{
                  paddingHorizontal: EDGE,
                  paddingTop: 12,
                  paddingBottom: 22,
                }}
              >
                <Text
                  className="text-on-surface font-headline"
                  style={{ ...theme.text.display }}
                >
                  {t("gallery.title")}
                </Text>
                <View
                  className="bg-secondary mt-3"
                  style={{ width: 36, height: 2, borderRadius: 1 }}
                />
              </View>

              {/* Search bar */}

              {/* Filter chips — horizontally scrollable. Right-edge fade
                  gradient hints there's more content off-screen without
                  consuming a scrollbar. */}
              <View style={{ position: "relative" }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: EDGE,
                    gap: 10,
                    paddingBottom: 22,
                  }}
                >
                  <FilterChip
                    label={t("gallery.filter_all")}
                    value={FILTER_ALL}
                  />
                  <FilterChip
                    label={t("gallery.filter_favorites")}
                    value={FILTER_FAVORITES}
                  />
                  <FilterChip
                    label={t("gallery.filter_activity")}
                    value={FILTER_ACTIVITY}
                    badge={activeCount || undefined}
                  />
                  {roomFilters.map(name => (
                    <FilterChip key={name} label={name} value={name} />
                  ))}
                </ScrollView>
                <LinearGradient
                  colors={["rgba(19,19,19,0)", "rgba(19,19,19,1)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 22,
                    width: 32,
                  }}
                  pointerEvents="none"
                />
              </View>

              {/* Small breathing space before the grid starts */}
              <View style={{ height: 8 }} />
            </>
          }
          ListFooterComponent={
            <>
              {loadingMore ? (
                <ActivityIndicator
                  size="small"
                  color="#E1C39B"
                  style={{ paddingVertical: 16 }}
                />
              ) : null}

            </>
          }
          ListEmptyComponent={
            activeRoomFilter === FILTER_FAVORITES ? (
              // Favorites filter active with zero items — use the shared
              // EmptyState primitive + a "Browse Gallery" CTA so the user
              // isn't left in an interactional dead-end.
              <View style={{ paddingTop: 40 }}>
                <EmptyState
                  icon="heart-outline"
                  title={t("gallery.no_favorites_title")}
                  description={t("gallery.no_favorites_description")}
                  action={
                    <Button
                      title={t("gallery.filter_all", {
                        defaultValue: "Browse Gallery",
                      })}
                      variant="secondary"
                      size="sm"
                      onPress={() => setActiveRoomFilter(FILTER_ALL)}
                      fullWidth={false}
                    />
                  }
                />
              </View>
            ) : null
          }
        />
      )}

      {/* ── Long-Press Zoom Preview Modal ── */}
      <Modal
        visible={previewItem !== null}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setPreviewItem(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "#000" }}
          onPress={() => setPreviewItem(null)}
        >
          <StatusBar barStyle="light-content" />
          {previewItem && (
            <Image
              // Pre-signed S3 URL; no auth headers (see above).
              source={{ uri: previewItem.imageUrl }}
              style={{ flex: 1 }}
              contentFit="contain"
              transition={200}
            />
          )}
          <Pressable
            onPress={() => setPreviewItem(null)}
            hitSlop={12}
            style={{
              position: "absolute",
              top: 56,
              left: 20,
              width: 40,
              height: 40,
              borderRadius: theme.radius.lg,
              backgroundColor: "rgba(0,0,0,0.6)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          {previewItem && (
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                paddingHorizontal: theme.space.gutter,
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
                    ...theme.text.subtitle,
                    color: "#fff",
                    marginBottom: 4,
                  }}
                >
                  {previewItem.designStyleName || "Design"}
                </Text>
                {previewItem.roomTypeName ? (
                  <Text
                    style={{ ...theme.text.body, color: "rgba(255,255,255,0.6)" }}
                  >
                    {previewItem.roomTypeName}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
