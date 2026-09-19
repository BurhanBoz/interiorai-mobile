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
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const U = theme.umber;
const V = theme.v2;
import { theme } from "@/config/theme";

const FILTER_ALL = "__ALL__";
const FILTER_FAVORITES = "__FAVORITES__";
// P1-5: the History tab's contents live here now. Anything that is not yet a
// finished image — still rendering, failed, cancelled — belongs under this
// filter rather than in a second tab reading the same endpoint. Failed rows
// matter most: they are the only route back to a retry.
const FILTER_ACTIVITY = "__ACTIVITY__";

/* ─────────────────── Empty State ─────────────────── */
/**
 * The blank gallery.
 *
 * <p>It used to read "Your curated architectural portfolio is currently empty.
 * Begin your journey by shaping space and form." — two sentences of atmosphere
 * where the user needed a door. It is now the same "+ New design" affordance
 * that ends the populated grid, so the empty state and the full one offer the
 * identical next step.
 */
function GalleryEmpty() {
    const { t } = useTranslation();
    return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
            <NewDesignCell width={200} height={150} onPress={() => router.push("/(tabs)/studio")} />
            <Text style={{ ...V.rowQuiet, color: U.inkMuted, marginTop: 16, textAlign: "center" }}>
                {t("gallery.v2_empty_line")}
            </Text>
        </View>
    );
}

/** The dashed cell that closes the grid — and stands alone when it is empty. */
function NewDesignCell({
    width, height, onPress,
}: { width: number; height: number; onPress: () => void }) {
    const { t } = useTranslation();
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={{
                width, height,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: U.accent,
                borderStyle: "dashed",
                backgroundColor: U.lineAccent,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 12,
            }}
        >
            <Text
                style={{ fontFamily: "Inter-SemiBold", fontSize: 13, color: U.accentBright, textAlign: "center" }}
                numberOfLines={2}
            >
                {t("gallery.v2_new_design")}
            </Text>
        </Pressable>
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
          backgroundColor: "#201B15",
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

        {/* A pill, not a gradient band. The gradient darkened a third of
            every image to carry one word; the pill carries the same word and
            gives the photograph back. */}
        <View
          style={{
            position: "absolute",
            left: 10,
            bottom: 10,
            backgroundColor: "rgba(14,13,12,0.75)",
            borderRadius: 100,
            paddingVertical: 5,
            paddingHorizontal: 10,
            maxWidth: tileWidth - 20,
          }}
        >
          <Text
            style={{ fontFamily: "Inter-SemiBold", fontSize: 11.5, color: "#fff" }}
            numberOfLines={1}
          >
            {item.designStyleName || item.roomTypeName}
          </Text>
        </View>

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
                color: "#DDB477",
              }}
            >
              {item.qualityTier === "ULTRA_HD" ? "4K" : "HD"}
            </Text>
          </View>
        )}

        {/* Free plan tiny corner mark */}
        {/* Watermark pill removed from the grid (2026-09-01). The real
            watermark is baked into the output by the backend's WatermarkService,
            so this was a SECOND mark layered on top of the first — and on a
            thumbnail it covered the design the tile exists to show. The free-tier
            mark still travels with the image everywhere it actually matters:
            downloads, shares, screenshots. */}
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
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        {/* 🔴 Görünüm Pressable'da DEĞİL, içerideki View'da.
            Çip, dolgusunu ({pressed}) => ({…}) fonksiyonundan alıyordu ve o
            stil uygulanmıyordu: seçili çipin altın zemini hiç çizilmiyor,
            geriye yalnız o altın zemin için seçilmiş KOYU metin (#231B10)
            kalıyordu — koyu zeminde koyu yazı, yani "seçili sekme siyaha
            dönüyor". Metnin rengi ayrı bir Text'te düz nesne stiliyle
            verildiği için o uygulanıyor, zemin uygulanmıyordu; ikisinin
            ayrışması hatayı görünür kıldı.
            Kök nedeni kanıtlayamadım: aynı dosyadaki grid karosu birebir
            aynı formu kullanıyor ve sorunsuz çiziliyor. O yüzden neden
            aramak yerine kırılamayacak biçime geçildi. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 18,
            paddingVertical: 9,
            borderRadius: theme.radius.pill,
            backgroundColor: active ? U.accent : U.surface,
            borderWidth: 1,
            borderColor: active ? U.accentBright : U.lineNeutral,
          }}
        >
        <Text
          style={{
            ...theme.text.caption,
            color: active ? U.buttonInk : U.ink,
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
        </View>
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
        <ActivityIndicator size="large" color="#DDB477" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
      {/* Title only. The old bar carried the app name, a 40px "+" button and
          a 36 × 2 gold rule under a second heading — three pieces of chrome
          for one word. The "+" moved into the grid, where it reads as the
          next cell rather than as a toolbar. */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>
        <Text style={{ ...V.displayM, color: U.ink }}>{t("gallery.title")}</Text>
      </View>

      {allOutputs.length === 0 && !loading ? (
        <View className="flex-1">
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
              tintColor="#DDB477"
              colors={["#DDB477"]}
            />
          }
          ListHeaderComponent={
            <>
              {/* Başlık burada DEĞİL. Ekranın tepesinde zaten bir "Galeri"
                  var; bu blok ikincisini basıyordu — aynı kelime, iki ayrı
                  punto, art arda. Kalan tek başlık yukarıdaki. */}

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
                  colors={["rgba(25,21,16,0)", "rgba(25,21,16,1)"]}
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
              {/* The grid's last cell, not a floating button: the spec's
                  "+ New design". Only on the image grid — the activity list
                  is rows, and a dashed tile in a list of rows is noise. */}
              {!showActivity && (
                <View style={{ paddingHorizontal: EDGE, paddingTop: GAP }}>
                  <NewDesignCell
                    width={tileWidth}
                    height={tileHeight}
                    onPress={() => router.push("/(tabs)/studio")}
                  />
                </View>
              )}
              {loadingMore ? (
                <ActivityIndicator
                  size="small"
                  color="#DDB477"
                  style={{ paddingVertical: 16 }}
                />
              ) : null}

            </>
          }
          // Boş filtre için ayrı bir boş-durum YOK. Kalp ikonu, iki satır
          // açıklama ve bir "Browse Gallery" düğmesi, altında da kesikli
          // "Yeni tasarım" hücresiyle birlikte üst üste iki ayrı çağrı
          // demekti. Filtre çipleri zaten tepede duruyor — "Tümü"ne dönüş
          // bir dokunuş uzakta — ve footer'daki kesikli hücre boş listede de
          // çiziliyor, yani tek ve net bir sonraki adım kalıyor.
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
