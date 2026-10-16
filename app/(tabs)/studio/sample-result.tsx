import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Image as RNImage } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
 */
export default function SampleResult() {
    const { t, i18n } = useTranslation();
    const reduceMotion = useReduceMotion();
    const { mode, tool, season: seasonCode, sample: sampleKey } =
        useLocalSearchParams<{ mode?: string; tool?: MagicTool; season?: string; sample?: string }>();
    const seasons = useCatalogStore((s) => s.seasons);
    const { pickImage, isUploading } = useImagePicker();
    const [previewUri, setPreviewUri] = useState<string | null>(null);

    const key = (mode ?? "REDESIGN") as DesignMode;
    const sample = sampleByKey(sampleKey);
    const season = key === "SEASONAL" ? (seasons.find((s) => s.code === seasonCode) ?? seasons[0] ?? null) : null;
    const after = sample ? sampleResult(sample, key, season?.code) : null;
    const feature = STUDIO_FEATURES.find((f) => f.key === key && (f.tool ?? undefined) === (tool ?? undefined))
        ?? STUDIO_FEATURES.find((f) => f.key === key);
    const title = season ? seasonTitle(season, i18n.language) : (feature ? t(feature.titleKey) : "");

    const addOwn = async (kind: "camera" | "gallery") => {
        Haptics.selectionAsync();
        track("add_room_source", { mode: key, source: kind, season: season?.code ?? null, after_sample: sample?.key ?? null });
        const picked = await pickImage(kind, { onPreview: setPreviewUri });
        setPreviewUri(null);
        if (!picked) return;
        continueWithPhoto(picked, key, tool ?? undefined, season?.code ?? null);
    };

    return (
        <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: U.ground }}>
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

            <View style={{ flex: 1, paddingHorizontal: GUTTER, paddingBottom: 12, gap: 14 }}>
                {/* The result fills what the doors leave; the handle is the whole explanation. */}
                <View style={{ flex: 1, borderRadius: R.card, overflow: "hidden", ...theme.elevation.lg }}>
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

                <Text style={{ ...V.caption, color: U.inkMuted, textAlign: "center" }}>{t("studio.sample_result_note")}</Text>

                <Text style={{ ...V.kicker, color: U.inkMuted }}>{t("studio.sample_now_yours")}</Text>
                {/* The add-room doors, unchanged: camera recommended, library quiet. */}
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
                            style={{
                                flex: 1, height: 96, borderRadius: R.card,
                                backgroundColor: d.primary ? U.lineAccent : U.surface,
                                borderWidth: 1, borderColor: d.primary ? "rgba(221,180,119,0.35)" : U.lineNeutral,
                                alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12,
                            }}
                        >
                            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: d.primary ? "rgba(239,208,160,0.18)" : "rgba(246,241,231,0.06)", alignItems: "center", justifyContent: "center" }}>
                                <Ionicons name={d.icon} size={20} color={d.primary ? U.accentBright : U.ink} />
                            </View>
                            <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 14, lineHeight: 18, color: d.primary ? U.accentBright : U.ink, textAlign: "center" }} numberOfLines={2}>
                                {d.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>
        </SafeAreaView>
    );
}
