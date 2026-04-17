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
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as jobsService from "@/services/jobs";
import type { JobResponse } from "@/types/api";
import { useDrawer } from "@/components/layout/DrawerProvider";

/* ─────────────────── Helpers ─────────────────── */
function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const months = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
  ];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${month} ${day}, ${year} · ${hours}:${mins}`;
}

function statusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "COMPLETED":
      return { bg: "#1A3D2E", text: "#4ADE80" };
    case "PROCESSING":
    case "SUBMITTED":
    case "PENDING":
      return { bg: "#3D3A1A", text: "#FACC15" };
    case "FAILED":
    case "CANCELLED":
      return { bg: "#3D1A1A", text: "#F87171" };
    default:
      return { bg: "#2A2A2A", text: "#998F84" };
  }
}

/* ─────────────────── Empty State ─────────────────── */
function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8 -mt-12">
      {/* Icon Container */}
      <View
        className="bg-surface-container-low rounded-xl items-center justify-center mb-8"
        style={{ width: 96, height: 96 }}
      >
        <Ionicons name="time-outline" size={40} color="#D1C5B8" />
      </View>

      {/* Text Content */}
      <View className="items-center mb-10" style={{ maxWidth: 320 }}>
        <Text
          className="font-headline text-on-surface text-center mb-4"
          style={{ fontSize: 22 }}
        >
          No history yet
        </Text>
        <Text
          className="font-body text-on-surface-variant text-center"
          style={{ fontSize: 14, lineHeight: 22, opacity: 0.8 }}
        >
          Your collection of curated spaces is waiting to be built. Begin your
          journey by exploring the studio.
        </Text>
      </View>

      {/* CTA */}
      <Pressable
        onPress={() => router.push("/(tabs)/studio")}
        className="w-full"
        style={({ pressed }) => ({
          maxWidth: 400,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <LinearGradient
          colors={["#C4A882", "#A68A62"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="flex-row items-center justify-between rounded-xl px-8"
          style={{ height: 56 }}
        >
          <Text
            className="font-body text-on-secondary font-semibold"
            style={{
              fontSize: 14,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Start Creating
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/* ─────────────────── History Card ─────────────────── */
function HistoryCard({ item }: { item: JobResponse }) {
  const thumbnail =
    item.outputs?.[0]?.url ?? item.inputFile?.publicUrl ?? undefined;
  const colors = statusColor(item.status);
  const title =
    item.roomTypeName && item.designStyleName
      ? `${item.designStyleName} ${item.roomTypeName}`
      : item.roomTypeName || item.designStyleName || "Untitled Render";

  return (
    <Pressable
      onPress={() => router.push(`/result/${item.id}`)}
      className="bg-surface-container-low rounded-xl overflow-hidden"
      style={({ pressed }) => ({
        padding: 16,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {/* Top Row: Thumbnail + Info */}
      <View className="flex-row" style={{ gap: 16 }}>
        {/* Thumbnail */}
        <View
          className="rounded-xl overflow-hidden"
          style={{ width: 88, height: 88 }}
        >
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={{ width: 88, height: 88 }}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View
              className="bg-surface-container-high items-center justify-center"
              style={{ width: 88, height: 88 }}
            >
              <Ionicons name="image-outline" size={32} color="#998F84" />
            </View>
          )}
        </View>

        {/* Info */}
        <View className="flex-1 justify-between" style={{ paddingVertical: 2 }}>
          {/* Status Badge */}
          <View className="flex-row">
            <View
              className="rounded-full"
              style={{
                backgroundColor: colors.bg,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text
                className="font-label font-bold"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: colors.text,
                }}
              >
                {item.status}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text
            className="text-on-surface font-headline"
            style={{ fontSize: 16 }}
            numberOfLines={1}
          >
            {title}
          </Text>

          {/* Render ID + Credits */}
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            RENDER ID: #{item.id.slice(0, 5).toUpperCase()} ·{" "}
            {item.creditsConsumed}{" "}
            {item.creditsConsumed === 1 ? "CREDIT" : "CREDITS"}
          </Text>
        </View>
      </View>

      {/* Bottom Row: Date + Open icon */}
      <View
        className="flex-row items-center justify-between mt-4 pt-4"
        style={{ borderTopWidth: 1, borderTopColor: "rgba(77,70,60,0.20)" }}
      >
        <Text
          className="font-label text-on-surface-variant"
          style={{ fontSize: 10, letterSpacing: 1.2 }}
        >
          {formatDate(item.createdAt)}
        </Text>
        <Ionicons name="open-outline" size={14} color="#998F84" />
      </View>
    </Pressable>
  );
}

/* ─────────────────── Main Screen ─────────────────── */
export default function HistoryScreen() {
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
            The Architectural Lens
          </Text>
        </View>
      </View>

      {items.length === 0 ? (
        /* ── Empty State ── */
        <View className="flex-1">
          {/* Header */}
          <View className="px-6 pt-8 mb-12">
            <Text
              className="text-on-surface font-headline"
              style={{ fontSize: 42, lineHeight: 48 }}
            >
              History
            </Text>
            <View
              className="bg-secondary mt-4 mb-3"
              style={{ width: 40, height: 2, borderRadius: 1 }}
            />
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 11,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Archived Visual Narratives
            </Text>
          </View>
          <EmptyState />
        </View>
      ) : (
        /* ── With Items ── */
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
          {/* Header Section */}
          <View className="px-6 pt-8 mb-12">
            <Text
              className="text-on-surface font-headline"
              style={{ fontSize: 42, lineHeight: 48 }}
            >
              History
            </Text>
            <LinearGradient
              colors={["#C4A882", "#A68A62"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                width: 48,
                height: 4,
                borderRadius: 9999,
                marginTop: 16,
                marginBottom: 8,
              }}
            />
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 11,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Archived Visual Narratives
            </Text>
          </View>

          {/* History List */}
          <View className="px-6" style={{ gap: 32 }}>
            {items.map(item => (
              <HistoryCard key={item.id} item={item} />
            ))}
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
