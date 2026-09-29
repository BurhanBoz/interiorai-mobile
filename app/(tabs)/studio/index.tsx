import { useCallback, useState } from "react";
import {
    View,
    Text,
    Pressable,
    Image,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    LayoutAnimation,
    AccessibilityInfo,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import { theme } from "@/config/theme";
import { useStudioStore } from "@/stores/studioStore";
import { useCreditStore } from "@/stores/creditStore";
import { useEffectivePlanCode, useEffectiveFeatures } from "@/hooks/useEntitlement";
import { STUDIO_FEATURES } from "@/components/studio/featureCatalog";
import { SAMPLE_ROOMS, type SampleRoom } from "@/components/studio/sampleRooms";
import { useImagePicker } from "@/hooks/useImagePicker";
import { HexMark } from "@/components/brand/HexMark";
import { TAB_BAR_HEIGHT, BOTTOM_SAFE_GAP } from "@/components/layout/GlassNavBar";
import { PhotoSourceSheet } from "@/components/studio/PhotoSourceSheet";
import { FREE_DAILY_CEILING } from "@/config/freeTier";

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;
const GUTTER = theme.v2Layout.gutterWide;

type ToolKey = "REDESIGN" | "EMPTY_ROOM" | "INPAINT" | "STYLE_TRANSFER" | "OUTDOOR";

/** Tile and chip order — one list, so the two steps can never disagree. */
const TOOLS: { key: ToolKey; labelKey: string }[] = [
    { key: "REDESIGN", labelKey: "studio.mode_redesign" },
    { key: "EMPTY_ROOM", labelKey: "studio.mode_empty_room" },
    { key: "INPAINT", labelKey: "studio.mode_inpaint" },
    { key: "STYLE_TRANSFER", labelKey: "studio.mode_style_transfer" },
    { key: "OUTDOOR", labelKey: "studio.mode_outdoor" },
];

/** The server knows Outdoor by its feature code, the client by its mode. */
const featureCodeFor = (key: ToolKey) => (key === "OUTDOOR" ? "OUTDOOR_DESIGN" : key);

/**
 * Studio — the home screen. Photo first, then the tool (2.1.0, 2026-09-29).
 *
 * <p><b>Why the order changed.</b> Since 19 Sep the photo and the tool were two
 * equal halves: whichever the user tapped second navigated. The tool grid was
 * the biggest thing on the screen, so that is where people started — and the
 * 24-hour activity report of 29 Sep shows how the day then ended for most new
 * users: app opened, paywall closed, nothing uploaded, gone. A tool without a
 * room is an abstract choice; a room on the screen makes every tool concrete.
 *
 * <p>So the screen now has two steps and shows one at a time:
 * <ol>
 *   <li><b>Step 1 — the room.</b> The intake is the hero. Samples sit right
 *       under it for people without a photo to hand. The tools are still
 *       visible (the 19 Sep redesign's rule: the home must answer "what does
 *       this app do?"), but as a small "then choose" row. Tapping one keeps
 *       the choice and opens the photo sheet — the tool never runs without a
 *       room, and the user's intent is not lost.</li>
 *   <li><b>Step 2 — the tool.</b> The room the user just gave sits on top, the
 *       five tools below as photographs, locks from the server as before.
 *       A tap goes straight to the tool's screen.</li>
 * </ol>
 *
 * <p>🔴 Still true from the 19 Sep redesign:
 * <ul>
 *   <li>The screen never opens on a photo from an earlier visit (founder
 *       call): step 2 shows only what was chosen on THIS screen. When a run
 *       finishes, studioStore.reset() clears the photo and the screen is back
 *       at step 1 on the next focus.</li>
 *   <li>Locks come from the server's plan_features, never from the client
 *       catalogue.</li>
 *   <li>The height budget is a contract: both steps fit 393 × 852 with no
 *       vertical scroll. Flex takes the slack, so larger phones grow the
 *       photographs, not the gaps.</li>
 * </ul>
 */
export default function StudioScreen() {
    const { t } = useTranslation();
    const setMode = useStudioStore((s) => s.setMode);
    const setPhoto = useStudioStore((s) => s.setPhoto);
    const planCode = useEffectivePlanCode();
    const features = useEffectiveFeatures();

    const balance = useCreditStore((s) => s.balance);
    const fetchBalance = useCreditStore((s) => s.fetchBalance);

    const { pickImage, useSampleImage, isUploading } = useImagePicker();

    const [sourceSheet, setSourceSheet] = useState(false);
    /** The room chosen on THIS screen; null = step 1. */
    const [chosen, setChosen] = useState<{ uri: string; sample: SampleRoom | null } | null>(null);
    /** The local file shown while it uploads, so the screen is never blank. */
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    /** A tool tapped before there was a room — honoured once the room arrives. */
    const [pendingTool, setPendingTool] = useState<ToolKey | null>(null);

    useFocusEffect(
        useCallback(() => {
            fetchBalance().catch(() => {});
            // A finished run resets the store; the home follows it back to
            // step 1. Leaving a tool WITHOUT generating keeps the photo, so the
            // user lands on step 2 and can pick another tool for the same room.
            if (!useStudioStore.getState().photo?.fileId) {
                setChosen(null);
                setPendingTool(null);
            }
        }, [fetchBalance]),
    );

    // Server truth. Returns false until plan_features has loaded — an unlocked
    // flash is recoverable, a wrongly locked tile is not.
    const isLocked = (key: ToolKey) =>
        features.length > 0 &&
        !(features.find((f) => f.featureCode === featureCodeFor(key))?.enabled ?? true);

    /**
     * Where a tool goes. Magic Edit needs a painted mask and Style Transfer a
     * reference photo — inputs the composer does not collect — so they keep
     * their own screens. All three read the photo from the studio store.
     */
    const openTool = (key: ToolKey) => {
        setMode(key as never);
        if (key === "INPAINT") return router.push("/studio/smart-edit" as never);
        if (key === "STYLE_TRANSFER") return router.push("/studio/style-transfer" as never);
        router.push("/studio/composer" as never);
    };

    const addPhoto = async (
        source: { kind: "camera" } | { kind: "gallery" } | { kind: "sample"; room: SampleRoom },
    ) => {
        Haptics.selectionAsync();
        const opts = { onPreview: setPreviewUri };
        const picked =
            source.kind === "sample"
                ? await useSampleImage(source.room.module, opts)
                : await pickImage(source.kind, opts);
        setPreviewUri(null);
        if (!picked) return;
        // The picker RETURNS the photo; it does not store it.
        setPhoto(picked);
        await animateNextLayout();
        setChosen({ uri: picked.uri, sample: source.kind === "sample" ? source.room : null });
        if (pendingTool) {
            const key = pendingTool;
            setPendingTool(null);
            openTool(key);
        }
    };

    const onTool = (key: ToolKey) => {
        Haptics.selectionAsync();
        if (isLocked(key)) {
            router.push("/paywall?source=FEATURE_TILE" as never);
            return;
        }
        if (chosen) {
            openTool(key);
            return;
        }
        // Step 1: the room comes first. Keep the choice (tapping it again
        // clears it — a choice you cannot undo is a trap) and ask for the room.
        if (pendingTool === key) {
            setPendingTool(null);
            return;
        }
        setPendingTool(key);
        setSourceSheet(true);
    };

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
            {/* The tab bar is absolutely positioned and takes no space, so the
                column pads itself clear of the dock. */}
            <View
                style={{
                    flex: 1,
                    paddingHorizontal: GUTTER,
                    paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_GAP,
                }}
            >
                <Header balance={balance} planCode={planCode} />

                {chosen ? (
                    <View style={{ flex: 1 }}>
                        <ChosenRoom
                            uri={previewUri ?? chosen.uri}
                            busy={isUploading}
                            onChange={() => setSourceSheet(true)}
                        />
                        <StepHeading step={2} title={t("studio.pick_tool_title")} style={{ marginTop: 18 }} />
                        <ToolGrid
                            isLocked={isLocked}
                            onPress={onTool}
                            recommended={chosen.sample?.modes ?? null}
                            style={{ marginTop: 14 }}
                        />
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        <StepHeading
                            step={1}
                            title={t("studio.photo_source_title")}
                            body={t("studio.photo_source_body")}
                        />
                        <PhotoHero
                            busy={isUploading}
                            previewUri={previewUri}
                            onPress={() => setSourceSheet(true)}
                            style={{ marginTop: 16 }}
                        />
                        <SampleRow
                            busy={isUploading}
                            onPick={(room) => addPhoto({ kind: "sample", room })}
                            style={{ marginTop: 18 }}
                        />
                        <ToolChips
                            isLocked={isLocked}
                            pending={pendingTool}
                            onPress={onTool}
                            style={{ marginTop: 18 }}
                        />
                    </View>
                )}
            </View>

            {sourceSheet && (
                <PhotoSourceSheet
                    onClose={() => setSourceSheet(false)}
                    onCamera={() => addPhoto({ kind: "camera" })}
                    onGallery={() => addPhoto({ kind: "gallery" })}
                />
            )}
        </SafeAreaView>
    );
}

/** One quiet transition between the steps; nothing moves under Reduce Motion. */
async function animateNextLayout() {
    const reduce = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

/* ── header ─────────────────────────────────────────────────────────── */

/**
 * The credit pill is the ONLY place credits appear on this screen. The v1
 * design repeated the balance on three surfaces; repeating a number the user
 * has no feel for is worse than stating it once.
 */
function Header({ balance, planCode }: { balance: number; planCode: string | null }) {
    const { t } = useTranslation();
    // The drip grant is stamped against the UTC calendar day
    // (CreditServiceImpl.maybeGrantDailyDrip), so the next one lands at the
    // next UTC midnight — not at a local hour. Showing a local time here
    // would be a friendly lie.
    const hoursToRefill = (() => {
        const now = new Date();
        const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
        return Math.max(1, Math.ceil((next - now.getTime()) / 3_600_000));
    })();
    // At or above the ceiling the drip does not fire, so promising one would
    // be wrong. FREE only — a subscriber's credits do not trickle.
    const showRefill = planCode === "FREE" && balance < FREE_DAILY_CEILING;

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 10,
                paddingBottom: 22,
            }}
        >
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
                hitSlop={12}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: U.lineAccent,
                    borderWidth: 1,
                    borderColor: U.lineAccent,
                    borderRadius: R.pill,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                }}
            >
                <Text style={{ fontFamily: "Inter-Bold", fontSize: 13, color: U.accentBright }}>{balance}</Text>
                {showRefill && (
                    <Text style={{ fontFamily: "Inter-Medium", fontSize: 11, color: U.inkMuted }}>
                        {t("studio.refill_in", { hours: hoursToRefill })}
                    </Text>
                )}
            </Pressable>
        </View>
    );
}

/* ── step heading ───────────────────────────────────────────────────── */

/**
 * "STEP 1 / 2" is the whole explanation of the flow. It says there is a
 * second step without describing it, so step 1 stays about the room.
 */
function StepHeading({
    step,
    title,
    body,
    style,
}: {
    step: 1 | 2;
    title: string;
    body?: string;
    style?: StyleProp<ViewStyle>;
}) {
    const { t } = useTranslation();
    return (
        <View style={style} accessible accessibilityRole="header">
            <Text style={{ ...V.kicker, color: U.accent }}>{t("studio.step_of", { current: step, total: 2 })}</Text>
            <Text style={{ ...V.displayS, color: U.ink, marginTop: 6 }} numberOfLines={2}>
                {title}
            </Text>
            {body ? (
                <Text style={{ ...V.rowQuiet, color: U.inkMuted, marginTop: 6 }} numberOfLines={2}>
                    {body}
                </Text>
            ) : null}
        </View>
    );
}

/* ── step 1 ─────────────────────────────────────────────────────────── */

/** A room photo's own shape — the card reads as "a photo goes here". */
const HERO_RATIO = 4 / 3;
/** Share of the column's width the card may take; the rest is air on both sides. */
const HERO_WIDTH_SHARE = 0.86;
/** Minimum air above and below the card, each. */
const HERO_AIR = 12;

/**
 * The first action — the one clear thing to do, but not the whole screen.
 *
 * <p>2026-09-29 founder call: the edge-to-edge card that filled all the free
 * height read as a wall, not a button. It is now a 4:3 card (the shape of the
 * photo it asks for) at most 86% of the column wide, centred in the space
 * between the heading and the samples, with air on all four sides. Its size is
 * computed from that space rather than fixed, so a two-line German heading
 * shrinks the card instead of pushing the samples under the tab bar.
 *
 * <p>Camera-or-library is asked on the sheet (one way in, not two tiles for
 * one decision). While the chosen photo uploads it fills this card under a
 * scrim, so the user sees their room the moment they pick it.
 */
function PhotoHero({
    busy,
    previewUri,
    onPress,
    style,
}: {
    busy: boolean;
    previewUri: string | null;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
}) {
    const { t } = useTranslation();
    const [space, setSpace] = useState<{ w: number; h: number } | null>(null);
    const size = space ? heroSize(space.w, space.h) : null;
    return (
        <View
            style={[{ flex: 1, minHeight: 150, alignItems: "center", justifyContent: "center" }, style]}
            onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setSpace((s) => (s && s.w === width && s.h === height ? s : { w: width, h: height }));
            }}
        >
            {size && (
                <Pressable
                    onPress={onPress}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={t("studio.add_a_photo")}
                    accessibilityState={{ busy }}
                    style={{
                        width: size.w,
                        height: size.h,
                        borderRadius: R.card,
                        overflow: "hidden",
                        backgroundColor: previewUri ? U.surface : U.buttonFill,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {previewUri ? (
                        <>
                            <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                            <View
                                style={[
                                    StyleSheet.absoluteFill,
                                    { backgroundColor: U.overlayScrim, alignItems: "center", justifyContent: "center", gap: 10 },
                                ]}
                            >
                                <ActivityIndicator color={U.accentBright} />
                                <Text style={{ ...V.row, color: U.ink }}>{t("studio.uploading")}</Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <PlusGlyph color={U.buttonInk} />
                            <Text style={{ fontFamily: "Inter-Bold", fontSize: 17, color: U.buttonInk, marginTop: 12 }}>
                                {t("studio.add_a_photo")}
                            </Text>
                            <Text style={{ ...V.rowQuiet, color: U.buttonInk, opacity: 0.72, marginTop: 4 }}>
                                {t("studio.camera")} · {t("studio.gallery")}
                            </Text>
                        </>
                    )}
                </Pressable>
            )}
        </View>
    );
}

/** The largest 4:3 card that fits the space with the width share and the air kept. */
function heroSize(spaceW: number, spaceH: number): { w: number; h: number } {
    const maxW = spaceW * HERO_WIDTH_SHARE;
    const maxH = Math.max(0, spaceH - 2 * HERO_AIR);
    let w = maxW;
    let h = w / HERO_RATIO;
    if (h > maxH) {
        h = maxH;
        w = h * HERO_RATIO;
    }
    return { w: Math.round(w), h: Math.round(h) };
}

/**
 * All four sample rooms, labelled. They go through the same upload as a real
 * photo (consent included), so what comes back is a real render.
 */
function SampleRow({
    busy,
    onPick,
    style,
}: {
    busy: boolean;
    onPick: (room: SampleRoom) => void;
    style?: StyleProp<ViewStyle>;
}) {
    const { t } = useTranslation();
    return (
        <View style={style}>
            <Text style={{ ...V.kicker, color: U.inkMuted }}>{t("studio.try_a_sample")}</Text>
            <View style={{ flexDirection: "row", gap: 8, height: 74, marginTop: 10 }}>
                {SAMPLE_ROOMS.map((room) => (
                    <Pressable
                        key={room.key}
                        onPress={() => onPick(room)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`${t("studio.try_a_sample")}: ${t(room.labelKey)}`}
                        style={{ flex: 1, borderRadius: R.thumb, overflow: "hidden", opacity: busy ? 0.6 : 1 }}
                    >
                        <Image source={room.module} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        <View
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                paddingHorizontal: 6,
                                paddingTop: 10,
                                paddingBottom: 5,
                                backgroundColor: U.photoChrome,
                            }}
                        >
                            <Text style={{ ...V.captionStrong, color: "#fff" }} numberOfLines={1}>
                                {t(room.labelKey)}
                            </Text>
                        </View>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

/**
 * What comes next, visible but secondary. A chip is a real control: it keeps
 * the tool and asks for the room, so tapping a tool first still works — it
 * just cannot skip the room.
 */
function ToolChips({
    isLocked,
    pending,
    onPress,
    style,
}: {
    isLocked: (key: ToolKey) => boolean;
    pending: ToolKey | null;
    onPress: (key: ToolKey) => void;
    style?: StyleProp<ViewStyle>;
}) {
    const { t } = useTranslation();
    const byKey = Object.fromEntries(STUDIO_FEATURES.map((f) => [f.key, f]));
    return (
        <View style={style}>
            <Text style={{ ...V.kicker, color: U.inkMuted }}>{t("studio.then_pick_tool")}</Text>
            {/* Horizontal only — five labels do not fit one row in German. The
                row runs to the screen edge (the gutter moves inside it), so a
                chip cut by the edge reads as "there is more" rather than as a
                clipped layout. */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingHorizontal: GUTTER }}
                style={{ marginTop: 10, flexGrow: 0, marginHorizontal: -GUTTER }}
            >
                {TOOLS.map((tool) => {
                    const selected = pending === tool.key;
                    const locked = isLocked(tool.key);
                    const image = imageFor(byKey[tool.key]);
                    const label = t(tool.labelKey);
                    return (
                        <Pressable
                            key={tool.key}
                            onPress={() => onPress(tool.key)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            accessibilityLabel={locked ? `${label}, PRO` : label}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                height: 40,
                                paddingLeft: 5,
                                paddingRight: 12,
                                borderRadius: R.pill,
                                backgroundColor: U.surface,
                                borderWidth: selected ? 1.5 : 1,
                                borderColor: selected ? U.accent : U.lineNeutral,
                            }}
                        >
                            {image ? (
                                <Image source={image} style={{ width: 30, height: 30, borderRadius: 15 }} resizeMode="cover" />
                            ) : null}
                            <Text style={{ ...V.row, color: selected ? U.accentBright : U.ink }}>{label}</Text>
                            {locked && (
                                <Text style={{ ...V.captionStrong, letterSpacing: 1, color: U.accentBright }}>PRO</Text>
                            )}
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

/** A rounded square holding a plus — the shape the intake is built around. */
function PlusGlyph({ color }: { color: string }) {
    return (
        <View
            style={{
                width: 44,
                height: 40,
                borderWidth: 2,
                borderColor: color,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <View style={{ position: "absolute", width: 18, height: 2, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ position: "absolute", width: 2, height: 18, backgroundColor: color, borderRadius: 1 }} />
        </View>
    );
}

/* ── step 2 ─────────────────────────────────────────────────────────── */

/**
 * The room the user just gave, on top of the tools that will change it.
 * "Change photo" goes back through the same sheet; while a replacement
 * uploads, the new photo is already here under a scrim.
 */
function ChosenRoom({ uri, busy, onChange }: { uri: string; busy: boolean; onChange: () => void }) {
    const { t } = useTranslation();
    return (
        <View style={{ height: 188, borderRadius: R.card, overflow: "hidden", backgroundColor: U.surface }}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            {busy ? (
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: U.overlayScrim, alignItems: "center", justifyContent: "center", gap: 10 },
                    ]}
                >
                    <ActivityIndicator color={U.accentBright} />
                    <Text style={{ ...V.row, color: U.ink }}>{t("studio.uploading")}</Text>
                </View>
            ) : (
                <>
                    <View
                        style={{
                            position: "absolute",
                            top: 10,
                            left: 10,
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            backgroundColor: U.accent,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                    >
                        <Text style={{ color: U.buttonInk, fontSize: 13, fontWeight: "700" }}>✓</Text>
                    </View>
                    <Pressable
                        onPress={onChange}
                        accessibilityRole="button"
                        accessibilityLabel={t("studio.change_photo")}
                        hitSlop={8}
                        style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            paddingVertical: 7,
                            paddingHorizontal: 12,
                            borderRadius: R.pill,
                            backgroundColor: U.photoChrome,
                            borderWidth: 1,
                            borderColor: U.photoChromeBorder,
                        }}
                    >
                        <Text style={{ ...V.captionStrong, fontSize: 12, color: "#fff" }}>{t("studio.change_photo")}</Text>
                    </Pressable>
                </>
            )}
        </View>
    );
}

/**
 * The five tools as photographs — the photographs ARE the description.
 * Three across, then the paid pair wide. When the room came from a sample,
 * the tools that sample was chosen for stay bright and the rest step back
 * (a garden cannot be emptied); nothing is disabled, the user can still
 * choose anything.
 */
function ToolGrid({
    isLocked,
    onPress,
    recommended,
    style,
}: {
    isLocked: (key: ToolKey) => boolean;
    onPress: (key: ToolKey) => void;
    recommended: readonly string[] | null;
    style?: StyleProp<ViewStyle>;
}) {
    const { t } = useTranslation();
    const byKey = Object.fromEntries(STUDIO_FEATURES.map((f) => [f.key, f]));

    const tile = (tool: (typeof TOOLS)[number], width: `${number}%`) => {
        const locked = isLocked(tool.key);
        const dim = recommended != null && !recommended.includes(tool.key);
        const image = imageFor(byKey[tool.key]);
        const label = t(tool.labelKey);
        return (
            <Pressable
                key={tool.key}
                onPress={() => onPress(tool.key)}
                accessibilityRole="button"
                accessibilityLabel={locked ? `${label}, PRO` : label}
                style={{
                    width,
                    opacity: dim ? 0.45 : 1,
                    backgroundColor: U.surface,
                    borderWidth: 1,
                    borderColor: U.lineNeutral,
                    borderRadius: R.tile,
                    overflow: "hidden",
                }}
            >
                <View style={{ flex: 1, minHeight: 64 }}>
                    {image ? <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
                    {locked && (
                        <View
                            style={{
                                position: "absolute",
                                top: 6,
                                right: 6,
                                backgroundColor: U.ground,
                                borderWidth: 1,
                                borderColor: U.accent,
                                borderRadius: 5,
                                paddingVertical: 3,
                                paddingHorizontal: 6,
                            }}
                        >
                            <Text style={{ ...V.captionStrong, letterSpacing: 1, color: U.accentBright }}>PRO</Text>
                        </View>
                    )}
                </View>
                {/* The label never sets the tile's height — German and Dutch
                    labels wrap to two lines; a single long word ("Réaménagement")
                    shrinks instead of splitting mid-word. */}
                <View style={{ paddingHorizontal: 9, paddingTop: 8, paddingBottom: 10, minHeight: 44 }}>
                    <Text
                        numberOfLines={label.includes(" ") ? 2 : 1}
                        adjustsFontSizeToFit={!label.includes(" ")}
                        minimumFontScale={0.7}
                        style={{ ...V.tile, color: U.ink }}
                    >
                        {label}
                    </Text>
                </View>
            </Pressable>
        );
    };

    return (
        <View style={[{ flex: 1, gap: 8, maxHeight: 420 }, style]}>
            <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>{TOOLS.slice(0, 3).map((x) => tile(x, "31.5%"))}</View>
            <View style={{ flex: 1.15, flexDirection: "row", gap: 8 }}>{TOOLS.slice(3).map((x) => tile(x, "48.7%"))}</View>
        </View>
    );
}

/** The feature registry stores media in several shapes; tiles and chips want one still. */
function imageFor(feature?: (typeof STUDIO_FEATURES)[number]) {
    if (!feature) return null;
    const m = feature.media;
    if (m.kind === "single") return m.image;
    return m.after;
}
