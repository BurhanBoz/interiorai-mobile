import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import type { JobResponse } from "@/types/api";
import { theme } from "@/config/theme";

/**
 * A job row: thumbnail, what it was, and where it got to.
 *
 * <p>Lifted verbatim out of the old History tab (P1-5, 2026-08-07) when that
 * tab was merged into the gallery. Gallery and History were two tabs reading
 * the SAME `listJobs` endpoint and differing only in presentation — a grid of
 * finished outputs versus a list of job rows. From the user's side that posed
 * a riddle with no good answer: a design they just started lived in History,
 * the same design a minute later lived in Gallery, and nothing on screen said
 * so.
 *
 * <p>The card now backs the gallery's "Activity" filter, which is where
 * anything not yet a finished image belongs — still rendering, failed, or
 * cancelled. Failed rows matter most: they are the only route back to a retry.
 *
 * <p>Moved, not rewritten. The rendering had been through several review
 * rounds; re-typing it to fit a new home would have thrown that away.
 */

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

/* ─────────────────── Job activity row ─────────────────── */
export function JobActivityCard({ item }: { item: JobResponse }) {
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
          borderRadius: theme.radius.md,
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
            borderRadius: theme.radius.md,
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
              borderRadius: theme.radius.md,
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
                    ...theme.text.caption,
                    color: "#998F84",
                    textAlign: "center",
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
                    ...theme.text.label,
                    color: "#E0C29A",
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
                  borderRadius: theme.radius.pill,
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
                    ...theme.text.caption,
                    color: palette.text,
                  }}
                >
                  {statusLabel(item.status)}
                </Text>
              </View>
              <Text
                className="font-label text-on-surface-variant"
                style={{ ...theme.text.caption, opacity: 0.7 }}
              >
                {relativeTime(item.createdAt)}
              </Text>
            </View>

            {/* Row 2: Title */}
            <Text
              className="text-on-surface font-headline"
              style={{ ...theme.text.title }}
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
                  ...theme.text.caption,
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
