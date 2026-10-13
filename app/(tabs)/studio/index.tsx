import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, StyleSheet, InteractionManager, type ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import { theme } from "@/config/theme";
import { useStudioStore } from "@/stores/studioStore";
import { useCatalogStore } from "@/stores/catalogStore";
import { useCreditStore } from "@/stores/creditStore";
import { useEffectivePlanCode, useEffectiveFeatures } from "@/hooks/useEntitlement";
import { STUDIO_FEATURES, type MagicTool } from "@/components/studio/featureCatalog";
import { SAMPLE_ROOMS } from "@/components/studio/sampleRooms";
import { useImagePicker } from "@/hooks/useImagePicker";
import { HexMark } from "@/components/brand/HexMark";
import { TAB_BAR_HEIGHT, BOTTOM_SAFE_GAP } from "@/components/layout/GlassNavBar";
import { PhotoSourceSheet } from "@/components/studio/PhotoSourceSheet";
import { FREE_DAILY_CEILING } from "@/config/freeTier";
import { CoachMarks } from "@/components/tour/CoachMarks";
import { tourTarget } from "@/components/tour/tourTargets";
import { useFirstRunTour } from "@/hooks/useFirstRunTour";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { ArrowIcon, CameraIcon, StarIcon } from "@/components/studio/StudioIcons";
import { LockedToolSheet } from "@/components/studio/LockedToolSheet";
import { track } from "@/services/analytics";

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;
const GUTTER = theme.v2Layout.gutterWide;

/**
 * Studio — the home screen (Umber redesign, 2026-09-19).
 *
 * <p><b>What changed and why.</b> The previous home showed five features as
 * one full-width card each. Two were visible without scrolling; Style Transfer
 * was the fourth card and Outdoor the fifth, two swipes down, and the first
 * time a user met either was as a padlock. The furniture catalogue — the one
 * thing no competitor has — had no entry point here at all.
 *
 * <p>That screen could not answer "what does this app do?", and the number
 * that matters says nobody stayed to find out: of 126 people who ever produced
 * a design, 118 produced all of them on a single day and 64 generated exactly
 * once.
 *
 * <p>So: six capabilities in one glance, the catalogue promoted to a tile AND
 * a band, and the locked pair shown as photographs with a PRO tag rather than
 * hidden behind a lock. Nothing is withheld visually; the tag says what costs
 * money.
 *
 * <p><b>Photo first (2.1.0, 2026-09-29 founder call).</b> Until 2.0.0 the photo
 * and the tool were two equal halves and whichever came second navigated, so
 * people started on the big tool grid and met the photo question on the next
 * screen. Now the order is fixed on THIS screen, without adding a step: the
 * tools stay on show — they are still the answer to "what does this app do?" —
 * but they are dimmed and do not open until there is a room. Tapping one early
 * is not a dead tap: the phone gives a short warning buzz and the "Add a photo"
 * tile pulses, which says where to start without another line of text. Once
 * the room is in, the tiles come up to full strength and a tap goes straight to
 * the tool.
 *
 * <p><b>v3 layout (redesign v3, 2026-10-10).</b> Top to bottom: the brand
 * lockup and credit pill; a one-line serif headline with a muted subline that
 * says where to start; one full-width gold "Add your room" card (the camera /
 * library choice still lives in the sheet it opens); "Or try a sample" — two
 * equal sample photos; and "What to do with it" — the tools as a three-column
 * grid of small icon tiles instead of photographs. The photographs had become
 * the loudest thing on the screen while being the thing you could NOT tap yet;
 * the gold card is now the only bright surface until a room is in.
 *
 * <p><b>Animation.</b> When a room is picked the card cross-fades from gold to
 * the photo and settles with a small spring (0.96 → 1), then the tool tiles
 * light up one after another (~80 ms apart), so the eye travels from the room
 * to what can be done with it. The nudge pulse on a dimmed-tool tap stays.
 * Under iOS Reduce Motion everything renders its end state without moving.
 *
 * <p><b>2.4.0 polish (owner, 10 Oct).</b> The serif headline is gone — only
 * the muted subline stays. "Or try a sample" shows only while there is no
 * room: picking one folds it away and the tools move up; the × on the photo
 * card removes the room and the samples fold back in. The tool tiles carry
 * each tool's real result photo instead of an icon.
 *
 * <p>🔴 <b>The height budget is a contract.</b> Everything below must fit
 * 393 × 852 with no vertical scroll — there is no ScrollView on this screen
 * on purpose. v3 content runs ~612px against ~654px available between the
 * safe-area top (59) and the tab bar plus its gap (96 + 43). Two-line tool
 * labels (German, Dutch) can add ~12px. Adding a block means removing one.
 */
export default function StudioScreen() {
    const { t } = useTranslation();
    const setMode = useStudioStore((s) => s.setMode);
    const setPhoto = useStudioStore((s) => s.replacePhoto);
    const planCode = useEffectivePlanCode();
    // 🔴 The lock comes from the SERVER's plan_features, not from the client
    // catalogue's `minPlan`. The two had already drifted: only Outdoor carried
    // minPlan, so Style Transfer rendered unlocked here while the backend
    // refuses it — a user could walk the whole flow and be turned away at the
    // charge. The catalogue file's own comment warns about exactly this
    // ("never re-hardcode a lock list, it drifted in both directions").
    const features = useEffectiveFeatures();

    const balance = useCreditStore((s) => s.balance);
    const fetchBalance = useCreditStore((s) => s.fetchBalance);

    const [sourceSheet, setSourceSheet] = useState(false);

    /**
     * BU ziyarette seçilen fotoğraf.
     *
     * <p>🔴 Store'dan okunmuyor, kasten. Karo açılışta store'daki fotoğrafı
     * gösterdiğinde ekran geçen seferden kalmış bir odayla karşılıyordu ve
     * kullanıcı onu yeni seçimi sanıyordu (19 Eyl kurucu kararı). Ekrana
     * girerken boş, seçtikten sonra dolu.
     *
     * <p>Bir iş bitince studioStore.reset() fotoğrafı siler; bir sonraki odakta
     * karo da boşalır ve araçlar yeniden kapanır. İş yapmadan geri dönen
     * kullanıcı ise aynı odayla döner ve başka bir araç seçebilir.
     */
    const [justPicked, setJustPicked] = useState<string | null>(null);
    /** The local file shown on the tile while it uploads. */
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    /** Bumped when a dimmed tool is tapped; the intake tile pulses on each bump. */
    const [nudge, setNudge] = useState(0);

    useFocusEffect(
        useCallback(() => {
            fetchBalance().catch(() => {});
            const stored = useStudioStore.getState().photo;
            if (!stored?.fileId) {
                setJustPicked(null);
            } else {
                // The composer can replace the room (its "Replace" pill). Follow
                // it, but only if a room was picked on THIS visit — an earlier
                // visit's room is still never shown.
                setJustPicked((current) => (current != null ? stored.uri ?? current : current));
            }
        }, [fetchBalance]),
    );

    const { pickImage, useSampleImage, isUploading } = useImagePicker();

    /** The tools open only once a room is uploaded and in the store. */
    const photoReady = justPicked != null && !isUploading;

    /**
     * First-run tour (2.2.0): where to start, then what the tools are. Only
     * while the screen is in its first state — no room yet, no sheet open.
     * The composer carries the second half (room type → style → advanced →
     * generate).
     */
    /** True while an `intent` arrival (below) is picking its photo: the tour waits. */
    const [intentPicking, setIntentPicking] = useState(false);
    // 🔴 Not while the intent flow's library / permission prompt is up (TestFlight-path repro,
    // 5 Oct): the tour's overlay mounted under the system prompt, never showed, and swallowed
    // every tap on this screen until the user switched tabs.
    const tour = useFirstRunTour("studio", justPicked == null && !sourceSheet && !isUploading && !intentPicking);

    /**
     * Where a mode goes.
     *
     * <p>🔴 Two modes need an input the composer does not collect, and
     * {@link useGenerate} refuses without it: Magic Edit needs a painted mask
     * and Style Transfer needs a reference photo. Sending them to the
     * composer let the user walk the whole screen and meet an alert at
     * Generate — a dead end with the credit cost already on display.
     *
     * <p>They keep their own screens, which do collect it. Both read the
     * photo from the studio store, so the intake above still applies.
     */
    const MODE_ROUTES: Record<string, string> = {
        INPAINT: "/studio/smart-edit",
        STYLE_TRANSFER: "/studio/style-transfer",
    };

    const goComposer = (mode: string, opts?: { catalogue?: boolean; tool?: MagicTool }) => {
        setMode(mode as never);
        const dedicated = MODE_ROUTES[mode];
        if (dedicated) {
            // Magic Edit's two tools share one screen; the tool says which modes it offers.
            router.push((opts?.tool ? `${dedicated}?tool=${opts.tool}` : dedicated) as never);
            return;
        }
        router.push({
            pathname: "/studio/composer",
            params: opts?.catalogue ? { sheet: "catalogue" } : undefined,
        } as never);
    };

    /**
     * Intake. Every path goes through {@link useImagePicker}, which is also
     * where the consent gate lives, so no photo can leave the device unasked
     * whichever button was pressed. A cancelled picker returns null and we
     * stay put.
     */
    const addPhoto = async (
        source: { kind: "camera" } | { kind: "gallery" } | { kind: "sample"; module: number },
    ) => {
        Haptics.selectionAsync();
        const opts = { onPreview: setPreviewUri };
        const picked =
            source.kind === "sample"
                ? await useSampleImage(source.module, opts)
                : await pickImage(source.kind, opts);
        setPreviewUri(null);
        if (!picked) return;
        // 🔴 The picker RETURNS the photo; it does not store it. Without this
        // the composer opened on an empty frame that spun forever — the
        // upload had succeeded and nothing was holding the result.
        setPhoto(picked);
        setJustPicked(picked.uri ?? null);
    };

    /**
     * The × on the photo card: back to the first state — gold card, samples,
     * dimmed tools. replacePhoto(null) also drops the room type and style chosen
     * for the old photo, as picking a different photo would.
     */
    const removePhoto = () => {
        Haptics.selectionAsync();
        setPhoto(null);
        setJustPicked(null);
    };

    /**
     * Arrival with a tool already chosen (2.3.0): the welcome screen after a purchase offers
     * "Empty Room", "Style Transfer"… and sends the choice here as `intent`. A tool without a
     * room is a dead end — it used to open the composer on an empty frame — so the photo
     * library opens straight away and the tool follows the pick. A cancelled pick leaves the
     * user here, tools dimmed until a room is chosen, like any other visit.
     */
    const { intent } = useLocalSearchParams<{ intent?: string }>();
    const handledIntent = useRef<string | null>(null);
    useEffect(() => {
        if (!intent || handledIntent.current === intent) return;
        handledIntent.current = intent;
        router.setParams({ intent: undefined } as never);
        setIntentPicking(true);
        (async () => {
            try {
                const picked = await pickImage("gallery", { onPreview: setPreviewUri });
                setPreviewUri(null);
                if (!picked) return;
                setPhoto(picked);
                setJustPicked(picked.uri ?? null);
                goComposer(intent);
            } finally {
                setIntentPicking(false);
            }
        })();
    }, [intent]);

    /** The locked tool whose sample is on screen (2.4.1), or null. */
    const [lockedPreview, setLockedPreview] = useState<string | null>(null);

    const onFeature = (key: string, locked: boolean, tool?: MagicTool) => {
        // A locked tool shows its own sample first, with or without a room (2.4.1):
        // the room is not what is missing here, the plan is.
        if (locked) {
            Haptics.selectionAsync();
            track("locked_preview_shown", { mode: key });
            setLockedPreview(key);
            return;
        }
        if (!photoReady) {
            // The room comes first. No navigation — a buzz and a pulse on the
            // tile that starts the flow.
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setNudge((n) => n + 1);
            return;
        }
        Haptics.selectionAsync();
        goComposer(key, { tool });
    };

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
            {/* 🔴 The tab bar is absolutely positioned, so it takes no space —
                a flex:1 column runs underneath it. Without this padding the
                second tile row and its labels sat behind the dock. */}
            <View
                style={{
                    flex: 1,
                    paddingHorizontal: GUTTER,
                    paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_GAP,
                    // One rhythm between every block (mockup: 22, trimmed to
                    // 18 to keep the 393 × 852 budget — see the top comment).
                    gap: SECTION_GAP,
                }}
            >
                <Header balance={balance} planCode={planCode} />
                <Subline />
                <AddRoomCard
                    busy={isUploading}
                    photoUri={previewUri ?? justPicked}
                    nudge={nudge}
                    onPress={() => setSourceSheet(true)}
                    onRemove={removePhoto}
                />
                {/* Samples are for the empty state only (owner, 10 Oct): once a room is
                    in they fold away, and they come back if the room is removed. */}
                <Collapsible open={(previewUri ?? justPicked) == null}>
                    <SampleRow busy={isUploading} onSample={(m) => addPhoto({ kind: "sample", module: m })} />
                </Collapsible>
                <FeatureGrid
                    isLocked={(code) =>
                        features.length > 0 &&
                        !(features.find((f) => f.featureCode === code)?.enabled ?? true)
                    }
                    onPress={onFeature}
                    t={t}
                    enabled={photoReady}
                />
            </View>

            <CoachMarks
                visible={tour.visible}
                onFinish={tour.finish}
                steps={[
                    { target: "studio.photo", title: t("tour.photo_title"), body: t("tour.photo_body") },
                    { target: "studio.tools", title: t("tour.tools_title"), body: t("tour.tools_body") },
                ]}
            />

            {lockedPreview && (
                <LockedToolSheet
                    mode={lockedPreview}
                    onClose={() => setLockedPreview(null)}
                    onUnlock={() => {
                        track("locked_preview_upgrade", { mode: lockedPreview });
                        setLockedPreview(null);
                        // The sheet is an RN Modal: open the paywall once it has gone, so the
                        // push does not land in the same frame as the dismissal (sekme-gezgini).
                        InteractionManager.runAfterInteractions(() =>
                            router.push("/paywall?source=FEATURE_TILE" as never),
                        );
                    }}
                />
            )}

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

/** Vertical rhythm between the screen's blocks. */
const SECTION_GAP = 18;

/* ── header ─────────────────────────────────────────────────────────── */

/**
 * The credit pill is the ONLY place credits appear on this screen. The v1
 * design repeated the balance on three surfaces; repeating a number the user
 * has no feel for is worse than stating it once.
 *
 * <p>v3 gives it an outline and a star instead of a filled lozenge — the gold
 * fill now belongs to the add card alone. The pill is drawn 34pt tall and its
 * hitSlop brings the target to 44pt, which the budget could not afford as
 * drawn height.
 */
function Header({ balance, planCode }: { balance: number; planCode: string | null }) {
    const { t } = useTranslation();
    // The drip grant is stamped against the UTC calendar day
    // (CreditServiceImpl.maybeGrantDailyDrip), so the next one lands at the
    // next UTC midnight — not at a local hour. Showing a local time here
    // would be a friendly lie.
    const hoursToRefill = (() => {
        const now = new Date();
        const next = Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
        );
        return Math.max(1, Math.ceil((next - now.getTime()) / 3_600_000));
    })();
    // At or above the ceiling the drip does not fire, so promising one would
    // be wrong — with a ceiling of 1, a FREE user holding their one credit
    // was told "+1 in 5h". FREE only — a subscriber's credits do not trickle.
    const showRefill = planCode === "FREE" && balance < FREE_DAILY_CEILING;

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 6,
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
                hitSlop={{ top: 5, bottom: 5, left: 8, right: 8 }}
                style={{
                    height: 34,
                    minWidth: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    borderWidth: 1,
                    borderColor: U.accent,
                    borderRadius: R.pill,
                    paddingHorizontal: 12,
                }}
            >
                <StarIcon color={U.accentBright} />
                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 13, color: U.accentBright }}>
                    {balance}
                </Text>
                {showRefill && (
                    <Text style={{ fontFamily: "Inter-Medium", fontSize: 11, color: U.inkMuted }}>
                        {t("studio.refill_in", { hours: hoursToRefill })}
                    </Text>
                )}
            </Pressable>
        </View>
    );
}

/**
 * The muted line that says where to start. The serif headline above it was
 * removed (owner, 10 Oct): the gold card already says it, and the screen is
 * calmer without it. Held to one line; it shrinks instead of wrapping.
 */
function Subline() {
    const { t } = useTranslation();
    return (
        <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={{ fontFamily: "Inter", fontSize: 15, lineHeight: 21, color: U.inkMuted }}
        >
            {t("studio.home_subline", { defaultValue: "Start with a photo of the room as it is." })}
        </Text>
    );
}

/**
 * Folds its child away (height and opacity together) and back. The child is
 * laid out out of flow and measured at its natural height; the wrapper animates between that and
 * zero. The wrapper also swallows the column's {@link SECTION_GAP} above it —
 * negative margin, then the same gap as padding inside — so a folded block
 * leaves no empty gap behind. Under Reduce Motion it snaps.
 */
function Collapsible({ open, children }: { open: boolean; children: ReactNode }) {
    const reduceMotion = useReduceMotion();
    const [h, setH] = useState(0);
    const progress = useSharedValue(open ? 1 : 0);

    useEffect(() => {
        const to = open ? 1 : 0;
        if (reduceMotion) {
            cancelAnimation(progress);
            progress.value = to;
        } else {
            progress.value = withTiming(to, { duration: open ? 320 : 280, easing: Easing.out(Easing.cubic) });
        }
    }, [open, reduceMotion, progress]);

    const style = useAnimatedStyle(() => {
        if (h === 0) return { height: 0, opacity: 0 };
        return { height: h * progress.value, opacity: progress.value };
    });

    return (
        <Animated.View
            pointerEvents={open ? "auto" : "none"}
            accessibilityElementsHidden={!open}
            importantForAccessibility={open ? "auto" : "no-hide-descendants"}
            style={[{ overflow: "hidden", marginTop: -SECTION_GAP }, style]}
        >
            {/* 🔴 Absolute, so the folded wrapper cannot squeeze it: in normal flow the
                rows shrank to nothing while folded, onLayout reported only the
                padding, and the samples came back as an empty 18px strip
                (simulator, 10 Oct). Out of flow it always measures its natural height. */}
            <View
                style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: SECTION_GAP }}
                onLayout={(e) => {
                    const next = e.nativeEvent.layout.height;
                    if (next > 0 && Math.abs(next - h) > 0.5) setH(next);
                }}
            >
                {children}
            </View>
        </Animated.View>
    );
}

/* ── intake ─────────────────────────────────────────────────────────── */

/** Height of the add card — fixed, so the photo state does not move the grid. */
const CARD_HEIGHT = 132;

/**
 * One way in, not two.
 *
 * <p>The row used to spend two of its three columns on "Shoot the room" and
 * "Choose a photo" — one decision split across two tiles, asked before the
 * user has decided they want to give a photo at all. They became a single
 * tile, and in v3 that tile is a full-width gold card: the one bright surface
 * on the screen, so there is no question where to start. The camera-or-library
 * question still moves to the sheet that opens on tap, and the subline names
 * both sources so the camera glyph is not read as a promise.
 *
 * <p>The card shows the room picked on THIS visit (never an earlier one —
 * 19 Sep founder call), and while that room uploads it is already on the
 * card under a spinner. Before there is a preview to show — the file is still
 * being read or downscaled — the camera itself turns into the spinner (build
 * 91: the tap must visibly take).
 *
 * <p><b>Motion.</b> The photo layer sits over the gold one and fades in on the
 * first preview (null → uri), while the card dips to 0.96 and springs back —
 * the "settle". Each `nudge` bump — a dimmed tool was tapped — makes the card
 * pulse once. Both share one scale value, so a nudge mid-settle continues from
 * wherever the card is rather than jumping. Under Reduce Motion the photo
 * simply appears and nothing scales; the haptic stays.
 */
function AddRoomCard({
    busy,
    photoUri,
    nudge,
    onPress,
    onRemove,
}: {
    busy: boolean;
    /** Bu ziyarette seçilen (ya da şu an yüklenen) fotoğraf; null ise kart altın "Odanı ekle" olarak durur. */
    photoUri: string | null;
    nudge: number;
    onPress: () => void;
    /** Clears the room picked on this visit. */
    onRemove: () => void;
}) {
    const { t } = useTranslation();
    const reduceMotion = useReduceMotion();
    const scale = useSharedValue(1);
    const photoOpacity = useSharedValue(photoUri ? 1 : 0);
    const hadPhoto = useRef(photoUri != null);

    useEffect(() => {
        const has = photoUri != null;
        if (has && !hadPhoto.current) {
            if (reduceMotion) {
                photoOpacity.value = 1;
            } else {
                photoOpacity.value = withTiming(1, { duration: 240 });
                scale.value = withSequence(
                    withTiming(0.96, { duration: 110 }),
                    withSpring(1, { damping: 12, stiffness: 180 }),
                );
            }
        } else if (!has) {
            // Upload failed or the visit was reset: back to gold at once —
            // fading a room out reads as "something is still happening".
            cancelAnimation(photoOpacity);
            photoOpacity.value = 0;
        }
        hadPhoto.current = has;
    }, [photoUri, reduceMotion, photoOpacity, scale]);

    // Pulse once per bump — not again when the Reduce Motion setting changes.
    const lastNudge = useRef(nudge);
    useEffect(() => {
        if (nudge === lastNudge.current) return;
        lastNudge.current = nudge;
        if (reduceMotion) return;
        scale.value = withSequence(
            withTiming(1.05, { duration: 120 }),
            withSpring(1, { damping: 6, stiffness: 160 }),
        );
    }, [nudge, reduceMotion, scale]);

    const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const photoStyle = useAnimatedStyle(() => ({ opacity: photoOpacity.value }));

    return (
        // The tour measures this plain wrapper, never the scaled view inside it.
        <View ref={tourTarget("studio.photo")} collapsable={false}>
            <Animated.View
                style={[
                    {
                        height: CARD_HEIGHT,
                        borderRadius: R.card,
                        backgroundColor: U.buttonFill,
                        shadowColor: U.accent,
                        shadowOpacity: 0.18,
                        shadowRadius: 11,
                        shadowOffset: { width: 0, height: 4 },
                    },
                    cardStyle,
                ]}
            >
                <Pressable
                    onPress={onPress}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={
                        photoUri
                            ? t("studio.replace")
                            : busy
                              ? t("studio.uploading")
                              : t("studio.add_your_room", { defaultValue: "Add your room" })
                    }
                    accessibilityHint={
                        photoUri || busy
                            ? undefined
                            : t("studio.add_your_room_sub", { defaultValue: "Camera or photo library" })
                    }
                    accessibilityState={{ busy }}
                    style={{ flex: 1, borderRadius: R.card, overflow: "hidden" }}
                >
                    {/* Gold layer — always mounted, so the photo fades in over it. */}
                    <LinearGradient
                        colors={[U.accentBright, U.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ flex: 1, padding: 18, justifyContent: "space-between" }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <View
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 13,
                                    borderWidth: 1.5,
                                    borderColor: U.buttonInk,
                                    opacity: busy && !photoUri ? 1 : 0.85,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {busy && !photoUri ? (
                                    <ActivityIndicator color={U.buttonInk} />
                                ) : (
                                    <CameraIcon color={U.buttonInk} />
                                )}
                            </View>
                            <ArrowIcon color={U.buttonInk} />
                        </View>
                        <View style={{ gap: 2 }}>
                            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ ...V.button, lineHeight: 20, color: U.buttonInk }}>
                                {busy && !photoUri
                                    ? t("studio.uploading")
                                    : t("studio.add_your_room", { defaultValue: "Add your room" })}
                            </Text>
                            <Text
                                numberOfLines={1}
                                style={{ fontFamily: "Inter", fontSize: 13, lineHeight: 18, color: U.buttonInk, opacity: 0.75 }}
                            >
                                {t("studio.add_your_room_sub", { defaultValue: "Camera or photo library" })}
                            </Text>
                        </View>
                    </LinearGradient>

                    {photoUri ? (
                        <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
                            <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                            {busy ? (
                                <View
                                    style={{
                                        ...StyleSheet.absoluteFillObject,
                                        backgroundColor: U.overlayScrim,
                                        alignItems: "center", justifyContent: "center", gap: 6,
                                    }}
                                >
                                    <ActivityIndicator color={U.accentBright} />
                                    <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 12, color: "#fff" }}>
                                        {t("studio.uploading")}
                                    </Text>
                                </View>
                            ) : (
                                /* Fotoğrafın üstünde metin okunur kalsın diye kendi
                                   perdesi — tema rengi değil, fotoğraf kromu. */
                                <View
                                    style={{
                                        position: "absolute", left: 12, bottom: 12,
                                        paddingHorizontal: 12, paddingVertical: 7,
                                        borderRadius: R.pill,
                                        backgroundColor: U.photoChrome,
                                        borderWidth: 1, borderColor: U.photoChromeBorder,
                                        flexDirection: "row", alignItems: "center", gap: 6,
                                    }}
                                >
                                    <Text style={{ color: U.accentBright, fontSize: 12 }}>✓</Text>
                                    <Text
                                        style={{ fontFamily: "Inter-SemiBold", fontSize: 12, color: "#fff" }}
                                        numberOfLines={1}
                                    >
                                        {t("studio.replace")}
                                    </Text>
                                </View>
                            )}
                            {!busy && (
                                <Pressable
                                    onPress={onRemove}
                                    accessibilityRole="button"
                                    accessibilityLabel={t("studio.remove_photo", { defaultValue: "Remove photo" })}
                                    hitSlop={8}
                                    style={{
                                        position: "absolute", top: 10, right: 10,
                                        width: 30, height: 30, borderRadius: 15,
                                        backgroundColor: U.photoChrome,
                                        borderWidth: 1, borderColor: U.photoChromeBorder,
                                        alignItems: "center", justifyContent: "center",
                                    }}
                                >
                                    <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 15, lineHeight: 18, color: "#fff" }}>✕</Text>
                                </Pressable>
                            )}
                            {/* The accent hairline the photo tile has always had. */}
                            <View
                                pointerEvents="none"
                                style={{
                                    ...StyleSheet.absoluteFillObject,
                                    borderRadius: R.card,
                                    borderWidth: 1.5,
                                    borderColor: U.accent,
                                }}
                            />
                        </Animated.View>
                    ) : null}
                </Pressable>
            </Animated.View>
        </View>
    );
}

/**
 * Two samples, equal width. The green-sofa living room (Redesign, the owner's
 * Prompt Lab room) and the empty room (Empty Room) — owner's choice, 5 Oct.
 * The others stay in the per-mode lists. Each carries its own name now (v3):
 * with two equal tiles a single "Try a sample" caption no longer says which
 * one is which, and the section label above already says what they are for.
 */
function SampleRow({ busy, onSample }: { busy: boolean; onSample: (module: number) => void }) {
    const { t } = useTranslation();
    const samples = ["green_living_room", "empty_room"]
        .map((k) => SAMPLE_ROOMS.find((s) => s.key === k))
        .filter((s): s is (typeof SAMPLE_ROOMS)[number] => !!s);

    return (
        <View style={{ gap: 8 }}>
            <Text style={{ ...V.kicker, color: U.inkMuted }} numberOfLines={1}>
                {t("studio.or_try_a_sample", { defaultValue: "Or try a sample" })}
            </Text>
            <View style={{ flexDirection: "row", gap: 12, height: 104 }}>
                {samples.map((s) => (
                    <Pressable
                        key={s.key}
                        onPress={() => onSample(s.module)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`${t("studio.try_a_sample")}: ${t(s.labelKey)}`}
                        accessibilityState={{ disabled: busy }}
                        style={{ flex: 1, borderRadius: R.tile, overflow: "hidden", backgroundColor: U.surface }}
                    >
                        <Image source={s.module} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        <View
                            style={{
                                position: "absolute",
                                left: 8,
                                bottom: 8,
                                maxWidth: "85%",
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: R.pill,
                                backgroundColor: U.photoChrome,
                                borderWidth: 1,
                                borderColor: U.photoChromeBorder,
                            }}
                        >
                            <Text numberOfLines={1} style={{ fontFamily: "Inter-SemiBold", fontSize: 12, lineHeight: 16, color: U.ink }}>
                                {t(s.labelKey)}
                            </Text>
                        </View>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

/* ── feature grid ───────────────────────────────────────────────────── */

/** How dark the veil over a tool photo is while there is no room yet. */
const PHOTO_VEIL = 0.5;
/** Delay between one tool lighting up and the next. */
const LIGHT_UP_STAGGER = 80;

/**
 * Five small tiles, three across — icon, label, and a PRO tag on the locked
 * ones. v2 drew the tools as photographs and gave the paid pair double width;
 * in v3 the add card carries the screen's weight and the tools are a quiet
 * menu of what comes next, so every tool gets the same tile and the PRO tag
 * alone says what costs money.
 *
 * <p>Until a room is in ({@code enabled} false) every tile is dimmed and
 * reported as disabled to VoiceOver, with the hint saying what comes first.
 * The tiles still receive the tap so the screen can answer it (buzz + pulse on
 * the add card) instead of swallowing it. When the room arrives they light up
 * one after another (see {@link ToolTile}).
 */
function FeatureGrid({
    isLocked,
    onPress,
    t,
    enabled,
}: {
    /** Server truth. Returns false until plan_features has loaded — an
        unlocked flash is recoverable, a wrongly locked tile is not. */
    isLocked: (featureCode: string) => boolean;
    onPress: (key: string, locked: boolean, tool?: MagicTool) => void;
    t: (k: string, o?: Record<string, unknown>) => string;
    enabled: boolean;
}) {
    // Cozy Christmas (2.5.0) shows only while the server lists seasonal themes —
    // the season ends as data, not as a release. The catalogue is cached, so a
    // second launch knows at once; the first paints without it and the tile
    // arrives with the fetch.
    const seasonalThemes = useCatalogStore((s) => s.seasonalThemes);
    const ensureCatalog = useCatalogStore((s) => s.ensureLoaded);
    useEffect(() => {
        ensureCatalog().catch(() => {});
    }, [ensureCatalog]);
    const seasonOn = seasonalThemes.length > 0;
    // Each tile shows the tool's own result photo — the same real "after" its
    // teaser on the feature sheet uses (owner, 10 Oct: no empty tiles).
    const items = STUDIO_FEATURES
        .filter((f) => f.key !== "SEASONAL" || seasonOn)
        .map((f) => ({ id: f.id, key: f.key as string, tool: f.tool, label: t(f.titleKey), image: "after" in f.media ? f.media.after : f.media.image, span: f.key === "SEASONAL" ? 2 : 1 }));
    // 🔴 The height budget (top of file) allows two rows. With the seasonal tile
    // the grid is seven tiles, so it goes four wide: the seasonal tile takes
    // two columns of the first row (it leads, and it is the one with the
    // sparkle), the six tools share the rest. Without it: three wide, as before.
    const perRow = seasonOn ? 4 : 3;
    const rows: (typeof items)[] = [];
    for (let i = 0, used = 0; i < items.length; ) {
        const row: typeof items = [];
        for (used = 0; i < items.length && used + items[i].span <= perRow; i++) {
            row.push(items[i]);
            used += items[i].span;
        }
        rows.push(row);
    }

    return (
        <View style={{ gap: 8 }}>
            <Text style={{ ...V.kicker, color: U.inkMuted }} numberOfLines={1}>
                {t("studio.what_to_do_with_it", { defaultValue: "What to do with it" })}
            </Text>
            <View style={{ gap: 8 }}>
                {/* What the first-run tour measures — the grid's own frame, without
                    wrapping (and so re-flowing) it. */}
                <View
                    ref={tourTarget("studio.tools")}
                    collapsable={false}
                    pointerEvents="none"
                    style={StyleSheet.absoluteFill}
                />
                {rows.map((row, r) => (
                    <View key={r} style={{ flexDirection: "row", gap: 8 }}>
                        {row.map((item, c) => {
                            const featureCode = item.key === "OUTDOOR" ? "OUTDOOR_DESIGN"
                                : item.key === "SEASONAL" ? "SEASONAL_DECOR" : item.key;
                            const locked = isLocked(featureCode);
                            return (
                                <ToolTile
                                    key={item.id}
                                    mode={item.key}
                                    label={item.label}
                                    image={item.image}
                                    locked={locked}
                                    enabled={enabled}
                                    index={r * perRow + c}
                                    span={item.span}
                                    festive={item.key === "SEASONAL"}
                                    newTag={item.key === "SEASONAL" ? t("studio.seasonal_new") : undefined}
                                    hint={enabled ? undefined : t("studio.photo_source_title")}
                                    onPress={() => onPress(item.key, locked, item.tool)}
                                />
                            );
                        })}
                        {/* A short last row keeps the column width instead of stretching. */}
                        {Array.from({ length: perRow - row.reduce((n, it) => n + it.span, 0) }).map((_, k) => (
                            <View key={`pad-${k}`} style={{ flex: 1 }} />
                        ))}
                    </View>
                ))}
            </View>
        </View>
    );
}

/** Tile height — photo with the label on a scrim. */
const TOOL_TILE_HEIGHT = 92;

/**
 * One tool: the tool's result photo, full bleed, with its name on a dark scrim
 * along the bottom and a PRO tag top right on the locked ones (v3 + photos,
 * owner 10 Oct).
 *
 * <p>Its opacity is its own, so the grid can light up in order: when
 * {@code enabled} turns true the tile waits {@code index × 80 ms} and lifts
 * its veil ({@link PHOTO_VEIL} → 0). Dimming again (the visit was reset after a job, or
 * the room was removed) is quick and not staggered. Reduce Motion jumps
 * straight to the end value.
 *
 * <p>Redesign is the default first tool, so it keeps the accent outline even
 * while dimmed; the rest have the neutral hairline.
 */
function ToolTile({
    mode,
    label,
    image,
    locked,
    enabled,
    index,
    span = 1,
    festive = false,
    newTag,
    hint,
    onPress,
}: {
    mode: string;
    label: string;
    image: ImageSourcePropType;
    locked: boolean;
    enabled: boolean;
    index: number;
    /** Columns the tile takes in its row (the seasonal tile takes two). */
    span?: number;
    /** Cozy Christmas (2.5.0): gold outline, a slow light sweep and a NEW tag. */
    festive?: boolean;
    newTag?: string;
    hint?: string;
    onPress: () => void;
}) {
    const reduceMotion = useReduceMotion();
    // The festive sweep: a soft band of light crossing the tile every few
    // seconds, so the tile reads as "lit" among the others without any of the
    // photos changing. Off under Reduce Motion, off while the tile is dimmed.
    const sweep = useSharedValue(-1);
    useEffect(() => {
        if (!festive || reduceMotion || !enabled) {
            cancelAnimation(sweep);
            sweep.value = -1;
            return;
        }
        sweep.value = withRepeat(
            withSequence(
                withTiming(1.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withDelay(2600, withTiming(-1, { duration: 0 })),
            ),
            -1,
            false,
        );
        return () => cancelAnimation(sweep);
    }, [festive, reduceMotion, enabled, sweep]);
    const sweepStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: sweep.value * 160 }, { rotate: "18deg" }],
    }));
    // The dimming is a veil over the photo, not the tile's opacity: at 38%
    // opacity the photos vanished into the ground and the tiles read as empty
    // (simulator, 10 Oct). The veil keeps them visible but clearly not ready.
    const veil = useSharedValue(enabled ? 0 : PHOTO_VEIL);

    useEffect(() => {
        const to = enabled ? 0 : PHOTO_VEIL;
        if (reduceMotion) {
            cancelAnimation(veil);
            veil.value = to;
        } else if (enabled) {
            veil.value = withDelay(index * LIGHT_UP_STAGGER, withTiming(0, { duration: 260 }));
        } else {
            veil.value = withTiming(PHOTO_VEIL, { duration: 200 });
        }
    }, [enabled, reduceMotion, index, veil]);

    const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
    const primary = mode === "REDESIGN" || festive;

    return (
        <View style={{ flex: span }}>
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={{ disabled: !enabled }}
                accessibilityLabel={locked ? `${label}, PRO` : label}
                accessibilityHint={hint}
                // 🔴 No flex:1 here: the Animated wrapper has no height of its own, so a
                // flex child collapses it to zero and the second row drew over the first
                // (simulator, 10 Oct). The tile has a fixed height instead.
                style={{
                    height: TOOL_TILE_HEIGHT,
                    backgroundColor: U.surface,
                    borderRadius: R.tile,
                    overflow: "hidden",
                }}
            >
                {/* Explicit 100% box, as the sample tiles use: with absoluteFill a bundled
                    (require) image drew at its intrinsic size and only its top-left
                    corner showed (simulator, 10 Oct). */}
                <Image source={image} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} resizeMode="cover" />
                {/* Photo chrome, not a theme colour: the label must read on any photo. */}
                <LinearGradient
                    colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.78)"]}
                    start={{ x: 0, y: 0.25 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <Animated.View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { backgroundColor: U.ground }, veilStyle]}
                />
                {festive && !reduceMotion && (
                    <Animated.View
                        pointerEvents="none"
                        style={[{ position: "absolute", top: -40, bottom: -40, left: 0, width: 70 }, sweepStyle]}
                    >
                        <LinearGradient
                            colors={["rgba(240,206,153,0)", "rgba(240,206,153,0.55)", "rgba(240,206,153,0)"]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={{ flex: 1 }}
                        />
                    </Animated.View>
                )}
                {!locked && newTag ? (
                    <View
                        style={{
                            position: "absolute", top: 6, right: 6,
                            paddingHorizontal: 7, paddingVertical: 2,
                            borderRadius: R.pill,
                            backgroundColor: U.accent,
                        }}
                    >
                        <Text style={{ ...V.captionStrong, fontSize: 10, letterSpacing: 1.2, color: U.ground }}>✦ {newTag}</Text>
                    </View>
                ) : null}
                {locked && (
                    <View
                        style={{
                            position: "absolute", top: 6, right: 6,
                            paddingHorizontal: 7, paddingVertical: 2,
                            borderRadius: R.pill,
                            backgroundColor: U.photoChrome,
                            borderWidth: 1, borderColor: U.photoChromeBorder,
                        }}
                    >
                        <Text style={{ ...V.captionStrong, fontSize: 10, letterSpacing: 1.2, color: U.accentBright }}>PRO</Text>
                    </View>
                )}
                {/* A single long word ("Réaménagement") must shrink, not split
                    mid-word — iOS broke it as "Réaménagem / ent" on the French
                    home screen (simulator, 26 Sep). Labels with a space keep
                    their two lines. */}
                <Text
                    numberOfLines={label.includes(" ") ? 2 : 1}
                    adjustsFontSizeToFit={!label.includes(" ")}
                    minimumFontScale={0.7}
                    style={{
                        ...V.tile,
                        position: "absolute", left: 9, right: 9, bottom: 8,
                        color: "#fff",
                    }}
                >
                    {label}
                </Text>
                <View
                    pointerEvents="none"
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        borderRadius: R.tile,
                        borderWidth: primary ? 1.5 : 1,
                        borderColor: festive ? U.accentBright : primary ? U.accent : U.lineNeutral,
                    }}
                />
            </Pressable>
        </View>
    );
}
