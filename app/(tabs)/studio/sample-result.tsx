import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image as RNImage, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import { theme } from "@/config/theme";
import { useCatalogStore } from "@/stores/catalogStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { STUDIO_FEATURES, type MagicTool } from "@/components/studio/featureCatalog";
import { sampleByKey, sampleResult } from "@/components/studio/sampleResults";
import { continueWithPhoto } from "@/components/studio/afterPhoto";
import { BeforeAfterSlider } from "@/components/studio/BeforeAfterSlider";
import { ScanCard } from "@/components/generation/ScanCard";
import { GoldProgressBar } from "@/components/generation/GoldProgressBar";
import { seasonTitle } from "@/components/studio/seasonMedia";
import { track } from "@/services/analytics";
import type { DesignMode } from "@/types/api";

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;
const GUTTER = theme.v2Layout.gutterWide;

/**
 * A sample room's finished result, at once (17 Oct, owner).
 *
 * <p>Reached from the add-room screen when the tapped sample has a bundled result for this
 * mode ({@link sampleResult}). No upload, no job, no credit: the picture is the app's own
 * output for that room and the handle lets the user see what changed. Under it the same two
 * doors as add-room — camera and library — so the next tap is their own room, and from there
 * the flow is exactly the real one ({@link continueWithPhoto}).
 *
 * <p>2.6.1 (owner, 20 Oct: "direkt getirmeyelim, generation ekranımız 10 saniye dursun"): the result
 * is not shown at once. The screen first plays the generation screen — the same ScanCard, title and
 * gold bar the real job shows, over the sample photo — for {@link STAGE_MS}, then reveals the result.
 * The sample reads as a design being made, which is what it is a stand-in for. No upload, no job,
 * no credit — the wait is a timer, nothing else.
 */

/** How long the staged "designing" screen plays before the result (owner: about ten seconds). */
const STAGE_MS = 10_000;
export default function SampleResult() {
    const { t, i18n } = useTranslation();
    const reduceMotion = useReduceMotion();
    const { mode, tool, season: seasonCode, sample: sampleKey } =
        useLocalSearchParams<{ mode?: string; tool?: MagicTool; season?: string; sample?: string }>();
    const seasons = useCatalogStore((s) => s.seasons);
    const { pickImage, isUploading } = useImagePicker();
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const { width } = useWindowDimensions();

    const key = (mode ?? "REDESIGN") as DesignMode;
    const sample = sampleByKey(sampleKey);
    const season = key === "SEASONAL" ? (seasons.find((s) => s.code === seasonCode) ?? seasons[0] ?? null) : null;
    const after = sample ? sampleResult(sample, key, season?.code) : null;
    const feature = STUDIO_FEATURES.find((f) => f.key === key && (f.tool ?? undefined) === (tool ?? undefined))
        ?? STUDIO_FEATURES.find((f) => f.key === key);
    const title = season ? seasonTitle(season, i18n.language) : (feature ? t(feature.titleKey) : "");

    // The staged wait: progress climbs like the real screen (fast at first, creeping toward 95),
    // snaps to 100 for a beat, then the result takes the screen. Reduce Motion skips the wait.
    const [staging, setStaging] = useState(!reduceMotion && !!(sample && after));
    const [progress, setProgress] = useState(2);
    const [ready, setReady] = useState(false);
    const t0 = useRef(Date.now());
    useEffect(() => {
        if (!staging) return;
        const tick = setInterval(() => {
            const el = Date.now() - t0.current;
            const lin = Math.min(1, el / (STAGE_MS * 0.93));
            setProgress(Math.min(95, Math.round(2 + 93 * (1 - Math.pow(1 - lin, 2)))));
        }, 200);
        const done = setTimeout(() => { setReady(true); setProgress(100); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }, STAGE_MS);
        const reveal = setTimeout(() => setStaging(false), STAGE_MS + 700);
        return () => { clearInterval(tick); clearTimeout(done); clearTimeout(reveal); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [staging]);
    const roomLabel = sample ? t(sample.labelKey) : null;
    const stageTitle = roomLabel
        ? t("generation.designing_room", { room: i18n.language?.startsWith("en") ? roomLabel.toLowerCase() : roomLabel })
        : t("generation.creating");
    const stageSub = ready ? t("generation.phase_ready") : t("generation.style_about_a_minute", { style: title });

    const addOwn = async (kind: "camera" | "gallery") => {
        Haptics.selectionAsync();
        track("add_room_source", { mode: key, source: kind, season: season?.code ?? null, after_sample: sample?.key ?? null });
        const picked = await pickImage(kind, { onPreview: setPreviewUri });
        setPreviewUri(null);
        if (!picked) return;
        continueWithPhoto(picked, key, tool ?? undefined, season?.code ?? null);
    };

    if (staging && sample) {
        const photo = sample.module as never;
        return (
            <View style={{ flex: 1, backgroundColor: U.ground }}>
                {/* The sample room, blurred and darkened, as the real progress screen does with the user's photo. */}
                <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                    <Image source={photo} blurRadius={36} contentFit="cover" transition={400} style={{ width: "100%", height: "100%", opacity: 0.8 }} />
                    <LinearGradient colors={["rgba(25,21,16,0.55)", "rgba(25,21,16,0.45)", U.ground]} locations={[0, 0.45, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                </View>
                <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: GUTTER, paddingTop: 4 }}>
                        <Text style={{ ...V.brand, color: U.accent }} accessibilityRole="header">Roomframe</Text>
                        <Pressable
                            onPress={() => router.back()}
                            accessibilityRole="button"
                            accessibilityLabel={t("common.close")}
                            hitSlop={6}
                            style={{ width: 44, height: 44, borderRadius: R.pill, alignItems: "center", justifyContent: "center", backgroundColor: U.photoChrome, borderWidth: 1, borderColor: U.photoChromeBorder }}
                        >
                            <Ionicons name="close" size={18} color={U.ink} />
                        </Pressable>
                    </View>
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: GUTTER }}>
                        <ScanCard source={photo} scanning={!ready} ready={ready} reduceMotion={reduceMotion} progress={progress} accessibilityLabel={roomLabel ?? undefined} />
                        <View style={{ alignItems: "center", marginTop: 28 }}>
                            <Text style={{ ...V.displayS, color: U.ink, textAlign: "center" }} accessibilityRole="header">{stageTitle}</Text>
                            <Text style={{ ...V.body, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center", color: U.inkMuted }}>{stageSub}</Text>
                        </View>
                        <View style={{ marginTop: 28 }}>
                            <GoldProgressBar value={progress} error={false} reduceMotion={reduceMotion} accessibilityLabel={stageSub} />
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, height: 44 }}>
                <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel={t("common.back")}
                    hitSlop={8}
                    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                >
                    <Ionicons name="chevron-back" size={24} color={U.ink} />
                </Pressable>
                <Text style={{ ...V.row, fontFamily: "Inter-SemiBold", color: U.ink, flex: 1 }} numberOfLines={1}>{title}</Text>
                <View style={{ width: 44 }} />
            </View>

            {/* Scrolls like add-room: the tab bar sits over the bottom of this stack, so the doors
                need room under them rather than a flex layout that the bar then covers. */}
            <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 110, gap: 14 }} showsVerticalScrollIndicator={false}>
                {/* The result, taller than the add-room preview: the handle is the whole explanation. */}
                <View style={{ height: Math.round((width - GUTTER * 2) * 1.15), borderRadius: R.card, overflow: "hidden", ...theme.elevation.lg }}>
                    {sample && after ? (
                        <BeforeAfterSlider
                            before={sample.module as never}
                            after={after as never}
                            radius={R.card}
                            beforeLabel={t("result.before")}
                            afterLabel={t("result.after")}
                            initial={0.5}
                            autoSweep
                            reduceMotion={reduceMotion}
                        />
                    ) : null}
                    {(isUploading || previewUri) && (
                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: U.overlayScrim, alignItems: "center", justifyContent: "center", gap: 8 }}>
                            {previewUri ? <RNImage source={{ uri: previewUri }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 }} resizeMode="cover" /> : null}
                            <ActivityIndicator color={U.accentBright} />
                            <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 12, color: "#fff" }}>{t("studio.uploading")}</Text>
                        </View>
                    )}
                </View>

                <Text style={{ ...V.kicker, color: U.inkMuted, marginTop: 4 }}>{t("studio.sample_now_yours")}</Text>
                {/* Two quiet doors (owner, 20 Oct: "daha soft"): no hairlines, a faint gold wash on the
                    camera only, generous radius, the icon in a soft well. */}
                <View style={{ flexDirection: "row", gap: 12, marginTop: -6 }}>
                    {([
                        { kind: "camera" as const, label: t("studio.take_photo"), icon: "camera-outline" as const, primary: true },
                        { kind: "gallery" as const, label: t("studio.choose_from_library"), icon: "images-outline" as const, primary: false },
                    ]).map((d) => (
                        <Pressable
                            key={d.kind}
                            onPress={() => addOwn(d.kind)}
                            disabled={isUploading}
                            accessibilityRole="button"
                            accessibilityLabel={d.label}
                            style={({ pressed }) => ({
                                flex: 1, height: 100, borderRadius: 22,
                                backgroundColor: d.primary ? "rgba(239,208,160,0.14)" : "rgba(246,241,231,0.05)",
                                alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 12,
                                opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
                            })}
                        >
                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: d.primary ? "rgba(239,208,160,0.22)" : "rgba(246,241,231,0.08)", alignItems: "center", justifyContent: "center" }}>
                                <Ionicons name={d.icon} size={21} color={d.primary ? U.accentBright : U.ink} />
                            </View>
                            <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 15, lineHeight: 19, color: d.primary ? U.accentBright : U.ink, textAlign: "center" }} numberOfLines={2}>
                                {d.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
