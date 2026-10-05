import { View, Text, Pressable, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";
import { Brand } from "@/components/brand/Brand";
import { useJobPolling } from "@/hooks/useJobPolling";
import { requestPushPermission } from "@/hooks/usePushRegistration";
import { createVideoJob, getJob } from "@/services/jobs";
import { useCreditStore } from "@/stores/creditStore";
import { usePendingVideoStore } from "@/stores/pendingVideoStore";
import type { JobStatus } from "@/types/api";

/**
 * Room video in progress (2.3.0).
 *
 * <p>"Bring it to life" used to spin its own button for the whole wait — first the clip plan
 * (Claude, 10–40 s, before the server answers), then the render — with nothing else on screen
 * saying anything was happening. This is the design progress screen's counterpart for a clip:
 * the design it animates, blurred behind, a phase, a bar and the elapsed time.
 *
 * <p><b>Leaving is safe.</b> X goes back to the result; nothing is cancelled. The request keeps
 * running (pendingVideoStore stops a second clip being started meanwhile), the server renders
 * the clip, the push or the gallery brings it back, and the result screen shows "Watch the video"
 * on its next read. Staying until the end returns to the result the same way.
 *
 * <p>Timing from live: 5 clips since 27 Sep took 12–159 s (avg 123 s) from row to finish; the
 * plan comes before the row. The bar is an estimate on those numbers and creeps near the end.
 */
const ESTIMATED_PLANNING_MS = 30_000;
const ESTIMATED_RENDER_MS = 150_000;
/** Matches the result screen and the server's watchdog for a clip. */
const VIDEO_POLL_TIMEOUT_MS = 20 * 60_000;

type Phase = "planning" | "rendering" | "ready" | "error";

export default function VideoProgressScreen() {
    const { t } = useTranslation();
    const params = useLocalSearchParams<{ parentJobId?: string; outputId?: string; imageUrl?: string; videoJobId?: string }>();
    const parentJobId = typeof params.parentJobId === "string" ? params.parentJobId : "";
    const outputId = typeof params.outputId === "string" ? params.outputId : undefined;
    const imageUrl = typeof params.imageUrl === "string" && params.imageUrl ? params.imageUrl : null;

    const fetchBalance = useCreditStore((s) => s.fetchBalance);
    const pending = usePendingVideoStore((s) => (parentJobId ? s.byParent[parentJobId] : undefined));

    const [videoJobId, setVideoJobId] = useState<string | null>(
        typeof params.videoJobId === "string" && params.videoJobId ? params.videoJobId : null,
    );
    const [status, setStatus] = useState<JobStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pushGranted, setPushGranted] = useState<boolean | null>(null);

    const startedAt = useRef(Date.now());
    const renderStartedAt = useRef<number | null>(videoJobId ? Date.now() : null);
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(id);
    }, []);

    // Create the clip — once. A request already in flight (the user left and came back) is
    // waited for through the result screen's next read, not repeated here.
    const asked = useRef(false);
    useEffect(() => {
        if (asked.current || videoJobId || !parentJobId) return;
        if (pending?.status === "creating") return;
        asked.current = true;
        usePendingVideoStore.getState().start(parentJobId);
        createVideoJob(parentJobId, outputId)
            .then((created) => {
                usePendingVideoStore.getState().clear(parentJobId);
                renderStartedAt.current = Date.now();
                setVideoJobId(created.id);
                setStatus(created.status);
                fetchBalance().catch(() => {});
                // The moment a user has a reason to say yes: something finishes while they are away.
                requestPushPermission().then(setPushGranted).catch(() => {});
            })
            .catch((e: any) => {
                usePendingVideoStore.getState().clear(parentJobId);
                // The server's own verdict on the plan wins over the client's.
                if (e?.response?.data?.errorCode === "PLAN_UPGRADE_REQUIRED") {
                    router.replace({
                        pathname: "/paywall",
                        params: { source: "RESULT_VIDEO", afterUrl: imageUrl ?? "", resume: "RESULT_VIDEO" },
                    } as never);
                    return;
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setError(e?.response?.data?.message ?? t("errors.generic"));
            });
    }, [parentJobId, outputId, videoJobId, pending?.status]);

    // Opened on a clip that already exists (the in-progress button): read it once now.
    useEffect(() => {
        if (!videoJobId || status) return;
        getJob(videoJobId).then((j) => setStatus(j.status)).catch(() => {});
    }, [videoJobId]);

    const leaveToResult = () => {
        if (router.canGoBack()) router.back();
        else router.replace(`/result/${parentJobId}` as never);
    };

    useJobPolling(
        videoJobId && status !== "COMPLETED" && status !== "FAILED" && status !== "CANCELLED" ? videoJobId : null,
        (polled) => {
            setStatus(polled.status);
            if (polled.status === "COMPLETED") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                fetchBalance().catch(() => {});
                // A beat on "ready", then back to the result, whose button now says "Watch the video".
                setTimeout(leaveToResult, 900);
            } else if (polled.status === "FAILED" || polled.status === "CANCELLED") {
                fetchBalance().catch(() => {});
                setError(t("generation.video_failed_body"));
            }
        },
        5000,
        { timeoutMs: VIDEO_POLL_TIMEOUT_MS },
    );

    const phase: Phase = error ? "error"
        : status === "COMPLETED" ? "ready"
        : videoJobId ? "rendering"
        : "planning";

    const elapsedMs = now - startedAt.current;
    const target = useMemo(() => {
        if (phase === "ready" || phase === "error") return 100;
        if (phase === "planning") return Math.round(3 + Math.min(1, elapsedMs / ESTIMATED_PLANNING_MS) * 15);
        const r = renderStartedAt.current == null ? 0 : now - renderStartedAt.current;
        return Math.min(95, Math.round(18 + Math.min(1, r / ESTIMATED_RENDER_MS) * 77));
    }, [phase, elapsedMs, now]);

    const progress = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(progress, { toValue: target, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [target, progress]);
    const width = progress.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });

    const rotation = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 2880, easing: Easing.linear, useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, [rotation]);
    const spin = { transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] };

    const label = phase === "error" ? error
        : phase === "ready" ? t("generation.video_phase_ready")
        : phase === "planning" ? t("generation.video_phase_planning")
        : t("generation.video_phase_rendering");
    const hint = t(pushGranted === false ? "result.video_in_progress_hint_gallery" : "result.video_in_progress_hint");
    const secs = Math.floor(elapsedMs / 1000);
    const elapsed = secs < 60
        ? t("generation.seconds_short", { count: secs })
        : secs % 60 === 0
            ? t("generation.minutes_short", { count: Math.floor(secs / 60) })
            : t("generation.minutes_seconds", { mins: Math.floor(secs / 60), secs: secs % 60 });

    return (
        <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface">
            {imageUrl ? (
                <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                    <Image source={{ uri: imageUrl }} blurRadius={30} contentFit="cover" transition={400}
                        style={{ width: "100%", height: "100%", opacity: 0.85 }} />
                    <LinearGradient
                        colors={["rgba(25,21,16,0.35)", "rgba(25,21,16,0.62)", "rgba(25,21,16,0.92)"]}
                        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                </View>
            ) : null}

            <View className="flex-row items-center justify-between px-6 py-4">
                <Brand variant="inline" size="sm" tone="gold" />
                <Pressable
                    onPress={leaveToResult}
                    accessibilityRole="button"
                    accessibilityLabel={t("common.close")}
                    className="items-center justify-center rounded-full"
                    style={{ width: 40, height: 40, backgroundColor: theme.color.surfaceContainerHigh }}
                >
                    <Ionicons name="close" size={20} color={theme.color.onSurface} />
                </Pressable>
            </View>

            <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: theme.space.gutter }}>
                <View className="items-center justify-center" style={{ height: 200 }}>
                    <View className="absolute rounded-full" style={{ width: 180, height: 180, borderWidth: 1, borderColor: "rgba(153,143,131,0.18)" }} />
                    <Animated.View style={[{
                        position: "absolute", width: 180, height: 180, borderRadius: 90, borderWidth: 2,
                        borderColor: "transparent", borderTopColor: "#FEDFB5", borderRightColor: "rgba(254,223,181,0.3)",
                    }, phase === "rendering" || phase === "planning" ? spin : null]} />
                    <Ionicons
                        name={phase === "error" ? "alert-circle" : phase === "ready" ? "checkmark-circle" : "film-outline"}
                        size={40}
                        color={phase === "error" ? "#FFB4AB" : phase === "ready" ? "#4CAF50" : "#FEDFB5"}
                    />
                </View>

                <Text className="font-headline text-on-background text-center mt-10" style={{ ...theme.text.display, fontStyle: "italic" }}>
                    {phase === "error" ? t("generation.failed") : t("result.video_in_progress")}
                </Text>
                <Text className="text-center mt-4" style={{ ...theme.text.caption, color: phase === "error" ? "#FFB4AB" : "#DDB477" }}>
                    {label}
                </Text>

                <View className="mt-8 mx-2">
                    <View className="overflow-hidden rounded-full" style={{ height: 3, backgroundColor: "rgba(77,70,60,0.25)" }}>
                        <Animated.View style={{ height: "100%", width }}>
                            <LinearGradient
                                colors={phase === "error" ? ["#93000A", "#FFB4AB"] : ["#DDB477", "#FEDFB5"]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={{ flex: 1, borderRadius: theme.radius.pill }}
                            />
                        </Animated.View>
                    </View>
                    <View className="flex-row justify-between items-center mt-3">
                        <Text className="font-label" style={{ ...theme.text.caption, color: "rgba(209,197,184,0.6)" }}>
                            {t("generation.elapsed_label")} · {elapsed}
                        </Text>
                        <Text className="font-headline" style={{ ...theme.text.title, color: phase === "error" ? "#FFB4AB" : "#FEDFB5" }}>
                            {phase === "error" ? "—" : `${target}%`}
                        </Text>
                    </View>
                </View>

                {phase === "planning" || phase === "rendering" ? (
                    // Leaving is safe — the clip keeps rendering and comes back by push or gallery.
                    <Text className="text-center mt-8" style={{ ...theme.text.caption, color: "rgba(209,197,184,0.75)" }}>
                        {hint}
                    </Text>
                ) : null}

                {phase === "error" ? (
                    <Pressable
                        onPress={leaveToResult}
                        className="mt-8 self-center rounded-xl"
                        style={{
                            paddingHorizontal: theme.space.gutter, paddingVertical: 14, backgroundColor: "#2C2519",
                            borderWidth: 1, borderColor: "rgba(196,168,130,0.3)",
                        }}
                    >
                        <Text className="font-label text-secondary" style={{ ...theme.text.caption }}>{t("common.back")}</Text>
                    </Pressable>
                ) : null}
            </View>
        </SafeAreaView>
    );
}
