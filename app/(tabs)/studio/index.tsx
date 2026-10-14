import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, InteractionManager, type ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import { theme } from "@/config/theme";
import { useCatalogStore } from "@/stores/catalogStore";
import { useCreditStore } from "@/stores/creditStore";
import { useEffectivePlanCode, useEffectiveFeatures } from "@/hooks/useEntitlement";
import { STUDIO_FEATURES, type StudioFeature } from "@/components/studio/featureCatalog";
import { HexMark } from "@/components/brand/HexMark";
import { TAB_BAR_HEIGHT, BOTTOM_SAFE_GAP } from "@/components/layout/GlassNavBar";
import { FREE_DAILY_CEILING } from "@/config/freeTier";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { StarIcon } from "@/components/studio/StudioIcons";
import { LockedToolSheet } from "@/components/studio/LockedToolSheet";
import { BeforeAfterSlider } from "@/components/studio/BeforeAfterSlider";
import { seasonMedia, seasonTitle, themeImage } from "@/components/studio/seasonMedia";
import { resolveFeatureCode } from "@/utils/featureCode";
import { track } from "@/services/analytics";
import type { DesignMode, SeasonResponse } from "@/types/api";

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;
const GUTTER = theme.v2Layout.gutterWide;

/**
 * Studio — the home screen, v4 (build 114, owner 14 Oct 2026).
 *
 * <p><b>What changed and why.</b> v3 asked for the photo first and showed the tools dimmed
 * underneath. The competitor pass of 14 Oct (12 apps, 1,700 reviews) and our own numbers said
 * the problem was not the order but the pitch: Style Transfer ran 6 times in 60 days against
 * 301 redesigns because its tile did not show what it does. So this screen now does one thing:
 * it shows what each tool makes, as a before/after, and asks "what shall we make?". The photo
 * comes on the next screen (add-room.tsx), with the chosen tool's own before/after still in
 * view. Oda tipi / stil / tema seçimi (the composer) is unchanged.
 *
 * <p><b>Seasons lead (V202).</b> The server lists the open seasons; the first is the hero — a
 * full-width before/after whose handle drifts on its own, the season's title from the server,
 * its theme thumbnails in a row — and any further season is an ordinary tile. No season, no
 * tile: a season ends as data.
 *
 * <p><b>Text.</b> One kicker, the tool names (verbs now: "Copy this look", "Furnish an empty
 * room"), PRO tags. No descriptions on tiles (owner: the descriptions in the design doc were
 * for him, not for the screen). This screen scrolls — it is a menu to browse, not a form. The
 * first-run coach marks left with the photo card; the intro screen (app/intro.tsx) does that
 * job now.
 */
export default function Studio() {
    const { t, i18n } = useTranslation();
    const reduceMotion = useReduceMotion();
    const balance = useCreditStore((s) => s.balance);
    const planCode = useEffectivePlanCode();
    const features = useEffectiveFeatures();
    const seasons = useCatalogStore((s) => s.seasons);
    const ensureCatalog = useCatalogStore((s) => s.ensureLoaded);

    useFocusEffect(useCallback(() => { void ensureCatalog(); }, [ensureCatalog]));

    const isLocked = (mode: DesignMode) => {
        const code = resolveFeatureCode(mode, "STANDARD");
        return features.length > 0 && !(features.find((f) => f.featureCode === code)?.enabled ?? true);
    };

    /** The locked tool whose sample is on screen, or null. */
    const [lockedPreview, setLockedPreview] = useState<{ mode: string; season: SeasonResponse | null } | null>(null);

    const open = (feature: StudioFeature, season: SeasonResponse | null) => {
        Haptics.selectionAsync();
        if (isLocked(feature.key)) {
            track("locked_preview_shown", { mode: feature.key, season: season?.code ?? null });
            setLockedPreview({ mode: feature.key, season });
            return;
        }
        track("tool_tile_tap", { mode: feature.key, tool: feature.tool ?? null, season: season?.code ?? null });
        router.push({
            pathname: "/studio/add-room",
            params: { mode: feature.key, ...(feature.tool ? { tool: feature.tool } : {}), ...(season ? { season: season.code } : {}) },
        } as never);
    };

    /**
     * Arrival with a tool already chosen (2.3.0): the welcome screen after a purchase sends
     * "Empty Room", "Style Transfer"… as `intent`. It lands on the add-room screen for that tool.
     */
    const { intent } = useLocalSearchParams<{ intent?: string }>();
    const handledIntent = useRef<string | null>(null);
    useEffect(() => {
        if (!intent || handledIntent.current === intent) return;
        handledIntent.current = intent;
        router.setParams({ intent: undefined } as never);
        const feature = STUDIO_FEATURES.find((f) => f.key === intent);
        if (feature) InteractionManager.runAfterInteractions(() => open(feature, null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intent]);

    const seasonal = STUDIO_FEATURES.find((f) => f.key === "SEASONAL")!;
    const tools = STUDIO_FEATURES.filter((f) => f.key !== "SEASONAL");
    const [hero, ...moreSeasons] = seasons;
    const seasonLocked = isLocked("SEASONAL");

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_GAP + 8, gap: 14 }}
            >
                <Header balance={balance} planCode={planCode} />

                <Text style={{ ...V.kicker, color: U.inkMuted, marginTop: 4 }}>{t("studio.pick_what_to_make")}</Text>

                {hero && (
                    <SeasonHero
                        season={hero}
                        locale={i18n.language}
                        locked={seasonLocked}
                        newTag={isNew(hero) ? t("studio.seasonal_new") : undefined}
                        reduceMotion={reduceMotion}
                        onPress={() => open(seasonal, hero)}
                    />
                )}

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: -4 }}>
                    {moreSeasons.map((s) => {
                        const m = seasonMedia(s);
                        return m ? (
                            <ToolTile
                                key={s.code}
                                label={seasonTitle(s, i18n.language)}
                                before={m.before}
                                after={m.after}
                                locked={seasonLocked}
                                newTag={isNew(s) ? t("studio.seasonal_new") : undefined}
                                onPress={() => open(seasonal, s)}
                            />
                        ) : null;
                    })}
                    {tools.map((f) => {
                        const m = f.media as { before?: number; after?: number; image?: number; reference?: number };
                        return (
                            <ToolTile
                                key={f.id}
                                label={t(f.titleKey)}
                                before={m.before ?? m.image!}
                                after={m.after ?? m.image!}
                                reference={m.reference}
                                locked={isLocked(f.key)}
                                onPress={() => open(f, null)}
                            />
                        );
                    })}
                </View>
            </ScrollView>

            {lockedPreview && (
                <LockedToolSheet
                    mode={lockedPreview.mode}
                    season={lockedPreview.season}
                    onClose={() => setLockedPreview(null)}
                    onUnlock={() => {
                        track("locked_preview_upgrade", { mode: lockedPreview.mode });
                        setLockedPreview(null);
                        // The sheet is an RN Modal: open the paywall once it has gone, so the
                        // push does not land in the same frame as the dismissal (sekme-gezgini).
                        InteractionManager.runAfterInteractions(() =>
                            router.push("/paywall?source=FEATURE_TILE" as never),
                        );
                    }}
                />
            )}
        </SafeAreaView>
    );
}

/** "NEW" for the first two weeks of a season. */
function isNew(season: SeasonResponse): boolean {
    if (!season.startsAt) return false;
    const started = Date.parse(season.startsAt);
    return Number.isFinite(started) && Date.now() - started < 14 * 24 * 3_600_000;
}

/* ── hero ───────────────────────────────────────────────────────────── */

const HERO_HEIGHT = 196;

/**
 * The leading season, full width: its before/after with a drifting handle (the sweep is the
 * invitation; a touch anywhere opens the flow), the title bottom-left, the theme thumbnails
 * bottom-right so the choice inside is visible before the tap, a NEW tag and a PRO tag when
 * the plan does not include it. The gold outline is the only standing outline on the screen.
 */
function SeasonHero({
    season, locale, locked, newTag, reduceMotion, onPress,
}: {
    season: SeasonResponse; locale: string; locked: boolean; newTag?: string; reduceMotion: boolean; onPress: () => void;
}) {
    const m = seasonMedia(season);
    const title = seasonTitle(season, locale);
    if (!m) return null;
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={locked ? `${title}, PRO` : title}
            style={{ height: HERO_HEIGHT, borderRadius: R.card, overflow: "hidden", backgroundColor: U.surface, ...theme.elevation.lg }}
        >
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <BeforeAfterSlider
                    before={m.before as never}
                    after={m.after as never}
                    radius={R.card}
                    initial={0.5}
                    interactive={false}
                    autoSweep
                    reduceMotion={reduceMotion}
                />
            </View>
            <LinearGradient
                pointerEvents="none"
                colors={["rgba(14,13,12,0)", "rgba(14,13,12,0.82)"]}
                style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 96 }}
            />
            <View pointerEvents="none" style={{ position: "absolute", left: 14, right: 14, bottom: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
                <Text style={{ ...V.displayS, fontSize: 22, lineHeight: 26, color: "#fff", flexShrink: 1 }} numberOfLines={2}>{title}</Text>
                <View style={{ flexDirection: "row" }}>
                    {season.themes.slice(0, 4).map((th, i) => {
                        const src = themeImage(th);
                        return src ? (
                            <View key={th.code} style={{ width: 30, height: 30, borderRadius: 15, overflow: "hidden", borderWidth: 1.5, borderColor: U.accentBright, marginLeft: i ? -8 : 0, backgroundColor: U.surface }}>
                                <ExpoImage source={src as never} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                            </View>
                        ) : null;
                    })}
                </View>
            </View>
            {newTag && !locked ? <Tag text={`✦ ${newTag}`} /> : null}
            {locked ? <Tag text="PRO" dark /> : null}
            <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, borderRadius: R.card, borderWidth: 1.5, borderColor: U.accentBright }} />
        </Pressable>
    );
}

function Tag({ text, dark }: { text: string; dark?: boolean }) {
    return (
        <View pointerEvents="none" style={{ position: "absolute", top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.pill, backgroundColor: dark ? U.photoChrome : U.accent, borderWidth: dark ? 1 : 0, borderColor: U.photoChromeBorder }}>
            <Text style={{ ...V.captionStrong, fontSize: 10, letterSpacing: 1.2, color: dark ? U.accentBright : U.ground }}>{text}</Text>
        </View>
    );
}

/* ── tool tiles ─────────────────────────────────────────────────────── */

const TILE_HEIGHT = 150;

/**
 * Two across. The tool's result fills the tile; the room as it was sits as an inset top-left
 * (and the reference photo beside it for "Copy this look"), so every tile reads before → after
 * without a tap. Label bottom-left, PRO tag top-right. A gold outline only while pressed.
 */
function ToolTile({
    label, before, after, reference, locked, newTag, onPress,
}: {
    label: string;
    before: ImageSourcePropType | { uri: string };
    after: ImageSourcePropType | { uri: string };
    reference?: ImageSourcePropType;
    locked: boolean;
    newTag?: string;
    onPress: () => void;
}) {
    const [pressed, setPressed] = useState(false);
    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            accessibilityRole="button"
            accessibilityLabel={locked ? `${label}, PRO` : label}
            style={{ width: "48.5%", flexGrow: 1, height: TILE_HEIGHT, borderRadius: R.tile, overflow: "hidden", backgroundColor: U.surface }}
        >
            <ExpoImage source={after as never} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
                pointerEvents="none"
                colors={["rgba(14,13,12,0)", "rgba(14,13,12,0.85)"]}
                style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70 }}
            />
            {/* The inset(s): before, and the reference for the transfer tool. */}
            <View pointerEvents="none" style={{ position: "absolute", top: 8, left: 8, flexDirection: "row", gap: 4 }}>
                <Inset source={before} />
                {reference ? <Inset source={reference} /> : null}
            </View>
            <Text
                style={{ ...V.tile, fontSize: 13, lineHeight: 16, position: "absolute", left: 10, right: 10, bottom: 9, color: "#fff" }}
                numberOfLines={2}
            >
                {label}
            </Text>
            {locked ? <Tag text="PRO" dark /> : null}
            {!locked && newTag ? <Tag text={`✦ ${newTag}`} /> : null}
            <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, borderRadius: R.tile, borderWidth: pressed ? 1.5 : 1, borderColor: pressed ? U.accent : U.lineNeutral }} />
        </Pressable>
    );
}

function Inset({ source }: { source: ImageSourcePropType | { uri: string } }) {
    return (
        <View style={{ width: 54, height: 42, borderRadius: 7, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.55)", backgroundColor: U.surface }}>
            <ExpoImage source={source as never} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        </View>
    );
}

/* ── header ─────────────────────────────────────────────────────────── */

/**
 * The credit pill is the ONLY place credits appear on this screen; since 2.5.0 no outline
 * either, just the star and the number (owner, 14 Oct). Drawn 34pt tall, hitSlop to 44.
 */
function Header({ balance, planCode }: { balance: number; planCode: string | null }) {
    const { t } = useTranslation();
    // The drip grant is stamped against the UTC calendar day (CreditServiceImpl.maybeGrantDailyDrip),
    // so the next one lands at the next UTC midnight — not at a local hour.
    const hoursToRefill = (() => {
        const now = new Date();
        const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
        return Math.max(1, Math.ceil((next - now.getTime()) / 3_600_000));
    })();
    // At or above the ceiling the drip does not fire. FREE only — a subscriber's credits do not trickle.
    const showRefill = planCode === "FREE" && balance < FREE_DAILY_CEILING;

    return (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <HexMark width={16} height={18} color={U.accent} />
                <Text style={{ ...V.brand, color: U.accentBright }}>ROOMFRAME</Text>
            </View>

            <Pressable
                onPress={() => {
                    Haptics.selectionAsync();
                    router.push("/paywall?source=CREDIT_PILL" as never);
                }}
                accessibilityRole="button"
                accessibilityLabel={t("credits.balance_label", { count: balance })}
                hitSlop={{ top: 5, bottom: 5, left: 8, right: 8 }}
                style={{ height: 34, minWidth: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 4 }}
            >
                <StarIcon color={U.accentBright} />
                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 13, color: U.accentBright }}>{balance}</Text>
                {showRefill && (
                    <Text style={{ fontFamily: "Inter-Medium", fontSize: 11, color: U.inkMuted }}>
                        {t("studio.refill_in", { hours: hoursToRefill })}
                    </Text>
                )}
            </Pressable>
        </View>
    );
}
