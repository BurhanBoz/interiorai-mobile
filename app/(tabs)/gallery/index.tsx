import {
  View,
  Text,
  TextInput,
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
import { getOutputDownloadUrl } from "@/services/files";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { useFavoritesStore } from "@/stores/favoritesStore";
import type { JobResponse } from "@/types/api";
import { useDrawer } from "@/components/layout/DrawerProvider";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const TAB_BAR_HEIGHT = 96;
const FILTER_ALL = "__ALL__";
const FILTER_FAVORITES = "__FAVORITES__";

/* ─────────────────── Empty State ─────────────────── */
function EmptyState() {
  const { t } = useTranslation();
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
          {t("gallery.empty_title")}
        </Text>
        <Text
          className="font-body text-on-surface-variant text-center"
          style={{ fontSize: 14, lineHeight: 22, maxWidth: 280, opacity: 0.8 }}
        >
          {t("gallery.empty_description")}
        </Text>
      </View>

      <View className="w-full items-center" style={{ maxWidth: 360 }}>
        <PrimaryButton
          label={t("gallery.empty_cta")}
          onPress={() => router.push("/(tabs)/studio")}
        />
      </View>
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
  const { openDrawer } = useDrawer();
  const { width } = useWindowDimensions();

  // Layout constants — 2-col grid for the premium "editorial" aesthetic.
  const EDGE = 20;
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

  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previewItem, setPreviewItem] = useState<GalleryOutput | null>(null);
  const [activeRoomFilter, setActiveRoomFilter] = useState<string>(FILTER_ALL);
  const [searchQuery, setSearchQuery] = useState("");

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
  const allOutputs: GalleryOutput[] = useMemo(() => {
    return jobs
      .filter(j => j.status === "COMPLETED" && j.outputs?.length > 0)
      .flatMap(j =>
        j.outputs.map(o => ({
          jobId: j.id,
          outputId: o.id,
          imageUrl: getOutputDownloadUrl(j.id, o.id),
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

  // Apply room-type / favorites filter + free-text search. Favorites short-
  // circuit any room filter (they're orthogonal categories from the user's
  // point of view); search is always applied on top.
  const outputs = useMemo(() => {
    let base: GalleryOutput[];
    if (activeRoomFilter === FILTER_ALL) {
      base = allOutputs;
    } else if (activeRoomFilter === FILTER_FAVORITES) {
      base = allOutputs.filter(o => favoriteIds.includes(o.outputId));
    } else {
      base = allOutputs.filter(o => o.roomTypeName === activeRoomFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      base = base.filter(
        o =>
          o.designStyleName?.toLowerCase().includes(q) ||
          o.roomTypeName?.toLowerCase().includes(q),
      );
    }
    return base;
  }, [allOutputs, activeRoomFilter, favoriteIds, searchQuery]);

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
          borderRadius: 14,
          overflow: "hidden",
          backgroundColor: "#1C1B1B",
          borderWidth: 1,
          borderColor: "rgba(225,195,155,0.08)",
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <Image
          source={{ uri: item.imageUrl, headers: authHeaders }}
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
              fontSize: 14,
              fontWeight: "700",
              lineHeight: 17,
            }}
            numberOfLines={1}
          >
            {item.designStyleName || "Design"}
          </Text>
          {item.roomTypeName ? (
            <Text
              style={{
                fontSize: 9,
                fontWeight: "500",
                letterSpacing: 1.4,
                color: "rgba(224,194,154,0.75)",
                textTransform: "uppercase",
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
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(19,19,19,0.55)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: isFavorite(item.outputId)
              ? "rgba(255,180,171,0.5)"
              : "rgba(255,255,255,0.15)",
          }}
        >
          <Ionicons
            name={isFavorite(item.outputId) ? "heart" : "heart-outline"}
            size={16}
            color={isFavorite(item.outputId) ? "#FFB4AB" : "#E5E2E1"}
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
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 1.5,
                color: "#E0C29A",
              }}
            >
              {item.qualityTier === "ULTRA_HD" ? "4K" : "HD"}
            </Text>
          </View>
        )}
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
    ],
  );

  /* ── Filter Chip ── */
  const FilterChip = ({
    label,
    value,
  }: {
    label: string;
    value: string;
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
          borderRadius: 999,
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
            fontSize: 12,
            fontWeight: active ? "700" : "500",
            color: active ? "#3F2D11" : "#E5E2E1",
            letterSpacing: 0.3,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  /* ── Search Bar — client-side filter over style/room names ── */
  const SearchBar = () => (
    <View
      style={{
        marginHorizontal: EDGE,
        marginBottom: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 48,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: "rgba(28,27,27,0.85)",
        borderWidth: 1,
        borderColor: searchQuery
          ? "rgba(225,195,155,0.35)"
          : "rgba(77,70,60,0.3)",
      }}
    >
      <Ionicons name="search" size={18} color="#998F84" />
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t("gallery.search_placeholder")}
        placeholderTextColor="#998F84"
        style={{
          flex: 1,
          fontSize: 13,
          color: "#E5E2E1",
          fontWeight: "400",
          padding: 0,
        }}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {searchQuery ? (
        <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color="#998F84" />
        </Pressable>
      ) : (
        <Ionicons name="options-outline" size={18} color="#998F84" />
      )}
    </View>
  );

  /* ── "Continue Curating" footer card — replaces editorial NEW SERIES ── */
  const NextSeriesCard = () => (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push("/(tabs)/studio");
      }}
      style={({ pressed }) => ({
        marginHorizontal: EDGE,
        marginTop: 36,
        marginBottom: 8,
        padding: 24,
        borderRadius: 20,
        backgroundColor: "rgba(28,27,27,0.7)",
        borderWidth: 1,
        borderColor: "rgba(77,70,60,0.5)",
        gap: 14,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 2.5,
          color: "#E0C29A",
          textTransform: "uppercase",
        }}
      >
        {t("gallery.next_series_eyebrow")}
      </Text>
      <Text
        className="text-on-surface font-headline"
        style={{ fontSize: 22, fontWeight: "700", lineHeight: 28 }}
      >
        {t("gallery.next_series_title")}
      </Text>
      <Text
        style={{
          fontSize: 13,
          lineHeight: 20,
          color: "#998F84",
        }}
      >
        {t("gallery.next_series_body")}
      </Text>
      <View
        className="flex-row items-center"
        style={{ gap: 6, marginTop: 4 }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: "#E0C29A",
            letterSpacing: 0.5,
          }}
        >
          {t("gallery.next_series_cta")}
        </Text>
        <Ionicons name="arrow-forward" size={14} color="#E0C29A" />
      </View>
    </Pressable>
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
        className="flex-row items-center justify-between px-5"
        style={{ height: 56 }}
      >
        <View className="flex-row items-center" style={{ gap: 14 }}>
          <Pressable onPress={openDrawer} hitSlop={8}>
            <Ionicons name="menu" size={24} color="#E5E2E1" />
          </Pressable>
          <Text
            className="font-headline text-on-surface"
            style={{
              fontSize: 13,
              letterSpacing: 3,
              textTransform: "uppercase",
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
          <View className="px-5 pt-4 mb-8">
            <Text
              className="font-label text-secondary font-medium mb-2"
              style={{
                fontSize: 11,
                letterSpacing: 2.5,
                textTransform: "uppercase",
              }}
            >
              {t("gallery.curation_label")}
            </Text>
            <Text
              className="text-on-surface font-headline"
              style={{ fontSize: 36, lineHeight: 40, fontWeight: "700" }}
            >
              {t("gallery.title")}
            </Text>
            <View
              className="bg-secondary mt-3"
              style={{ width: 36, height: 2, borderRadius: 1 }}
            />
            <Text
              className="font-label text-on-surface-variant mt-3"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {t("gallery.curated_collection")}
            </Text>
          </View>
          <EmptyState />
        </View>
      ) : (
        <FlatList
          data={outputs}
          renderItem={renderTile}
          keyExtractor={item => item.outputId}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: EDGE }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: TAB_BAR_HEIGHT + 40,
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
                  className="font-label text-secondary font-medium"
                  style={{
                    fontSize: 11,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                  }}
                >
                  {activeRoomFilter === FILTER_FAVORITES
                    ? `${outputs.length} ${
                        outputs.length === 1 ? "design" : "designs"
                      }`
                    : t("gallery.curation_label")}
                </Text>
                <Text
                  className="text-on-surface font-headline"
                  style={{
                    fontSize: 38,
                    lineHeight: 42,
                    fontWeight: "700",
                    marginTop: 4,
                  }}
                >
                  {activeRoomFilter === FILTER_FAVORITES
                    ? t("gallery.favorites_title")
                    : t("gallery.title")}
                </Text>
                <View
                  className="bg-secondary mt-3"
                  style={{ width: 36, height: 2, borderRadius: 1 }}
                />
                <Text
                  className="font-label text-on-surface-variant mt-3"
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}
                >
                  {activeRoomFilter === FILTER_FAVORITES
                    ? t("profile.curated_favorites")
                    : t("gallery.curated_collection")}
                </Text>
              </View>

              {/* Search bar */}
              <SearchBar />

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

              {/* "Continue Curating" callout — hidden while the user is
                  browsing favorites so the favorites list doesn't get a
                  "start a new design" CTA injected into its tail. */}
              {!loadingMore && activeRoomFilter !== FILTER_FAVORITES && (
                <NextSeriesCard />
              )}
            </>
          }
          ListEmptyComponent={
            activeRoomFilter === FILTER_FAVORITES ? (
              // Favorites filter active with zero items — dedicated empty
              // state that teaches the gesture (tap the heart) instead of
              // the generic "no designs" copy.
              <View
                style={{
                  paddingHorizontal: EDGE,
                  paddingTop: 80,
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="heart-outline"
                  size={48}
                  color="#998F84"
                  style={{ marginBottom: 16 }}
                />
                <Text
                  className="font-headline text-on-surface"
                  style={{ fontSize: 20, marginBottom: 8 }}
                >
                  {t("gallery.no_favorites_title")}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#998F84",
                    textAlign: "center",
                    maxWidth: 260,
                    lineHeight: 20,
                  }}
                >
                  {t("gallery.no_favorites_description")}
                </Text>
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
              source={{ uri: previewItem.imageUrl, headers: authHeaders }}
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
              borderRadius: 20,
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
              </View>
            </View>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
