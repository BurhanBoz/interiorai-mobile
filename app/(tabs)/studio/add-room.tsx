import { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image as RNImage } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import { theme } from "@/config/theme";
import { useStudioStore } from "@/stores/studioStore";
import { useCatalogStore } from "@/stores/catalogStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { STUDIO_FEATURES, type MagicTool } from "@/components/studio/featureCatalog";
import { SAMPLE_ROOMS } from "@/components/studio/sampleRooms";
import { BeforeAfterSlider } from "@/components/studio/BeforeAfterSlider";
import { seasonMedia, seasonTitle } from "@/components/studio/seasonMedia";
import { CameraIcon } from "@/components/studio/StudioIcons";
import { track } from "@/services/analytics";
import type { DesignMode } from "@/types/api";

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;
const GUTTER = theme.v2Layout.gutterWide;

/**
 * "Add your room" — the second screen of the Studio (build 114, owner 14 Oct).
 *
 * <p>The Studio now asks WHAT first and the photo second: the tool's own before/after stays on
 * screen here, so the user knows what they are handing a photo to. Three ways in — camera
 * (filled, the recommendation), library, a sample room — all through {@link useImagePicker},
 * where the consent gate lives. Once the photo is in, the flow continues exactly where it did
 * before: the composer, or the tool's own screen for Magic Edit and Style Transfer.
 */
export default function AddRoom() {
    const { t, i18n } = useTranslation();
    const reduceMotion = useReduceMotion();
    const { mode, tool, season: seasonCode } = useLocalSearchParams<{ mode?: string; tool?: MagicTool; season?: string }>();
    const seasons = useCatalogStore((s) => s.seasons);
    const setPhoto = useStudioStore((s) => s.setPhoto);
    const setMode = useStudioStore((s) => s.setMode);
    const setSeasonCode = useStudioStore((s) => s.setSeasonCode);
    const { pickImage, useSampleImage, isUploading } = useImagePicker();
    const [previewUri, setPreviewUri] = useState<string | null>(null);

    const key = (mode ?? "REDESIGN") as DesignMode;
    const feature = STUDIO_FEATURES.find((f) => f.key === key && (f.tool ?? undefined) === (tool ?? undefined))
        ?? STUDIO_FEATURES.find((f) => f.key === key)
        ?? STUDIO_FEATURES[1];
    const season = key === "SEASONAL" ? (seasons.find((s) => s.code === seasonCode) ?? seasons[0] ?? null) : null;
    const sm = season ? seasonMedia(season) : null;
    const fm = feature.media as { before?: number; after?: number; image?: number };
    const before = sm?.before ?? fm.before ?? fm.image;
    const after = sm?.after ?? fm.after ?? fm.image;
    const title = season ? seasonTitle(season, i18n.language) : t(feature.titleKey);

    const samples = SAMPLE_ROOMS.filter((s) => s.modes.includes(key)).slice(0, 3);

    /** Where the mode goes once a room is in (unchanged from the one-screen Studio). */
    const go = () => {
        setMode(key);
        setSeasonCode(season?.code ?? null);
        if (key === "INPAINT") {
            router.replace((tool ? `/studio/smart-edit?tool=${tool}` : "/studio/smart-edit") as never);
            return;
        }
        if (key === "STYLE_TRANSFER") {
            router.replace("/studio/style-transfer" as never);
            return;
        }
        router.replace("/studio/composer" as never);
    };

    const addPhoto = async (source: { kind: "camera" } | { kind: "gallery" } | { kind: "sample"; module: number }) => {
        Haptics.selectionAsync();
        track("add_room_source", { mode: key, source: source.kind, season: season?.code ?? null });
        const opts = { onPreview: setPreviewUri };
        const picked = source.kind === "sample"
            ? await useSampleImage(source.module, opts)
            : await pickImage(source.kind, opts);
        setPreviewUri(null);
        if (!picked) return;
        setPhoto(picked);
        go();
    };

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

            <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 40, gap: 18 }} showsVerticalScrollIndicator={false}>
                {/* The tool's own result, with the handle. */}
                <View style={{ height: 230, borderRadius: R.card, overflow: "hidden", ...theme.elevation.lg }}>
                    {before && after ? (
                        <BeforeAfterSlider
                            before={before as never}
                            after={after as never}
                            radius={R.card}
                            beforeLabel={t("result.before")}
                            afterLabel={t("result.after")}
                            initial={0.55}
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

                <Text style={{ ...V.kicker, color: U.inkMuted }}>{t("studio.add_room_for")}</Text>

                {/* Two doors side by side (owner, 14 Oct: "daha soft"). Both quiet surfaces with the
                    same hairline; the camera — the recommendation — carries a faint gold wash and a
                    gold icon well, the library a neutral one. Sentence-case labels, not capitals:
                    these are choices, not alarms. */}
                <View style={{ flexDirection: "row", gap: 12, marginTop: -8 }}>
                    {([
                        { kind: "camera" as const, label: t("studio.take_photo"), icon: "camera-outline" as const, primary: true },
                        { kind: "gallery" as const, label: t("studio.choose_from_library"), icon: "images-outline" as const, primary: false },
                    ]).map((d) => (
                        <Pressable
                            key={d.kind}
                            onPress={() => addPhoto({ kind: d.kind })}
                            disabled={isUploading}
                            accessibilityRole="button"
                            accessibilityLabel={d.label}
                            style={{
                                flex: 1, height: 112, borderRadius: R.card,
                                backgroundColor: d.primary ? U.lineAccent : U.surface,
                                borderWidth: 1, borderColor: d.primary ? "rgba(221,180,119,0.35)" : U.lineNeutral,
                                alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 12,
                            }}
                        >
                            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: d.primary ? "rgba(239,208,160,0.18)" : "rgba(246,241,231,0.06)", alignItems: "center", justifyContent: "center" }}>
                                <Ionicons name={d.icon} size={21} color={d.primary ? U.accentBright : U.ink} />
                            </View>
                            <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 14, lineHeight: 18, color: d.primary ? U.accentBright : U.ink, textAlign: "center" }} numberOfLines={2}>
                                {d.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {samples.length > 0 && (
                    <View style={{ gap: 10 }}>
                        <Text style={{ ...V.kicker, color: U.inkMuted }}>{t("studio.try_with_sample")}</Text>
                        <View style={{ flexDirection: "row", gap: 10, height: 92 }}>
                            {samples.map((s) => (
                                <Pressable
                                    key={s.key}
                                    onPress={() => addPhoto({ kind: "sample", module: s.module })}
                                    disabled={isUploading}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${t("studio.try_a_sample")}: ${t(s.labelKey)}`}
                                    style={{ flex: 1, borderRadius: R.tile, overflow: "hidden", backgroundColor: U.surface }}
                                >
                                    <RNImage source={s.thumb ?? s.module} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                                    <View style={{ position: "absolute", left: 6, bottom: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.pill, backgroundColor: U.photoChrome, borderWidth: 1, borderColor: U.photoChromeBorder }}>
                                        <Text numberOfLines={1} style={{ fontFamily: "Inter-SemiBold", fontSize: 11, color: U.ink }}>{t(s.labelKey)}</Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
