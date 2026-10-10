import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, ActivityIndicator as Spinner } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import { theme } from "@/config/theme";
import { useStudioStore } from "@/stores/studioStore";
import { useCatalogStore } from "@/stores/catalogStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useGenerate } from "@/hooks/useGenerate";
import { useCreditCost } from "@/hooks/useCreditCost";
import { furnitureService } from "@/services/furniture";
import type { FurnitureItem } from "@/types/api";
import { AdvancedSheet } from "@/components/studio/AdvancedSheet";
import { RoomStrip, StyleStrip } from "@/components/studio/ChoiceStrips";
import { useReadyFade } from "@/components/studio/selectionMotion";
import { track } from "@/services/analytics";
import { catalogName } from "@/utils/catalogI18n";
import { MaskOverlay } from "@/components/ui/MaskOverlay";
import { ResumeNote } from "@/components/ui/ResumeNote";
import { useResumeNote } from "@/hooks/useResumeNote";
import { CoachMarks } from "@/components/tour/CoachMarks";
import { tourTarget } from "@/components/tour/tourTargets";
import { useFirstRunTour } from "@/hooks/useFirstRunTour";

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;
const GUTTER = theme.v2Layout.gutterWide;

/** The photo's height on a 390×844 screen; smaller phones shrink it, never the controls. */
const PHOTO_HEIGHT = 290;
/** Below this the room stops being recognisable; the layout is allowed to overflow instead. */
const PHOTO_MIN = 120;
/** Every compact row on this screen (Advanced, furniture, mask/reference). */
const ROW_HEIGHT = 56;

/**
 * Composer — one screen where there used to be seven.
 *
 * <p><b>What it replaces.</b> "Analyze Your Space" (upload), a separate photo
 * confirmation, "Room Type & Style", "Design Specifications", a full-screen
 * consent wall that appeared the instant a photo was picked, and a red
 * "choose a room type to continue" error that fired even when the photo the
 * user had just tapped was labelled "Living room".
 *
 * <p>The principle until v3 was <b>ask for nothing that can be assumed</b>:
 * style defaulted to Modern, the room type arrived as Living room on a pill the
 * user could correct, and a first-time user could press GENERATE without
 * touching anything.
 *
 * <p><b>Reversed 2026-10-10 (owner's call, redesign v3).</b> The assumed
 * Living room / Modern was not understood: people did not read the pill as a
 * question, so kitchens and bedrooms went out as living rooms and the result
 * looked wrong for a reason the user never saw. The rule is now <b>ask for
 * exactly the two things only the user knows — which room, which style — and
 * nothing else.</b> Both are explicit taps on two strips of the same shape;
 * nothing is preselected on arrival, and CREATE stays muted until both are
 * chosen. Everything else (palette, intensity, layout) keeps its default
 * behind Advanced.
 *
 * <p>🔴 Generation itself goes through {@link useGenerate} unchanged. That is
 * the money path — it reserves credits, mints and reuses an idempotency key,
 * and maps status codes. It was moved verbatim once before for exactly this
 * reason; rewriting it to fit a new layout is how double-charges ship.
 *
 * <p>🔴 No vertical scroll. The action bar is a real footer that reserves its
 * own height, not an overlay — an overlay is what let the old style grid slide
 * underneath the button. On a phone shorter than the 844pt design it is the
 * PHOTO that gives up height (down to {@link PHOTO_MIN}), never a control.
 */
export default function ComposerScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ sheet?: string }>();

    const mode = useStudioStore((s) => s.mode);
    const photo = useStudioStore((s) => s.photo);
    const roomType = useStudioStore((s) => s.roomType);
    const designStyle = useStudioStore((s) => s.designStyle);
    const objectRefs = useStudioStore((s) => s.objectRefs);
    const referencePhoto = useStudioStore((s) => s.referencePhoto);
    const maskStrokes = useStudioStore((s) => s.maskStrokes);
    const maskMode = useStudioStore((s) => s.maskMode);
    const removeObjectRef = useStudioStore((s) => s.removeObjectRef);
    const setRoomType = useStudioStore((s) => s.setRoomType);
    const setDesignStyle = useStudioStore((s) => s.setDesignStyle);
    const setPhoto = useStudioStore((s) => s.replacePhoto);

    const roomTypes = useCatalogStore((s) => s.roomTypes);
    const designStyles = useCatalogStore((s) => s.designStyles);
    const ensureCatalog = useCatalogStore((s) => s.ensureLoaded);

    const { pickImage, isUploading } = useImagePicker();
    const { generate, isSubmitting } = useGenerate();
    // Back from a purchase this screen's Generate button started (2.0.0).
    const [resumeShown, hideResume] = useResumeNote(["GENERATE"]);
    const { cost } = useCreditCost();

    const [sheet, setSheet] = useState<null | "advanced">(null);

    // Arriving from the Furniture tile opens the catalogue straight away.
    // It is a route presented modally rather than a component, so it opens by
    // navigation — see studio/_layout.tsx.
    useEffect(() => {
        if (params.sheet === "catalogue") {
            router.push("/studio/furniture" as never);
        }
        // Once only: re-running on every param read would re-open the sheet
        // each time the user came back from it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [products, setProducts] = useState<FurnitureItem[]>([]);

    useEffect(() => {
        ensureCatalog().catch(() => {});
    }, [ensureCatalog]);

    useEffect(() => {
        let cancelled = false;
        furnitureService
            .browse()
            .then((items) => {
                if (!cancelled) setProducts(items.filter((i) => !i.mine).slice(0, 4));
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    /*
     * 🔴 No room / style defaults any more (owner's call, 2026-10-10).
     *
     * Two effects used to live here: one set the room to LIVING_ROOM (or the
     * first catalogue row) whenever it was empty, the other did the same for
     * the style with MODERN. They were removed, not disabled — the assumed
     * Living room / Modern was not understood by users, and the selection is
     * now explicit (see the screen comment above).
     *
     * Whatever IS already in the store on arrival is deliberately NOT
     * cleared. The studio store is in memory only (no persistence) and is
     * reset only on sign-out — the Studio screen does not reset it after a
     * job. With the default effects gone, nothing writes roomType or
     * designStyle except an explicit choice: a tap on these strips, "same
     * room, another style" on the result screen, or an ad's deep link
     * (app/design.tsx, which carries the room and style the ad promised). A
     * value left from one of those in the same session is the user's own
     * choice and is kept, so a second run in the same room is not a re-ask.
     * A value the old default wrote cannot survive: it lived in the same
     * in-memory store, which a new build starts empty.
     */

    /**
     * One output per run (2026-09-19 founder call).
     *
     * <p>Pinned here rather than removed from the store, because the request
     * body and the pricing rules still carry a count — the server-side
     * cleanup is a separate pass. Pinning is the half that is safe to do
     * first: nothing in the UI can ask for two, so nothing can be charged
     * for two.
     */
    const setNumOutputs = useStudioStore((s) => s.setNumOutputs);
    useEffect(() => {
        setNumOutputs(1);
    }, [setNumOutputs]);

    const pickedProduct = objectRefs[0] ?? null;

    const onReplace = useCallback(async () => {
        Haptics.selectionAsync();
        // 🔴 The picker RETURNS the photo; it does not store it. From the
        // Umber composer (51f234a) until build 91 this pill uploaded the new
        // room and dropped it — the frame kept the old photo. setPhoto also
        // clears any mask drawn on the old one.
        const picked = await pickImage("gallery").catch(() => null);
        if (picked) setPhoto(picked);
    }, [pickImage, setPhoto]);

    /** Both required choices made (2026-10-10). */
    const choicesMade = Boolean(roomType?.id) && Boolean(designStyle?.id);
    const canGenerate = Boolean(photo?.fileId) && !isSubmitting && !isUploading && choicesMade;
    /**
     * Gold means "ready", and stays gold while the run is submitting — the
     * spinner sits on the gold button the user just pressed rather than the
     * button fading to muted under their finger.
     */
    const createLit = Boolean(photo?.fileId) && !isUploading && choicesMade;
    const litStyle = useReadyFade(createLit);

    /**
     * First-run tour, second half (2.2.0; anchors moved for v3, 2026-10-10):
     * the room strip, the style strip, Advanced — pointed at, never opened —
     * and Create. Waits until both catalogues are on screen, so the strips the
     * first two steps point at have tiles in them. It no longer waits for a
     * room type: nothing is preselected now, and pointing at the empty strip
     * is exactly what the first step is for.
     */
    const tour = useFirstRunTour(
        "composer",
        Boolean(photo?.uri) && roomTypes.length > 0 && designStyles.length > 0 && sheet === null && !isSubmitting,
    );

    const roomName = roomType ? catalogName(t, "room", roomType) : null;
    const styleName = designStyle ? catalogName(t, "style", designStyle) : null;

    return (
        <View style={{ flex: 1, backgroundColor: U.ground }}>
            <View style={{ flex: 1 }}>
                <PhotoFrame
                    uri={photo?.uri}
                    width={photo?.width ?? null}
                    height={photo?.height ?? null}
                    topInset={insets.top}
                    onBack={() => router.back()}
                    onReplace={onReplace}
                    busy={isUploading}
                    maskStrokes={mode === "INPAINT" ? maskStrokes : null}
                    maskMode={maskMode}
                />

                <View ref={tourTarget("composer.room")} collapsable={false}>
                    <SectionTitle>{t("studio.which_room")}</SectionTitle>
                    <RoomStrip
                        items={roomTypes}
                        selectedId={roomType?.id ?? null}
                        gutter={GUTTER}
                        onSelect={(r) => {
                            Haptics.selectionAsync();
                            setRoomType(r);
                        }}
                    />
                </View>

                <View ref={tourTarget("composer.style")} collapsable={false} style={{ marginTop: 18 }}>
                    <SectionTitle>{t("studio.pick_style")}</SectionTitle>
                    <StyleStrip
                        styles={designStyles}
                        selectedId={designStyle?.id ?? null}
                        gutter={GUTTER}
                        onSelect={(s) => {
                            Haptics.selectionAsync();
                            setDesignStyle(s);
                            // 🔴 Bu olay 1.6.0'da KÖRLEŞMİŞTİ. Sihirbazın stil
                            // ızgarası ekranından (studio/style.tsx) atılıyordu
                            // ve o ekran yeniden tasarımda silindi; tipi
                            // analytics.ts'te durdu ama çağıran kalmadı.
                            // Son ölçümünde 7 günde 65 olay / 26 kişiydi —
                            // hangi stilin seçildiği tek sinyal bu.
                            track("style_selected", { style: s.code ?? s.name });
                        }}
                    />
                </View>

                {/* Advanced first, the pieces it produced underneath —
                    a chosen sofa is the RESULT of opening the catalogue,
                    so it belongs below the controls, not above them.
                    "Photo & privacy" came off this screen: the consent
                    gate lives in useImagePicker and fires before any
                    photo leaves the device, so this button was a second
                    copy of a statement that had already been made. It is
                    still reachable from Settings. */}
                <View style={{ paddingHorizontal: GUTTER, marginTop: 16, gap: 10 }}>
                    <View ref={tourTarget("composer.advanced")} collapsable={false}>
                        <CompactRow
                            label={t("studio.advanced")}
                            detail={t("studio.advanced_hint")}
                            onPress={() => setSheet("advanced")}
                        />
                    </View>

                    {/* Furniture is a redesign concept. Magic Edit changes the
                        area the user painted and Style Transfer copies a
                        reference — dropping a catalogue sofa into either is
                        not a thing the backend does, so offering it would be
                        a control that cannot work.
                        v3: the four-plate card became one compact row so the
                        two required strips fit without a scroll; the
                        catalogue (a differentiator) keeps its own line. */}
                    {mode !== "INPAINT" && mode !== "STYLE_TRANSFER" && (
                        <FurnitureRow
                            picked={objectRefs}
                            suggestions={products}
                            onBrowse={() => router.push("/studio/furniture" as never)}
                            onRemove={removeObjectRef}
                        />
                    )}

                    {/* What the collection step produced, shown as a fact the
                        user can go back and change. */}
                    {mode === "INPAINT" && (
                        <CollectedRow
                            label={t("studio.mask_ready")}
                            action={t("studio.edit_mask")}
                            onPress={() => router.push("/studio/smart-edit" as never)}
                        />
                    )}
                    {mode === "STYLE_TRANSFER" && (
                        <CollectedRow
                            label={t("studio.reference_ready")}
                            action={t("studio.change_reference")}
                            thumbUri={referencePhoto?.uri}
                            onPress={() => router.push("/studio/style-transfer" as never)}
                        />
                    )}
                </View>

                {/* Whatever height is left over on a tall phone goes here,
                    above the footer — the photo stops at its design height. */}
                <View style={{ flexGrow: 1 }} />

                {/* Action bar — a real footer with its own height. The tour's
                    last step lights all of it: the cost line its copy points
                    to sits right above the button. */}
                <View
                    ref={tourTarget("composer.generate")}
                    collapsable={false}
                    style={{
                        backgroundColor: U.ground,
                        borderTopWidth: 1,
                        borderTopColor: U.lineNeutral,
                        paddingTop: 14,
                        paddingHorizontal: GUTTER,
                        paddingBottom: 26,
                    }}
                >
                    {resumeShown && (
                        <ResumeNote text={t("resume.generate", { cta: t("studio.generate") })} />
                    )}
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 12,
                        }}
                    >
                        {/* Room first, then style — the order they are asked
                            in. An unmade choice shows as a muted placeholder
                            so the line also says what is still missing. */}
                        <Text style={{ ...V.rowQuiet, flex: 1 }} numberOfLines={1}>
                            <Text style={{ color: roomName ? U.ink : U.inkMuted }}>
                                {roomName ?? t("studio.summary_room_placeholder")}
                            </Text>
                            <Text style={{ color: U.inkMuted }}>{"  ·  "}</Text>
                            <Text style={{ color: styleName ? U.ink : U.inkMuted }}>
                                {styleName ?? t("studio.summary_style_placeholder")}
                            </Text>
                            {pickedProduct ? (
                                <Text style={{ color: U.inkMuted }}>
                                    {"  ·  "}
                                    {t("studio.summary_pieces", { count: objectRefs.length })}
                                </Text>
                            ) : null}
                        </Text>
                        {/* The only statement of cost anywhere in the app. */}
                        <Text style={{ fontFamily: "Inter-Bold", fontSize: 12.5, color: U.accentBright }}>
                            {t("studio.credit_cost", { count: cost })}
                        </Text>
                    </View>

                    <CreateButton
                        label={t("studio.generate")}
                        disabled={!canGenerate}
                        submitting={isSubmitting}
                        litStyle={litStyle}
                        hint={
                            !roomType
                                ? t("studio.room_type_required")
                                : !designStyle
                                  ? t("studio.style_required")
                                  : undefined
                        }
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            hideResume();
                            generate();
                        }}
                    />
                </View>
            </View>

            {sheet === "advanced" && <AdvancedSheet onClose={() => setSheet(null)} />}

            <CoachMarks
                visible={tour.visible}
                onFinish={tour.finish}
                steps={[
                    { target: "composer.room", title: t("studio.which_room"), body: t("tour.room_strip_body"), padding: 4 },
                    { target: "composer.style", title: t("tour.style_title"), body: t("tour.style_body"), padding: 4 },
                    { target: "composer.advanced", title: t("tour.advanced_title"), body: t("tour.advanced_body"), padding: 4 },
                    { target: "composer.generate", title: t("tour.generate_title"), body: t("tour.generate_body"), padding: 0, radius: 22 },
                ]}
            />
        </View>
    );
}

/* ── photo ──────────────────────────────────────────────────────────── */

/**
 * The photo, full-bleed under the status bar, fading into the ground — and,
 * for Magic Edit, what the user painted on it.
 *
 * <p>Coming back from the mask screen, the composer used to show the bare
 * room: the strokes existed in the store and nowhere on screen, so the only
 * way to check the mask was to spend a credit and look at the result. The
 * overlay is the same component the mask screen draws with, at the same
 * normalised coordinates, so what is shown here is what will be sent.
 *
 * <p>PROTECT strokes are drawn green and CHANGE strokes gold, matching the
 * mask screen's own colours — the two mean opposite things and one colour
 * for both would be worse than no overlay.
 *
 * <p>v3 (2026-10-10): the room-type pill that sat on the photo is gone — the
 * room is asked for in its own strip below. Back and "Change photo" moved to
 * the top on photo chrome. The gradient's top band is there so those two
 * pills and the status bar stay legible on a bright ceiling.
 */
function PhotoFrame({
    uri,
    width,
    height,
    topInset,
    onBack,
    onReplace,
    busy,
    maskStrokes,
    maskMode,
}: {
    uri?: string;
    width: number | null;
    height: number | null;
    topInset: number;
    onBack: () => void;
    onReplace: () => void;
    busy: boolean;
    maskStrokes?: unknown[] | null;
    maskMode?: string | null;
}) {
    const { t } = useTranslation();
    return (
        <View
            style={{
                height: PHOTO_HEIGHT,
                minHeight: PHOTO_MIN,
                flexShrink: 1,
                marginBottom: 6,
                backgroundColor: U.surface,
                overflow: "hidden",
            }}
        >
            {uri ? (
                <>
                    <Image
                        source={{ uri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                        accessibilityIgnoresInvertColors
                    />
                    {maskStrokes && maskStrokes.length > 0 && width && height ? (
                        <MaskOverlay
                            strokes={maskStrokes as never}
                            imageWidth={width}
                            imageHeight={height}
                            color={maskMode === "PROTECT" ? "#7BB38A" : U.accent}
                        />
                    ) : null}
                </>
            ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={U.inkMuted} />
                </View>
            )}

            {/* Transparent stops are the ground colour at zero alpha, not
                "transparent" — iOS interpolates through black otherwise
                and the middle of the photo greys. */}
            <LinearGradient
                pointerEvents="none"
                colors={[U.overlayScrim, `${U.ground}00`, `${U.ground}00`, U.ground]}
                locations={[0, 0.34, 0.64, 1]}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <View
                style={{
                    position: "absolute",
                    top: topInset + 6,
                    left: GUTTER,
                    right: GUTTER,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <PhotoPill onPress={onBack} label={t("common.back")} round>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path d="M15 6l-6 6 6 6" stroke={U.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </PhotoPill>

                <PhotoPill onPress={onReplace} label={t("studio.change_photo")}>
                    {busy ? (
                        <ActivityIndicator size="small" color={U.ink} />
                    ) : (
                        <Text style={{ ...V.row, color: U.ink }}>{t("studio.change_photo")}</Text>
                    )}
                </PhotoPill>
            </View>
        </View>
    );
}

/**
 * A pill that sits on a photograph. It carries its own dark fill and light
 * hairline rather than a theme surface, because the thing behind it is an
 * arbitrary image — a token that assumes a known background fails on a bright
 * kitchen and a dark hallway in opposite directions. 44pt tall: it is the only
 * way back off this screen besides the swipe.
 */
function PhotoPill({
    children,
    onPress,
    label,
    round,
}: {
    children: React.ReactNode;
    onPress: () => void;
    label: string;
    round?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={{
                height: 44,
                minWidth: 44,
                paddingHorizontal: round ? 0 : 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: U.photoChrome,
                borderWidth: 1,
                borderColor: U.photoChromeBorder,
                borderRadius: R.pill,
            }}
        >
            {children}
        </Pressable>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <Text accessibilityRole="header" style={{ ...V.displayXS, color: U.ink, paddingHorizontal: GUTTER, marginBottom: 10 }}>
            {children}
        </Text>
    );
}

function Chevron({ color }: { color: string }) {
    return (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

/* ── create ─────────────────────────────────────────────────────────── */

/**
 * CREATE. Two layers: the muted button underneath, and the gold one on top
 * whose opacity {@link useReadyFade} cross-fades in once room, style and photo
 * are all there. Layering instead of interpolating colours keeps the fade on
 * the UI thread and leaves the gold and muted looks as plain tokens.
 *
 * <p>Disabled is the {@code disabled} prop, not the look: the gold layer can
 * still be fading out when the button stops taking taps.
 */
function CreateButton({
    label,
    disabled,
    submitting,
    litStyle,
    hint,
    onPress,
}: {
    label: string;
    disabled: boolean;
    submitting: boolean;
    litStyle: object;
    hint?: string;
    onPress: () => void;
}) {
    const arrow = (color: string) => (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
    const face = {
        position: "absolute" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: R.button,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingHorizontal: 22,
    };
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={hint}
            accessibilityState={{ disabled, busy: submitting }}
            style={{ height: 56 }}
        >
            <View style={[face, { backgroundColor: U.surface, borderWidth: 1, borderColor: U.lineAccent }]}>
                <Text style={{ ...V.button, color: U.inkMuted }}>{label}</Text>
                {arrow(U.inkMuted)}
            </View>
            <Animated.View
                pointerEvents="none"
                style={[
                    face,
                    {
                        backgroundColor: U.buttonFill,
                        shadowColor: U.accent,
                        shadowOpacity: 0.18,
                        shadowRadius: 11,
                        shadowOffset: { width: 0, height: 4 },
                    },
                    litStyle,
                ]}
            >
                {submitting ? (
                    <View style={{ flex: 1, alignItems: "center" }}>
                        <Spinner color={U.buttonInk} />
                    </View>
                ) : (
                    <>
                        <Text style={{ ...V.button, color: U.buttonInk }}>{label}</Text>
                        {arrow(U.buttonInk)}
                    </>
                )}
            </Animated.View>
        </Pressable>
    );
}

/* ── compact rows ───────────────────────────────────────────────────── */

/** Advanced: a label, what is inside it, a chevron. */
function CompactRow({ label, detail, onPress }: { label: string; detail?: string; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={detail ? `${label}, ${detail}` : label}
            style={{
                minHeight: 48,
                paddingHorizontal: 16,
                borderRadius: R.tile,
                backgroundColor: U.surface,
                borderWidth: 1,
                borderColor: U.lineNeutral,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
            }}
        >
            <Text style={{ ...V.row, color: U.ink }} numberOfLines={1}>
                {label}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
                {detail ? (
                    <Text style={{ ...V.rowQuiet, color: U.inkMuted, flexShrink: 1 }} numberOfLines={1}>
                        {detail}
                    </Text>
                ) : null}
                <Chevron color={U.inkMuted} />
            </View>
        </Pressable>
    );
}

/**
 * "Put a real piece in" — the furniture catalogue, as one compact row.
 *
 * <p>It used to show the first four items of the CATALOGUE whatever the user
 * had picked, so choosing a leather two-seater left four unrelated sofas on
 * screen with the name changed underneath. The row shows the selection, and
 * each piece can be removed by tapping it: a choice you cannot take back is a
 * choice most people will not make. (The catalogue screen only adds; this row
 * is the only place a piece comes off.)
 *
 * <p>Empty, it shows catalogue pieces as an invitation rather than empty
 * plates — the same suggestion the Studio band used to carry, now in the one
 * place the room already exists.
 *
 * <p>v3 (2026-10-10): was a card of four 56pt plates plus a caption line; it
 * is now a single {@link ROW_HEIGHT} row — label on the left, 44pt thumbs on
 * the right — so the two required strips fit above the footer without a
 * vertical scroll. Suggestions shrink to three to leave the label its room.
 */
function FurnitureRow({
    picked,
    suggestions,
    onBrowse,
    onRemove,
}: {
    picked: { fileId: string; uri: string; name?: string }[];
    suggestions: FurnitureItem[];
    onBrowse: () => void;
    onRemove: (fileId: string) => void;
}) {
    const { t } = useTranslation();
    const hasPicks = picked.length > 0;
    const thumb = {
        width: 44,
        height: 44,
        borderRadius: 9,
        backgroundColor: U.productPlate,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        overflow: "hidden" as const,
    };

    return (
        <View
            style={{
                height: ROW_HEIGHT,
                paddingLeft: 16,
                paddingRight: 6,
                borderRadius: R.tile,
                backgroundColor: U.surface,
                borderWidth: 1,
                borderColor: U.lineAccent,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
            }}
        >
            <Pressable
                onPress={onBrowse}
                accessibilityRole="button"
                accessibilityHint={t("studio.browse")}
                style={{ flex: 1, alignSelf: "stretch", justifyContent: "center" }}
            >
                <Text style={{ ...V.row, color: U.ink }} numberOfLines={1}>
                    {hasPicks ? t("studio.pieces_chosen", { count: picked.length }) : t("studio.place_a_real_piece")}
                </Text>
                <Text style={{ fontFamily: "Inter-Bold", fontSize: 11.5, color: U.accentBright }}>
                    {t("studio.browse")} →
                </Text>
            </Pressable>

            {hasPicks
                ? picked.slice(0, 4).map((ref) => (
                      <Pressable
                          key={ref.fileId}
                          onPress={() => onRemove(ref.fileId)}
                          accessibilityRole="button"
                          accessibilityLabel={t("studio.remove_piece", { name: ref.name ?? "" })}
                          style={thumb}
                      >
                          <Image source={{ uri: ref.uri }} style={{ width: "100%", height: 38 }} resizeMode="contain" />
                          <View
                              style={{
                                  position: "absolute",
                                  top: 2,
                                  right: 2,
                                  width: 16,
                                  height: 16,
                                  borderRadius: 8,
                                  backgroundColor: U.ground,
                                  alignItems: "center",
                                  justifyContent: "center",
                              }}
                          >
                              <Text style={{ color: U.ink, fontSize: 10, lineHeight: 12 }}>×</Text>
                          </View>
                      </Pressable>
                  ))
                : suggestions.slice(0, 3).map((item) => (
                      <Pressable
                          key={item.id}
                          onPress={onBrowse}
                          accessibilityRole="button"
                          accessibilityLabel={item.name}
                          style={thumb}
                      >
                          <Image source={{ uri: item.imageUrl }} style={{ width: "100%", height: 38 }} resizeMode="contain" />
                      </Pressable>
                  ))}
        </View>
    );
}

/**
 * The input a mode collected elsewhere, stated plainly with a way back.
 *
 * <p>Magic Edit and Style Transfer gather their extra input on their own
 * screen and then hand over here. Without this row the composer would give no
 * sign that a mask or a reference exists, and the only way to check would be
 * to generate and look at the result. Same height as the furniture row it
 * stands in for, so the layout budget does not change by mode.
 */
function CollectedRow({
    label,
    action,
    thumbUri,
    onPress,
}: {
    label: string;
    action: string;
    thumbUri?: string | null;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${action}`}
            style={{
                height: ROW_HEIGHT,
                paddingHorizontal: 16,
                borderRadius: R.tile,
                backgroundColor: U.surface,
                borderWidth: 1,
                borderColor: U.lineAccent,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
            }}
        >
            {thumbUri ? (
                <Image source={{ uri: thumbUri }} style={{ width: 40, height: 40, borderRadius: 9, marginLeft: -8 }} resizeMode="cover" />
            ) : null}
            <Text style={{ ...V.row, color: U.ink, flex: 1 }} numberOfLines={1}>
                {label}
            </Text>
            <Text style={{ fontFamily: "Inter-Bold", fontSize: 11.5, color: U.accentBright }}>{action} →</Text>
        </Pressable>
    );
}
