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
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import * as jobsService from "@/services/jobs";
import { JobActivityCard } from "@/components/gallery/JobActivityCard";
import { TAB_BAR_HEIGHT, BOTTOM_SAFE_GAP } from "@/components/layout/GlassNavBar";
import { getOutputDownloadUrl, getFileDownloadUrl } from "@/services/files";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useCreditStore } from "@/stores/creditStore";
import type { JobResponse } from "@/types/api";
import { useCatalogLabel } from "@/hooks/useCatalogLabel";
import { GalleryCard, NewDesignCell } from "@/components/gallery/GalleryCard";
import { GalleryFilterChip } from "@/components/gallery/GalleryFilterChip";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { theme } from "@/config/theme";

/*
 * Redesign v3 (2026-10-10) — visual layer only.
 *
 * A "ROOMFRAME" kicker over the serif title, with the design count on the
 * right once every page is loaded (a count of a half-loaded list would be a
 * wrong number, so it waits). Chips are gold-filled when selected and outlined
 * otherwise. The grid is a two-column masonry: cards are grouped in fours and
 * each group is two columns of TALL+SHORT / SHORT+TALL, so both columns end at
 * the same height and the list stays a plain FlatList — pagination, refresh
 * and the Activity rows are untouched. Cards fade and rise in on first load,
 * 40 ms apart, the first eight only; Reduce Motion renders them settled.
 */
const U = theme.umber;
const V = theme.v2;

const FILTER_ALL = "__ALL__";
const FILTER_FAVORITES = "__FAVORITES__";
// P1-5: the History tab's contents live here now. Anything that is not yet a
// finished image — still rendering, failed, cancelled — belongs under this
// filter rather than in a second tab reading the same endpoint. Failed rows
// matter most: they are the only route back to a retry.
const FILTER_ACTIVITY = "__ACTIVITY__";

// v3 masonry: two card heights from the approved mockup, alternating per
// column so the columns interlock.
const TALL = 230;
const SHORT = 160;
// Entrance stagger, and how many cards get one. Past eight the wait reads
// as lag, not rhythm.
const ENTER_STAGGER = 40;
const ENTER_CAP = 8;

/**
 * "today" / "yesterday" / "3 days ago" / "Sep 19". Calendar days, not 24-hour
 * windows — a design made last night is "yesterday" this morning.
 */
function relativeDay(iso: string, t: (k: string, o?: any) => string, lang: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((midnight(new Date()) - midnight(d)) / 86_400_000);
  if (days <= 0) return t("credits.ledger_today");
  if (days === 1) return t("credits.ledger_yesterday");
  if (days < 7) return t("gallery.v3_days_ago", { count: days });
  return d.toLocaleDateString(lang, { day: "numeric", month: "short" });
}

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


interface GalleryOutput {
  jobId: string;
  outputId: string;
  /**
   * For a picture: the pre-signed output URL. For a clip (V183): the still it
   * was made from, through the authenticated /api/files proxy — the tile
   * shows the poster under a play badge, never the mp4 itself.
   */
  imageUrl: string;
  kind: "image" | "video";
  roomTypeName: string;
  designStyleName: string;
  qualityTier: string;
  createdAt: string;
}

/* ─────────────────── Main Screen ─────────────────── */
export default function GalleryScreen() {
  const { t, i18n } = useTranslation();
  // Room and style arrive as the catalogue's English names; the chip, the
  // tile and the preview show them in the user's language. Filtering still
  // keys on the server's name, which is stable across languages.
  const catalogLabel = useCatalogLabel();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  // Layout constants — 2-col masonry. v3 uses the redesign's wide gutter (20)
  // on every edge of this screen: title, chips and grid share one line.
  const EDGE = theme.v2Layout.gutterWide;
  const GAP = 12;
  const COLS = 2;
  const tileWidth = (width - EDGE * 2 - GAP * (COLS - 1)) / COLS;

  // Cards that mount while this is true get the entrance; it is switched off
  // shortly after the first grid paint, so the next page, a filter switch or
  // a card scrolled back into the window never animates.
  const entranceArmed = useRef(true);

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

  // Disarm the entrance once the first load has painted and the capped
  // stagger has had time to start (8 × 40 ms plus slack).
  useEffect(() => {
    if (loading) return;
    const id = setTimeout(() => {
      entranceArmed.current = false;
    }, ENTER_CAP * ENTER_STAGGER + 300);
    return () => clearTimeout(id);
  }, [loading]);

  // V183 — a clip finishes while the user is elsewhere and lands here. The
  // tab stays mounted, so the mount fetch above ran once and never again;
  // every return to the tab now refreshes the first page quietly (the very
  // first focus is the mount, already covered). Same shape as pull-to-refresh.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        return;
      }
      fetchPage(0, true).catch(() => {});
    }, [fetchPage]),
  );

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
        j.outputs.map(o => {
          // V183 — a clip sits in the grid as its own tile, in the same room
          // category as the render it came from (the names are inherited).
          const isVideo = j.jobType === "VIDEO" || (o.mimeType ?? "").startsWith("video/");
          return {
            jobId: j.id,
            outputId: o.id,
            // Direct pre-signed S3 URL (1-hour expiry). Going through the
            // backend /download redirect breaks on iOS — URLSession forwards
            // the Authorization header to the S3 redirect target and S3
            // returns 403 because the request has both Bearer auth AND
            // X-Amz-Signature query auth. See result/[jobId].tsx.
            // A clip's poster is its input file (the still), which lives
            // behind the authenticated proxy like every input does.
            imageUrl: isVideo
              ? (j.inputFile?.id ? getFileDownloadUrl(j.inputFile.id) : "")
              : o.url,
            kind: isVideo ? "video" : "image",
            roomTypeName: j.roomTypeName ?? "",
            designStyleName: j.designStyleName ?? "",
            qualityTier: j.qualityTier,
            createdAt: j.finishedAt || j.createdAt,
          } as GalleryOutput;
        }),
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
    // The peek is an <Image>; a clip's peek IS its result screen.
    if (item.kind === "video") {
      router.push(`/result/${item.jobId}`);
      return;
    }
    setPreviewItem(item);
  }, []);

  /* ── Masonry block — four cards, two interlocking columns ── */
  // Groups of four keep the FlatList one-column (so it can share the list
  // with the Activity rows) while drawing a true masonry: left column
  // TALL then SHORT, right column SHORT then TALL. Reading order is still
  // newest-first, left-to-right, top-to-bottom.
  const outputBlocks = useMemo(() => {
    const blocks: GalleryOutput[][] = [];
    for (let i = 0; i < outputs.length; i += 4) blocks.push(outputs.slice(i, i + 4));
    return blocks;
  }, [outputs]);

  const renderCard = useCallback(
    (item: GalleryOutput, height: number, flatIndex: number) => {
      const favorited = isFavorite(item.outputId);
      const title =
        catalogLabel("style", item.designStyleName) ||
        catalogLabel("room", item.roomTypeName) ||
        t("gallery.design_fallback");
      const room = item.designStyleName ? catalogLabel("room", item.roomTypeName) : "";
      const when = relativeDay(item.createdAt, t, i18n.language);
      const caption = [room, when].filter(Boolean).join(" · ");
      const a11y = [
        title,
        caption,
        item.kind === "video" ? t("gallery.video_badge") : "",
        favorited ? t("gallery.filter_favorites") : "",
      ].filter(Boolean).join(", ");
      return (
        <GalleryCard
          key={item.outputId}
          width={tileWidth}
          height={height}
          imageUrl={item.imageUrl}
          headers={item.kind === "video" ? authHeaders : undefined}
          kind={item.kind}
          qualityTier={item.qualityTier}
          title={title}
          caption={caption}
          favorited={favorited}
          enterDelay={
            entranceArmed.current && flatIndex < ENTER_CAP ? flatIndex * ENTER_STAGGER : null
          }
          reduceMotion={reduceMotion}
          accessibilityLabel={a11y}
          onPress={() => handleTap(item)}
          onLongPress={() => handleLongPress(item)}
        />
      );
    },
    // favoriteIds: isFavorite is a stable store function, so the ids are
    // what tells this callback a heart changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tileWidth, authHeaders, handleTap, handleLongPress, isFavorite, favoriteIds, catalogLabel, t, i18n.language, reduceMotion],
  );

  const renderBlock = useCallback(
    ({ item: block, index }: { item: GalleryOutput[]; index: number }) => {
      const base = index * 4;
      const [a, b, c, d] = block;
      return (
        <View style={{ flexDirection: "row", gap: GAP, paddingHorizontal: EDGE }}>
          <View style={{ width: tileWidth, gap: GAP }}>
            {a && renderCard(a, TALL, base)}
            {c && renderCard(c, SHORT, base + 2)}
          </View>
          <View style={{ width: tileWidth, gap: GAP }}>
            {b && renderCard(b, SHORT, base + 1)}
            {d && renderCard(d, TALL, base + 3)}
          </View>
        </View>
      );
    },
    [renderCard, tileWidth, EDGE],
  );

  // The header count. Only once every page is in: "20 designs" for a list
  // that is still paging would be a wrong number, and a wrong number on the
  // first screen is worse than none.
  const countLabel =
    !showActivity && !hasMore ? t("gallery.v3_count", { count: outputs.length }) : null;

  /* ── Loading State ── */
  if (loading) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={{ flex: 1, backgroundColor: U.ground, alignItems: "center", justifyContent: "center" }}
      >
        <ActivityIndicator size="large" color={U.accent} />
      </SafeAreaView>
    );
  }

  const pickFilter = (value: string) => {
    Haptics.selectionAsync();
    setActiveRoomFilter(value);
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
      {/* Title block. The old bar carried the app name, a 40px "+" button and
          a 36 × 2 gold rule under a second heading — three pieces of chrome
          for one word. The "+" moved into the grid, where it reads as the
          next cell rather than as a toolbar. v3 adds back only the small
          brand kicker (the Studio tab's lockup) and a quiet count. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingHorizontal: EDGE,
          paddingTop: 10,
          paddingBottom: 16,
        }}
      >
        <View style={{ gap: 4, flexShrink: 1 }}>
          <Text style={{ ...V.brand, color: U.accent }}>ROOMFRAME</Text>
          <Text style={{ ...V.displayM, color: U.ink }} accessibilityRole="header">
            {t("gallery.title")}
          </Text>
        </View>
        {countLabel ? (
          <Text style={{ ...V.rowQuiet, color: U.inkMuted, marginBottom: 4 }}>{countLabel}</Text>
        ) : null}
      </View>

      {allOutputs.length === 0 && !loading ? (
        <View style={{ flex: 1 }}>
          <GalleryEmpty />
        </View>
      ) : (
        <FlatList
          // One list, two shapes. Activity renders job rows; every other
          // filter renders the masonry, four cards per row item (see
          // renderBlock). Both are numColumns={1} since v3, so there is no
          // columnWrapperStyle to get wrong.
          key={showActivity ? "activity" : "grid"}
          data={showActivity ? (activityJobs as any[]) : (outputBlocks as any[])}
          renderItem={
            showActivity
              ? ({ item }: any) => (
                  <View style={{ paddingHorizontal: EDGE }}>
                    <JobActivityCard item={item} />
                  </View>
                )
              : (renderBlock as any)
          }
          // A block is keyed by its position: a new design at the top shifts
          // every card one slot, and position keys let the blocks stay
          // mounted while the cards inside (keyed by outputId) move.
          keyExtractor={(item: any, index: number) => (showActivity ? item.id : `block-${index}`)}
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
              tintColor={U.accent}
              colors={[U.accent]}
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
                    paddingVertical: 4,
                    gap: 8,
                    paddingBottom: 16,
                  }}
                >
                  <GalleryFilterChip
                    label={t("gallery.filter_all")}
                    active={activeRoomFilter === FILTER_ALL}
                    onPress={() => pickFilter(FILTER_ALL)}
                    reduceMotion={reduceMotion}
                  />
                  <GalleryFilterChip
                    label={t("gallery.filter_favorites")}
                    active={activeRoomFilter === FILTER_FAVORITES}
                    onPress={() => pickFilter(FILTER_FAVORITES)}
                    reduceMotion={reduceMotion}
                  />
                  <GalleryFilterChip
                    label={t("gallery.filter_activity")}
                    active={showActivity}
                    onPress={() => pickFilter(FILTER_ACTIVITY)}
                    badge={activeCount || undefined}
                    reduceMotion={reduceMotion}
                  />
                  {roomFilters.map(name => (
                    <GalleryFilterChip
                      key={name}
                      label={catalogLabel("room", name)}
                      active={activeRoomFilter === name}
                      onPress={() => pickFilter(name)}
                      reduceMotion={reduceMotion}
                    />
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
                    bottom: 16,
                    width: 32,
                  }}
                  pointerEvents="none"
                />
              </View>
            </>
          }
          ListFooterComponent={
            <>
              {/* The grid's last cell, not a floating button: the spec's
                  "+ New design". Only on the image grid — the activity list
                  is rows, and a dashed tile in a list of rows is noise. */}
              {!showActivity && (
                <View style={{ paddingHorizontal: EDGE }}>
                  <NewDesignCell
                    width={tileWidth}
                    height={SHORT}
                    onPress={() => router.push("/(tabs)/studio")}
                  />
                </View>
              )}
              {loadingMore ? (
                <ActivityIndicator
                  size="small"
                  color={U.accent}
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
                  {catalogLabel("style", previewItem.designStyleName) || t("gallery.design_fallback")}
                </Text>
                {previewItem.roomTypeName ? (
                  <Text
                    style={{ ...theme.text.body, color: "rgba(255,255,255,0.6)" }}
                  >
                    {catalogLabel("room", previewItem.roomTypeName)}
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
