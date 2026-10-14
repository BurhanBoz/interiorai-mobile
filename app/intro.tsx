import { useRef, useState } from "react";
import { View, Text, Pressable, useWindowDimensions, FlatList, type ViewToken } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import { theme } from "@/config/theme";
import { BeforeAfterSlider } from "@/components/studio/BeforeAfterSlider";
import { STUDIO_FEATURES } from "@/components/studio/featureCatalog";
import { seasonMedia, seasonTitle } from "@/components/studio/seasonMedia";
import { useCatalogStore } from "@/stores/catalogStore";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { HexMark } from "@/components/brand/HexMark";
import { track } from "@/services/analytics";

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;

/**
 * The very first screen (build 114, owner 14 Oct — "ilk açılış: tam ekran sürüklenen önce/sonra").
 *
 * <p>Shown once, on an identity's first launch (app/index.tsx routes here instead of Studio).
 * Three cards, swiped: Redesign, the leading season when one is open, Replace. Each is a real
 * result of the app on a real room with a handle the user drags — the one gesture the result
 * screen will ask of them later. One button; no skip (owner, 2.2.0: "Geç YOK"). No copy beyond
 * the tool's name and the button: the pictures are the pitch.
 */
export default function Intro() {
    const { t, i18n } = useTranslation();
    const { width } = useWindowDimensions();
    const reduceMotion = useReduceMotion();
    const seasons = useCatalogStore((s) => s.seasons);
    const [page, setPage] = useState(0);
    const [hintGone, setHintGone] = useState(false);

    const season = seasons[0] ?? null;
    const media = season ? seasonMedia(season) : null;
    const redesign = STUDIO_FEATURES.find((f) => f.id === "REDESIGN")!;
    const replace = STUDIO_FEATURES.find((f) => f.id === "INPAINT_REPLACE")!;
    const pair = (m: (typeof redesign)["media"]) => (m.kind === "pair" || m.kind === "paint" ? { before: m.before, after: m.after } : null);

    const cards = [
        { key: "redesign", title: t(redesign.titleKey), ...pair(redesign.media)! },
        ...(season && media ? [{ key: "season", title: seasonTitle(season, i18n.language), before: media.before, after: media.after }] : []),
        { key: "replace", title: t(replace.titleKey), ...pair(replace.media)! },
    ];

    const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        const i = viewableItems[0]?.index;
        if (typeof i === "number") setPage(i);
    }).current;

    const start = () => {
        Haptics.selectionAsync();
        track("intro_done", { page });
        router.replace("/(tabs)/studio" as never);
    };

    const cardW = width - 32;

    return (
        <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: U.ground }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 10 }}>
                <HexMark width={16} height={18} color={U.accent} />
                <Text style={{ ...V.brand, color: U.accentBright }}>ROOMFRAME</Text>
            </View>

            <FlatList
                data={cards}
                keyExtractor={(c) => c.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={width}
                decelerationRate="fast"
                onViewableItemsChanged={onViewable}
                viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
                style={{ flex: 1, marginTop: 14 }}
                renderItem={({ item }) => (
                    <View style={{ width, paddingHorizontal: 16, flex: 1 }}>
                        <View style={{ flex: 1, borderRadius: R.card, overflow: "hidden", ...theme.elevation.lg }}>
                            <BeforeAfterSlider
                                before={item.before as never}
                                after={item.after as never}
                                radius={R.card}
                                beforeLabel={t("result.before")}
                                afterLabel={t("result.after")}
                                initial={0.5}
                                autoSweep={!hintGone}
                                reduceMotion={reduceMotion}
                                onInteract={() => setHintGone(true)}
                            />
                            {/* The tool's name, on the picture, bottom left. */}
                            <LinearGradient
                                pointerEvents="none"
                                colors={["rgba(14,13,12,0)", "rgba(14,13,12,0.75)"]}
                                style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 110, justifyContent: "flex-end", padding: 16 }}
                            >
                                <Text style={{ ...V.displayS, color: "#fff" }} numberOfLines={2}>{item.title}</Text>
                                {!hintGone && (
                                    <Text style={{ ...V.caption, color: U.accentBright, marginTop: 4 }}>{t("intro.drag_hint")}</Text>
                                )}
                            </LinearGradient>
                        </View>
                        <View style={{ width: cardW }} />
                    </View>
                )}
            />

            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 14 }}>
                {cards.map((c, i) => (
                    <View key={c.key} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? U.accentBright : U.lineNeutral }} />
                ))}
            </View>

            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                <Pressable onPress={start} accessibilityRole="button" style={{ borderRadius: R.button, overflow: "hidden" }}>
                    <LinearGradient colors={[U.accentBright, U.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 56, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ ...V.button, color: U.buttonInk }}>{t("intro.cta")}</Text>
                    </LinearGradient>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
