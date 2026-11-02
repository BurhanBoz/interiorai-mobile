import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/config/theme";
import { BottomSheet } from "@/components/studio/BottomSheet";
import { STUDIO_FEATURES } from "@/components/studio/featureCatalog";
import { seasonMedia, seasonTitle } from "@/components/studio/seasonMedia";
import type { SeasonResponse } from "@/types/api";

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;

/**
 * A locked (Pro) tool, shown before the paywall (2.4.1, owner 12 Oct).
 *
 * <p>Of the 52 people in 14 days who uploaded a room and never generated, 19
 * tapped Style Transfer or Outdoor and met the paywall straight away — an offer
 * for a tool they had never seen work. The sheet shows that tool's own real
 * before/after (the same pair its teaser uses) with the PRO tag; the paywall
 * is one tap further, on "Unlock with Pro".
 */
export function LockedToolSheet({
    mode,
    season,
    onUnlock,
    onClose,
}: {
    mode: string;
    /** SEASONAL (V202): the season whose tile was tapped — its title and pictures replace the feature's. */
    season?: SeasonResponse | null;
    onUnlock: () => void;
    onClose: () => void;
}) {
    const { t, i18n } = useTranslation();
    const feature = STUDIO_FEATURES.find((f) => f.key === mode);
    if (!feature) return null;
    const fm = feature.media as { before?: number; after?: number; image?: number };
    const sm = season ? seasonMedia(season) : null;
    const before = (sm?.before as number | { uri: string } | undefined) ?? fm.before;
    const after = (sm?.after as number | { uri: string } | undefined) ?? fm.after ?? fm.image;
    const title = season ? seasonTitle(season, i18n.language) : t(feature.titleKey);

    return (
        <BottomSheet onClose={onClose}>
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34, gap: 16 }}>
                <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: U.lineNeutral }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontFamily: "NotoSerif", fontSize: 24, lineHeight: 30, color: U.ink, flexShrink: 1 }} numberOfLines={2}>
                        {title}
                    </Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: R.pill, borderWidth: 1, borderColor: U.accent }}>
                        <Text style={{ ...V.captionStrong, letterSpacing: 1.2, color: U.accentBright }}>PRO</Text>
                    </View>
                </View>
                <Text style={{ fontFamily: "Inter", fontSize: 15, lineHeight: 21, color: U.inkMuted }}>
                    {t(feature.descKey)}
                </Text>

                <View style={{ flexDirection: "row", gap: 8, height: 190 }}>
                    {before != null && (
                        <Tile source={before} label={t("result.before")} />
                    )}
                    {after != null && (
                        <Tile source={after} label={t("result.after")} accent />
                    )}
                </View>
                <Text style={{ ...V.kicker, color: U.inkMuted, textAlign: "center" }}>
                    {t("studio.locked_sample", { defaultValue: "Sample result" })}
                </Text>

                <Pressable
                    onPress={onUnlock}
                    accessibilityRole="button"
                    accessibilityLabel={t("studio.locked_unlock", { defaultValue: "Unlock with Pro" })}
                    style={{ borderRadius: R.button, overflow: "hidden" }}
                >
                    <LinearGradient
                        colors={[U.accentBright, U.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ height: 56, alignItems: "center", justifyContent: "center" }}
                    >
                        <Text style={{ ...V.button, color: U.buttonInk }}>
                            {t("studio.locked_unlock", { defaultValue: "Unlock with Pro" })}
                        </Text>
                    </LinearGradient>
                </Pressable>
                <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8} style={{ alignSelf: "center", paddingVertical: 4 }}>
                    <Text style={{ ...V.row, color: U.inkMuted }}>{t("common.not_now", { defaultValue: "Not now" })}</Text>
                </Pressable>
            </View>
        </BottomSheet>
    );
}

function Tile({ source, label, accent }: { source: number | { uri: string }; label: string; accent?: boolean }) {
    return (
        <View style={{ flex: 1, borderRadius: R.tile, overflow: "hidden", backgroundColor: U.surface }}>
            {/* Explicit 100% box: a bundled image with absoluteFill drew at intrinsic size. */}
            <Image source={source} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} resizeMode="cover" />
            <View
                style={{
                    position: "absolute", left: 8, top: 8,
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill,
                    backgroundColor: accent ? U.accentBright : U.photoChrome,
                }}
            >
                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 11, letterSpacing: 1.2, color: accent ? U.buttonInk : U.ink }}>
                    {label.toLocaleUpperCase()}
                </Text>
            </View>
            {accent && <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, borderRadius: R.tile, borderWidth: 1.5, borderColor: U.accent }} />}
        </View>
    );
}
