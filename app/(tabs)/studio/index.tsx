import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, InteractionManager, ActivityIndicator, type ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import { theme } from "@/config/theme";
import { Ionicons } from "@expo/vector-icons";
import { useCatalogStore } from "@/stores/catalogStore";
import { useCreditStore } from "@/stores/creditStore";
import { useAuthStore } from "@/stores/authStore";
import { useStudioStore } from "@/stores/studioStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { resultCountKey } from "@/hooks/useFirstResultPaywall";
import { readCounter } from "@/utils/oneShotFlag";
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
 *
 * <p><b>3.0.0 — the first session (owner, 20 Oct 2026).</b> Until the user has one finished
 * design, the screen is a single decision: "Add your room" with the camera and the library as two
 * doors on top, and the tools under it as SELECTABLE tiles — the open season first and wide,
 * pre-selected — so the photo goes straight to the chosen tool's composer. No sample row here (the
 * samples stay on add-room for returning users). After the first result the v4 menu returns:
 * a tile opens add-room with its own before/after and the samples.
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

    /*
     * First session (3.0.0): no finished design yet → the doors layout. The count is the one
     * useFirstResultPaywall keeps; null while it is being read, so neither layout flashes.
     */
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const [firstSession, setFirstSession] = useState<boolean | null>(null);
    useFocusEffect(useCallback(() => {
        let alive = true;
        if (!userId) { setFirstSession(false); return; }
        // Through oneShotFlag, never SecureStore directly: the key carries a colon, which the
        // keychain rejects — read raw it threw, and the doors never showed (simulator, 20 Oct).
        readCounter(resultCountKey(userId))
            .then((n) => { if (alive) setFirstSession(!(n > 0)); })
            .catch(() => { if (alive) setFirstSession(false); });
        return () => { alive = false; };
    }, [userId]));

    /** The tile ringed in gold: the tool the doors hand the photo to. The season leads. */
    const [chosen, setChosen] = useState<{ feature: StudioFeature; season: SeasonResponse | null } | null>(null);
    const effectiveChosen = chosen ?? (hero && !seasonLocked ? { feature: seasonal, season: hero } : { feature: STUDIO_FEATURES.find((f) => f.key === "REDESIGN")!, season: null });
    const choose = (feature: StudioFeature, season: SeasonResponse | null) => {
        Haptics.selectionAsync();
        if (isLocked(feature.key)) {
            track("locked_preview_shown", { mode: feature.key, season: season?.code ?? null });
            setLockedPreview({ mode: feature.key, season });
            return;
        }
        track("tool_tile_select", { mode: feature.key, tool: feature.tool ?? null, season: season?.code ?? null });
        setChosen({ feature, season });
    };

    const { pickImage, isUploading } = useImagePicker();
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    /** A door: the photo goes to the chosen tool. Pushed, not replaced — this is the tab's root. */
    const addPhoto = async (kind: "camera" | "gallery") => {
        Haptics.selectionAsync();
        const { feature, season } = effectiveChosen;
        track("add_room_source", { mode: feature.key, source: kind, season: season?.code ?? null, from: "studio" });
        const picked = await pickImage(kind, { onPreview: setPreviewUri }).catch(() => null);
        setPreviewUri(null);
        if (!picked) return;
        const st = useStudioStore.getState();
        st.setPhoto(picked);
        st.setMode(feature.key);
        st.setSeasonCode(season?.code ?? null);
        if (feature.key === "INPAINT") {
            router.push((feature.tool ? `/studio/smart-edit?tool=${feature.tool}` : "/studio/smart-edit") as never);
        } else if (feature.key === "STYLE_TRANSFER") {
            router.push("/studio/style-transfer" as never);
        } else {
            router.push("/studio/composer" as never);
        }
    };
    const isChosen = (feature: StudioFeature, season: SeasonResponse | null) =>
        effectiveChosen.feature.id === feature.id && (effectiveChosen.season?.code ?? null) === (season?.code ?? null);

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_GAP + 8, gap: 14 }}
            >
                <Header balance={balance} planCode={planCode} />

                {firstSession === true && (
                    <>
                        <Text style={{ ...V.displayS, color: U.ink, marginTop: 10 }}>{t("studio.add_your_room")}</Text>
                        <View style={{ flexDirection: "row", gap: 12, marginTop: -2 }}>
                            {([
                                { kind: "camera" as const, label: t("studio.take_photo"), icon: "camera-outline" as const, primary: true },
                                { kind: "gallery" as const, label: t("studio.choose_from_library"), icon: "images-outline" as const, primary: false },
                            ]).map((d) => (
                                <Pressable
                                    key={d.kind}
                                    onPress={() => addPhoto(d.kind)}
                                    disabled={isUploading}
                                    accessibilityRole="button"
                                    accessibilityLabel={d.label}
                                    style={{
                                        flex: 1, height: 104, borderRadius: R.card,
                                        backgroundColor: d.primary ? U.lineAccent : U.surface,
                                        borderWidth: 1, borderColor: d.primary ? "rgba(221,180,119,0.35)" : U.lineNeutral,
                                        alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 12, overflow: "hidden",
                                    }}
                                >
                                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: d.primary ? "rgba(239,208,160,0.18)" : "rgba(246,241,231,0.06)", alignItems: "center", justifyContent: "center" }}>
                                        <Ionicons name={d.icon} size={22} color={d.primary ? U.accentBright : U.ink} />
                                    </View>
                                    <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 14, lineHeight: 18, color: d.primary ? U.accentBright : U.ink, textAlign: "center" }} numberOfLines={2}>
                                        {d.label}
                                    </Text>
                                    {isUploading && (
                                        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: U.overlayScrim, alignItems: "center", justifyContent: "center" }}>
                                            {previewUri ? <ExpoImage source={{ uri: previewUri }} style={{ ...StyleSheet.absoluteFillObject, opacity: 0.5 }} contentFit="cover" /> : null}
                                            <ActivityIndicator color={U.accentBright} />
                                        </View>
                                    )}
                                </Pressable>
                            ))}
                        </View>
                        <Text style={{ ...V.kicker, color: U.inkMuted, marginTop: 8 }}>{t("studio.what_you_can_make")}</Text>
                    </>
                )}

                {firstSession === false && (
                    <Text style={{ ...V.kicker, color: U.inkMuted, marginTop: 4 }}>{t("studio.pick_what_to_make")}</Text>
                )}

                {firstSession !== null && hero && (
                    <SeasonHero
                        season={hero}
                        locale={i18n.language}
                        locked={seasonLocked}
                        newTag={isNew(hero) ? t("studio.seasonal_new") : undefined}
                        reduceMotion={reduceMotion}
                        selected={firstSession ? isChosen(seasonal, hero) : false}
                        onPress={() => (firstSession ? choose(seasonal, hero) : open(seasonal, hero))}
                    />
                )}

                {firstSession !== null && (
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
                                    selected={firstSession ? isChosen(seasonal, s) : false}
                                    onPress={() => (firstSession ? choose(seasonal, s) : open(seasonal, s))}
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
                                    selected={firstSession ? isChosen(f, null) : false}
                                    onPress={() => (firstSession ? choose(f, null) : open(f, null))}
                                />
                            );
                        })}
                    </View>
                )}
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
    season, locale, locked, newTag, reduceMotion, selected, onPress,
}: {
    season: SeasonResponse; locale: string; locked: boolean; newTag?: string; reduceMotion: boolean; selected?: boolean; onPress: () => void;
}) {
    const m = seasonMedia(season);
    const title = seasonTitle(season, locale);
    if (!m) return null;
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={locked ? `${title}, PRO` : title}
            accessibilityState={selected ? { selected: true } : undefined}
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
            {selected ? <Check /> : null}
            <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, borderRadius: R.card, borderWidth: selected ? 2.5 : 1.5, borderColor: U.accentBright }} />
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
    label, before, after, reference, locked, newTag, selected, onPress,
}: {
    label: string;
    before: ImageSourcePropType | { uri: string };
    after: ImageSourcePropType | { uri: string };
    reference?: ImageSourcePropType;
    locked: boolean;
    newTag?: string;
    /** 3.0.0 first session: the tile the doors will use — a gold ring and a check. */
    selected?: boolean;
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
            accessibilityState={selected ? { selected: true } : undefined}
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
                style={{ ...V.tile, fontSize: 13, lineHeight: 16, position: "absolute", left: 10, right: selected ? 40 : 10, bottom: 9, color: "#fff" }}
                numberOfLines={2}
            >
                {label}
            </Text>
            {locked ? <Tag text="PRO" dark /> : null}
            {!locked && newTag ? <Tag text={`✦ ${newTag}`} /> : null}
            {selected ? <Check /> : null}
            <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, borderRadius: R.tile, borderWidth: selected ? 2.5 : pressed ? 1.5 : 1, borderColor: selected || pressed ? U.accentBright : U.lineNeutral }} />
        </Pressable>
    );
}

/** The gold check on the selected tile (bottom-right, clear of the PRO/NEW tag). */
function Check() {
    return (
        <View pointerEvents="none" style={{ position: "absolute", right: 10, bottom: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: U.accentBright, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="checkmark" size={15} color={U.buttonInk} />
        </View>
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
