import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import { theme } from "@/config/theme";
import { useStudioStore } from "@/stores/studioStore";
import { useCreditStore } from "@/stores/creditStore";
import { useEffectivePlanCode, useEffectiveFeatures } from "@/hooks/useEntitlement";
import { STUDIO_FEATURES } from "@/components/studio/featureCatalog";
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
import { ArrowIcon, CameraIcon, StarIcon, ToolIcon } from "@/components/studio/StudioIcons";

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

    const goComposer = (mode: string, opts?: { catalogue?: boolean }) => {
        setMode(mode as never);
        const dedicated = MODE_ROUTES[mode];
        if (dedicated) {
            router.push(dedicated as never);
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

    const onFeature = (key: string, locked: boolean) => {
        if (!photoReady) {
            // The room comes first. No navigation — a buzz and a pulse on the
            // tile that starts the flow.
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setNudge((n) => n + 1);
            return;
        }
        Haptics.selectionAsync();
        if (locked) {
            router.push("/paywall?source=FEATURE_TILE" as never);
            return;
        }
        goComposer(key);
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
                <Headline />
                <AddRoomCard
                    busy={isUploading}
                    photoUri={previewUri ?? justPicked}
                    nudge={nudge}
                    onPress={() => setSourceSheet(true)}
                />
                <SampleRow busy={isUploading} onSample={(m) => addPhoto({ kind: "sample", module: m })} />
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
 * One serif line and one muted line. Both are held to a single line and
 * shrink instead of wrapping: a wrapped headline would cost ~34px the budget
 * does not have, and "Ihr Raum, neu gestaltet." is longer than the English.
 * The owner set the size to 28 so the English fits at full size (mockup
 * review, 10 Oct).
 */
function Headline() {
    const { t } = useTranslation();
    return (
        <View style={{ gap: 4 }}>
            <Text
                accessibilityRole="header"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{ fontFamily: "NotoSerif", fontSize: 28, lineHeight: 34, letterSpacing: -0.3, color: U.ink }}
            >
                {t("studio.home_headline", { defaultValue: "Your room, redesigned." })}
            </Text>
            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={{ fontFamily: "Inter", fontSize: 14, lineHeight: 20, color: U.inkMuted }}
            >
                {t("studio.home_subline", { defaultValue: "Start with a photo of the room as it is." })}
            </Text>
        </View>
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
}: {
    busy: boolean;
    /** Bu ziyarette seçilen (ya da şu an yüklenen) fotoğraf; null ise kart altın "Odanı ekle" olarak durur. */
    photoUri: string | null;
    nudge: number;
    onPress: () => void;
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

/** How far the tools step back while there is no room yet. */
const DIMMED = 0.38;
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
    onPress: (key: string, locked: boolean) => void;
    t: (k: string, o?: Record<string, unknown>) => string;
    enabled: boolean;
}) {
    const items = STUDIO_FEATURES.map((f) => ({ key: f.key as string, label: t(f.titleKey) }));
    const rows: (typeof items)[] = [];
    for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));

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
                            const featureCode = item.key === "OUTDOOR" ? "OUTDOOR_DESIGN" : item.key;
                            const locked = isLocked(featureCode);
                            return (
                                <ToolTile
                                    key={item.key}
                                    mode={item.key}
                                    label={item.label}
                                    locked={locked}
                                    enabled={enabled}
                                    index={r * 3 + c}
                                    hint={enabled ? undefined : t("studio.photo_source_title")}
                                    onPress={() => onPress(item.key, locked)}
                                />
                            );
                        })}
                        {/* A short last row keeps the column width instead of stretching. */}
                        {Array.from({ length: 3 - row.length }).map((_, k) => (
                            <View key={`pad-${k}`} style={{ flex: 1 }} />
                        ))}
                    </View>
                ))}
            </View>
        </View>
    );
}

/**
 * One tool. Its opacity is its own, so the grid can light up in order: when
 * {@code enabled} turns true the tile waits {@code index × 80 ms} and fades
 * from {@link DIMMED} to 1. Dimming again (the visit was reset after a job) is
 * immediate-ish and not staggered — nothing is being presented. Reduce Motion
 * jumps straight to the end value.
 *
 * <p>Redesign is the default first tool, so it keeps the accent outline and a
 * gold icon even while dimmed; the rest are neutral.
 */
function ToolTile({
    mode,
    label,
    locked,
    enabled,
    index,
    hint,
    onPress,
}: {
    mode: string;
    label: string;
    locked: boolean;
    enabled: boolean;
    index: number;
    hint?: string;
    onPress: () => void;
}) {
    const reduceMotion = useReduceMotion();
    const opacity = useSharedValue(enabled ? 1 : DIMMED);

    useEffect(() => {
        const to = enabled ? 1 : DIMMED;
        if (reduceMotion) {
            cancelAnimation(opacity);
            opacity.value = to;
        } else if (enabled) {
            opacity.value = withDelay(index * LIGHT_UP_STAGGER, withTiming(1, { duration: 260 }));
        } else {
            opacity.value = withTiming(DIMMED, { duration: 200 });
        }
    }, [enabled, reduceMotion, index, opacity]);

    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    const primary = mode === "REDESIGN";

    return (
        <Animated.View style={[{ flex: 1 }, style]}>
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={{ disabled: !enabled }}
                accessibilityLabel={locked ? `${label}, PRO` : label}
                accessibilityHint={hint}
                // 🔴 No flex:1 here: the Animated wrapper has no height of its own, so a
                // flex child collapses it to zero and the second row drew over the first
                // (simulator, 10 Oct). The tile sizes itself; the row stretches siblings.
                style={{
                    minHeight: 76,
                    backgroundColor: U.surface,
                    borderWidth: 1,
                    borderColor: primary ? U.accent : U.lineNeutral,
                    borderRadius: R.tile,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    justifyContent: "space-between",
                    gap: 6,
                }}
            >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <ToolIcon mode={mode} color={primary ? U.accentBright : U.ink} />
                    {locked && (
                        <Text style={{ ...V.captionStrong, letterSpacing: 1.2, color: U.accentBright }}>PRO</Text>
                    )}
                </View>
                {/* A single long word ("Réaménagement") must shrink, not
                    split mid-word — iOS broke it as "Réaménagem / ent" on
                    the French home screen (simulator, 26 Sep). Labels with
                    a space keep their two lines; the row grows ~6px and the
                    budget allows it. */}
                <Text
                    numberOfLines={label.includes(" ") ? 2 : 1}
                    adjustsFontSizeToFit={!label.includes(" ")}
                    minimumFontScale={0.7}
                    style={{ ...V.tile, color: U.ink }}
                >
                    {label}
                </Text>
            </Pressable>
        </Animated.View>
    );
}
