import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import * as jobsService from "@/services/jobs";
import type { JobResponse } from "@/types/api";
import { useDrawer } from "@/components/layout/DrawerProvider";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

/* ─────────────────── Helpers ─────────────────── */

/** Short relative time — "3h", "2d", "Apr 12" — keeps the card header tight. */
function relativeTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

/** Bucket label for a timestamp — "Today", "Yesterday", "This Week", "Earlier". */
function timeBucket(iso: string): "today" | "yesterday" | "this_week" | "earlier" {
  if (!iso) return "earlier";
  const d = new Date(iso);
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, now)) return "today";
  const yesterday = new Date(now.getTime() - oneDay);
  if (sameDay(d, yesterday)) return "yesterday";
  if (now.getTime() - d.getTime() < 7 * oneDay) return "this_week";
  return "earlier";
}

function statusPalette(status: string): {
  bg: string;
  border: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case "COMPLETED":
      return {
        bg: "rgba(74,222,128,0.08)",
        border: "rgba(74,222,128,0.25)",
        text: "#86EFAC",
        dot: "#4ADE80",
      };
    case "PROCESSING":
    case "SUBMITTED":
    case "PENDING":
      return {
        bg: "rgba(250,204,21,0.08)",
        border: "rgba(250,204,21,0.25)",
        text: "#FCD34D",
        dot: "#FACC15",
      };
    case "FAILED":
    case "CANCELLED":
      return {
        bg: "rgba(248,113,113,0.08)",
        border: "rgba(248,113,113,0.25)",
        text: "#FCA5A5",
        dot: "#F87171",
      };
    default:
      return {
        bg: "rgba(153,143,132,0.08)",
        border: "rgba(153,143,132,0.25)",
        text: "#D1C5B8",
        dot: "#998F84",
      };
  }
}

/* ─────────────────── Empty State ─────────────────── */
function EmptyState() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8 -mt-12">
      <View
        className="bg-surface-container-low rounded-xl items-center justify-center mb-8"
        style={{ width: 96, height: 96 }}
      >
        <Ionicons name="time-outline" size={40} color="#D1C5B8" />
      </View>

      <View className="items-center mb-10" style={{ maxWidth: 320 }}>
        <Text
          className="font-headline text-on-surface text-center mb-4"
          style={{ fontSize: 22 }}
        >
          {t("history.empty_title")}
        </Text>
        <Text
          className="font-body text-on-surface-variant text-center"
          style={{ fontSize: 14, lineHeight: 22, opacity: 0.8 }}
        >
          {t("history.empty_description")}
        </Text>
      </View>

      <View className="w-full" style={{ maxWidth: 400 }}>
        <PrimaryButton
          label={t("history.empty_cta")}
          onPress={() => router.push("/(tabs)/studio")}
        />
      </View>
    </View>
  );
}

/* ─────────────────── Status label ─────────────────── */
function useStatusLabel() {
  const { t } = useTranslation();
  return (status: string) => {
    switch (status) {
      case "COMPLETED": return t("history.status_completed");
      case "PROCESSING": return t("history.status_processing");
      case "SUBMITTED": return t("history.status_submitted");
      case "PENDING": return t("history.status_pending");
      case "FAILED": return t("history.status_failed");
      case "CANCELLED": return t("history.status_cancelled");
      default: return status;
    }
  };
}

/* ─────────────────── History Card (premium) ─────────────────── */
function HistoryCard({ item }: { item: JobResponse }) {
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const thumbnail =
    item.outputs?.[0]?.url ?? item.inputFile?.publicUrl ?? undefined;
  const palette = statusPalette(item.status);
  const title =
    item.roomTypeName && item.designStyleName
      ? `${item.designStyleName} ${item.roomTypeName}`
      : item.roomTypeName || item.designStyleName || t("result.new_design");

  return (
    <Pressable
      onPress={() => router.push(`/result/${item.id}`)}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {/* Outer glow card — subtle gradient border for depth */}
      <LinearGradient
        colors={["rgba(224,194,154,0.18)", "rgba(224,194,154,0.04)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 18,
          padding: 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 6,
        }}
      >
        <View
          style={{
            backgroundColor: "#1A1919",
            borderRadius: 17,
            padding: 14,
            flexDirection: "row",
            gap: 14,
          }}
        >
          {/* Thumbnail with rounded mask */}
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 14,
              overflow: "hidden",
              backgroundColor: "#2A2A2A",
            }}
          >
            {thumbnail ? (
              <Image
                source={{ uri: thumbnail }}
                style={{ width: 96, height: 96 }}
                contentFit="cover"
                transition={300}
              />
            ) : (
              // Fallback when the render has no thumbnail. For FAILED
              // jobs we show a warning glyph so the missing image reads
              // as "this run failed" instead of "the app is broken".
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  paddingHorizontal: 8,
                }}
              >
                <Ionicons
                  name={
                    item.status === "FAILED"
                      ? "alert-circle-outline"
                      : "image-outline"
                  }
                  size={26}
                  color={item.status === "FAILED" ? "#D98A7B" : "#998F84"}
                />
                <Text
                  style={{
                    fontSize: 9,
                    lineHeight: 12,
                    color: "#998F84",
                    textAlign: "center",
                    letterSpacing: 0.3,
                  }}
                  numberOfLines={2}
                >
                  {item.status === "FAILED"
                    ? "Image\nunavailable"
                    : "No preview"}
                </Text>
              </View>
            )}
            {/* Quality badge on thumbnail */}
            {item.qualityTier && item.qualityTier !== "STANDARD" && (
              <View
                style={{
                  position: "absolute",
                  bottom: 6,
                  left: 6,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    color: "#E0C29A",
                    textTransform: "uppercase",
                  }}
                >
                  {item.qualityTier === "ULTRA_HD" ? "4K" : "HD"}
                </Text>
              </View>
            )}
          </View>

          {/* Text column */}
          <View style={{ flex: 1, justifyContent: "space-between" }}>
            {/* Row 1: Status pill + relative time */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: palette.bg,
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: palette.dot,
                  }}
                />
                <Text
                  className="font-label"
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    color: palette.text,
                  }}
                >
                  {statusLabel(item.status)}
                </Text>
              </View>
              <Text
                className="font-label text-on-surface-variant"
                style={{ fontSize: 11, letterSpacing: 0.8, opacity: 0.7 }}
              >
                {relativeTime(item.createdAt)}
              </Text>
            </View>

            {/* Row 2: Title */}
            <Text
              className="text-on-surface font-headline"
              style={{ fontSize: 17, lineHeight: 20, fontWeight: "600" }}
              numberOfLines={1}
            >
              {title}
            </Text>

            {/* Row 3: Meta — credits + chevron. The hash-ID prefix that
                used to live here was support/debug information, not
                user-facing copy; users don't care that their job is
                #6FF07, and seeing it made the card feel like an admin
                dashboard. Credits consumed is the meaningful piece. */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  opacity: 0.7,
                  fontVariant: ["tabular-nums"],
                }}
                numberOfLines={1}
              >
                {item.creditsConsumed}{" "}
                {item.creditsConsumed === 1 ? "credit" : "credits"}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color="#E0C29A"
                style={{ opacity: 0.5 }}
              />
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/* ─────────────────── Section Header ─────────────────── */
function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
        marginTop: 8,
      }}
    >
      <LinearGradient
        colors={["#C4A882", "rgba(196,168,130,0.2)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: 32, height: 1.5, borderRadius: 1 }}
      />
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#E0C29A",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: "500",
          letterSpacing: 1,
          color: "rgba(224,194,154,0.4)",
        }}
      >
        {count}
      </Text>
      <View
        style={{
          flex: 1,
          height: 1,
          backgroundColor: "rgba(224,194,154,0.08)",
        }}
      />
    </View>
  );
}

/* ─────────────────── Main Screen ─────────────────── */
type BucketKey = "today" | "yesterday" | "this_week" | "earlier";
const BUCKET_ORDER: BucketKey[] = ["today", "yesterday", "this_week", "earlier"];
const BUCKET_LABELS: Record<BucketKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  earlier: "Earlier",
};

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();
  const [items, setItems] = useState<JobResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (p: number, replace = false) => {
    try {
      const res = await jobsService.listJobs(p, 20);
      setItems(prev => (replace ? res.content : [...prev, ...res.content]));
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

  // Group items by time bucket, preserving descending order within each bucket.
  const grouped = useMemo(() => {
    const buckets: Record<BucketKey, JobResponse[]> = {
      today: [],
      yesterday: [],
      this_week: [],
      earlier: [],
    };
    for (const item of items) {
      buckets[timeBucket(item.createdAt)].push(item);
    }
    return buckets;
  }, [items]);

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
            <Ionicons name="menu" size={24} color="#C4A882" />
          </Pressable>
          <Text
            className="font-headline text-on-surface"
            style={{
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {t("app.name")}
          </Text>
        </View>
      </View>

      {items.length === 0 ? (
        <View className="flex-1">
          <View className="px-6 pt-8 mb-12">
            <Text
              className="text-on-surface font-headline"
              style={{ fontSize: 42, lineHeight: 48 }}
            >
              {t("history.title")}
            </Text>
            <View
              className="bg-secondary mt-4 mb-3"
              style={{ width: 40, height: 2, borderRadius: 1 }}
            />
          </View>
          <EmptyState />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            if (
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 200
            ) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {/* Header Section — premium big title + subtle sub-label */}
          <View className="px-6 pt-8 mb-10">
            <Text
              className="font-label text-secondary mb-2"
              style={{
                fontSize: 11,
                letterSpacing: 3,
                textTransform: "uppercase",
                fontWeight: "500",
                opacity: 0.7,
              }}
            >
              Archive
            </Text>
            <Text
              className="text-on-surface font-headline"
              style={{ fontSize: 42, lineHeight: 48, fontWeight: "700" }}
            >
              {t("history.title")}
            </Text>
            <LinearGradient
              colors={["#C4A882", "rgba(196,168,130,0.15)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                width: 64,
                height: 3,
                borderRadius: 2,
                marginTop: 16,
              }}
            />
          </View>

          {/* Grouped sections */}
          <View className="px-6" style={{ gap: 8 }}>
            {BUCKET_ORDER.map(bucket => {
              const list = grouped[bucket];
              if (list.length === 0) return null;
              return (
                <View key={bucket} style={{ marginBottom: 24 }}>
                  <SectionHeader
                    label={BUCKET_LABELS[bucket]}
                    count={list.length}
                  />
                  <View style={{ gap: 14 }}>
                    {list.map(job => (
                      <HistoryCard key={job.id} item={job} />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>

          {loadingMore && (
            <ActivityIndicator
              size="small"
              color="#E1C39B"
              style={{ paddingVertical: 16 }}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
