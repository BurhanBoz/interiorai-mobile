import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
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
 * <p>🔴 <b>The height budget is a contract.</b> Everything below must fit
 * 393 × 852 with no vertical scroll — there is no ScrollView on this screen
 * on purpose. Content runs ~637px against a tab-bar top of 774px. Adding a
 * block means removing one.
 */
export default function StudioScreen() {
    const { t } = useTranslation();
    const setMode = useStudioStore((s) => s.setMode);
    const setPhoto = useStudioStore((s) => s.setPhoto);
    const photo = useStudioStore((s) => s.photo);
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

    useFocusEffect(
        useCallback(() => {
            fetchBalance().catch(() => {});
        }, [fetchBalance]),
    );

    // Four cut-outs for the band. A failure here must not take the screen
    // with it — the band simply renders its plates empty.
    const { pickImage, useSampleImage, isUploading } = useImagePicker();

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
     * photo from the studio store, so the intake above still applies and
     * nothing about the two-step selection changes.
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
     * Intake: get the photo FIRST, then open the composer.
     *
     * <p>The composer has no upload step of its own — that is the point of
     * folding seven screens into three — so arriving without a photo would
     * leave it showing an empty frame with nothing to do. Every one of these
     * paths goes through {@link useImagePicker}, which is also where the
     * consent gate lives, so no photo can leave the device unasked whichever
     * button was pressed.
     *
     * <p>A cancelled picker returns null and we stay put; navigating anyway
     * is how the old flow produced a dead "Analyze Your Space" screen.
     */
    /**
     * Two choices, then go.
     *
     * <p>Tapping a feature used to navigate on its own, so the composer
     * opened on an empty frame and the first thing it did was ask for the
     * photo the user had not been asked for yet. A mode without a photo is
     * half a request; so is a photo without a mode.
     *
     * <p>So each tap records one half and the SECOND one navigates, in
     * whichever order they arrive. Nothing is preselected — a default mode
     * would mean picking a photo navigates after a single tap, which is the
     * behaviour this replaces.
     */
    const [pendingMode, setPendingMode] = useState<string | null>(null);

    /**
     * BU ziyarette seçilen fotoğraf.
     *
     * <p>🔴 Store'dan okunmuyor, kasten. Karo açılışta store'daki fotoğrafı
     * gösterdiğinde ekran geçen seferden kalmış bir odayla karşılıyordu ve
     * kullanıcı onu yeni seçimi sanıyordu — bu yüzden kaldırılmıştı. Ama
     * kaldırınca ters uç ortaya çıktı: mod seçmeden fotoğraf seçen kullanıcı
     * HİÇBİR geri bildirim görmüyor. Fotoğraf gerçekten alınıyor, yükleniyor
     * ve store'a yazılıyor; ekranda değişen tek şey yok.
     *
     * <p>Ayrım zamanda: yalnız bu oturumda seçilen gösteriliyor. Ekrana
     * girerken boş, seçtikten sonra dolu.
     */
    const [justPicked, setJustPicked] = useState<string | null>(null);

    const addPhoto = async (
        source: { kind: "camera" } | { kind: "gallery" } | { kind: "sample"; module: number },
    ) => {
        Haptics.selectionAsync();
        const picked =
            source.kind === "sample"
                ? await useSampleImage(source.module)
                : await pickImage(source.kind);
        if (!picked) return;
        // 🔴 The picker RETURNS the photo; it does not store it. Without this
        // the composer opened on an empty frame that spun forever — the
        // upload had succeeded and nothing was holding the result.
        setPhoto(picked);
        setJustPicked(picked.uri ?? null);
        if (pendingMode) goComposer(pendingMode);
    };

    const onFeature = (key: string, locked: boolean) => {
        Haptics.selectionAsync();
        if (locked) {
            router.push("/paywall?source=FEATURE_TILE" as never);
            return;
        }
        // Tapping the selected one again clears it — a selection you cannot
        // undo is a trap on a screen with no Back.
        if (pendingMode === key) {
            setPendingMode(null);
            return;
        }
        setPendingMode(key);
        if (photo?.fileId) goComposer(key);
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
                }}
            >
                <Header balance={balance} planCode={planCode} />
                <IntakeRow
                    busy={isUploading}
                    photoUri={justPicked}
                    onAddPhoto={() => setSourceSheet(true)}
                    onSample={(m) => addPhoto({ kind: "sample", module: m })}
                />
                <FeatureGrid
                    isLocked={(code) =>
                        features.length > 0 &&
                        !(features.find((f) => f.featureCode === code)?.enabled ?? true)
                    }
                    onPress={onFeature}
                    t={t}
                    selectedMode={pendingMode}
                />
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
                paddingTop: 10,
                // The intake tile used to start 14px under the lockup, which
                // read as one block rather than a header and a first action.
                paddingBottom: 26,
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
                <Text style={{ fontFamily: "Inter-Bold", fontSize: 13, color: U.accentBright }}>
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

/* ── intake ─────────────────────────────────────────────────────────── */

/**
 * One way in, not two.
 *
 * <p>The row used to spend two of its three columns on "Shoot the room" and
 * "Choose a photo" — one decision split across two tiles, asked before the
 * user has decided they want to give a photo at all. They are now a single
 * tile carrying a "+", wide enough to be the obvious thing on the screen, and
 * the camera-or-library question moves to the sheet that opens on tap.
 *
 * <p>The label is neutral on purpose. The tile now leads to both sources, so
 * naming the camera on it would be a promise the sheet immediately breaks.
 */
/**
 * <p>The tile does NOT show the last photo (2026-09-19 founder call). It did
 * briefly, to make the pending half of the two-step selection visible — but
 * a room the user finished with yesterday, sitting on the home screen as if
 * it were about to be used, reads as a stale state rather than a ready one.
 * The screen opens empty; the photo belongs to the run, not to the home.
 */
function IntakeRow({
    busy,
    photoUri,
    onAddPhoto,
    onSample,
}: {
    busy: boolean;
    /** Bu ziyarette seçilen fotoğraf; null ise karo boş "+" olarak durur. */
    photoUri: string | null;
    onAddPhoto: () => void;
    onSample: (module: number) => void;
}) {
    const { t } = useTranslation();
    const samples = SAMPLE_ROOMS.slice(0, 2);

    return (
        <View style={{ flexDirection: "row", gap: 10, height: 100 }}>
            <Pressable
                onPress={onAddPhoto}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={photoUri ? t("studio.replace") : t("studio.add_a_photo")}
                style={{
                    flex: 2,
                    opacity: busy ? 0.6 : 1,
                    backgroundColor: photoUri ? U.surface : U.buttonFill,
                    borderRadius: R.card,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingHorizontal: 12,
                    borderWidth: photoUri ? 1.5 : 0,
                    borderColor: U.accent,
                }}
            >
                {photoUri ? (
                    <>
                        <Image
                            source={{ uri: photoUri }}
                            style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                            resizeMode="cover"
                        />
                        {/* Fotoğrafın üstünde metin okunur kalsın diye kendi
                            perdesi — tema rengi değil, fotoğraf kromu. */}
                        <View
                            style={{
                                position: "absolute", left: 0, right: 0, bottom: 0,
                                paddingHorizontal: 10, paddingTop: 16, paddingBottom: 8,
                                backgroundColor: "rgba(0,0,0,0.55)",
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
                    </>
                ) : (
                    <>
                        <PlusGlyph color={U.buttonInk} />
                        <Text
                            style={{ fontFamily: "Inter-Bold", fontSize: 15, color: U.buttonInk, textAlign: "center" }}
                            numberOfLines={1}
                        >
                            {t("studio.add_a_photo")}
                        </Text>
                    </>
                )}
            </Pressable>

            <View style={{ flex: 1, gap: 8 }}>
                {samples.map((s, i) => (
                    <Pressable
                        key={s.key}
                        onPress={() => onSample(s.module)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={t("studio.try_a_sample")}
                        style={{ flex: 1, borderRadius: R.tile, overflow: "hidden" }}
                    >
                        <Image source={s.module} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        {i === 0 && (
                            <View
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    paddingHorizontal: 6,
                                    paddingBottom: 4,
                                    paddingTop: 12,
                                    backgroundColor: "rgba(0,0,0,0.55)",
                                }}
                            >
                                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 9.5, color: "#fff" }}>
                                    {t("studio.try_a_sample")}
                                </Text>
                            </View>
                        )}
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

/** A rounded square holding a plus — the shape the tile is built around. */
function PlusGlyph({ color }: { color: string }) {
    return (
        <View
            style={{
                width: 38,
                height: 34,
                borderWidth: 2,
                borderColor: color,
                borderRadius: 9,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <View style={{ position: "absolute", width: 16, height: 2, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ position: "absolute", width: 2, height: 16, backgroundColor: color, borderRadius: 1 }} />
        </View>
    );
}

/* ── feature grid ───────────────────────────────────────────────────── */

/**
 * Six tiles, three across. Furniture is not a {@code DesignMode} on the
 * server — it is a modifier on Redesign — but it is a capability from the
 * user's side, so it gets a tile and opens the composer with the catalogue
 * already up.
 */
function FeatureGrid({
    isLocked,
    onPress,
    t,
    selectedMode,
}: {
    /** Server truth. Returns false until plan_features has loaded — an
        unlocked flash is recoverable, a wrongly locked tile is not. */
    isLocked: (featureCode: string) => boolean;
    onPress: (key: string, locked: boolean) => void;
    t: (k: string) => string;
    selectedMode: string | null;
}) {
    const byKey = Object.fromEntries(STUDIO_FEATURES.map((f) => [f.key, f]));

    /**
     * Five, not six. The Furniture tile came off (2026-09-19): the catalogue
     * is offered inside the composer, where the room it goes into already
     * exists, and a tile that jumped straight past the photo was asking for
     * the piece before the space.
     *
     * <p>Three across, then two wide. The wide pair is the paid pair — the
     * extra width is the point, since this is the only place a free user
     * meets what a plan buys.
     */
    const row1 = [
        { key: "REDESIGN", label: t("studio.mode_redesign") },
        { key: "EMPTY_ROOM", label: t("studio.mode_empty_room") },
        { key: "INPAINT", label: t("studio.mode_inpaint") },
    ];
    const row2 = [
        { key: "STYLE_TRANSFER", label: t("studio.mode_style_transfer") },
        { key: "OUTDOOR", label: t("studio.mode_outdoor") },
    ];

    const tile = (item: { key: string; label: string }, width: string) => {
        const featureCode = item.key === "OUTDOOR" ? "OUTDOOR_DESIGN" : item.key;
        const locked = isLocked(featureCode);
        const selected = selectedMode === item.key;
        const image = imageFor(byKey[item.key]);
        return (
            <Pressable
                key={item.key}
                onPress={() => onPress(item.key, locked)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={item.label}
                style={{
                    width: width as never,
                    backgroundColor: U.surface,
                    borderWidth: selected ? 1.5 : 1,
                    borderColor: selected ? U.accent : U.lineNeutral,
                    borderRadius: R.tile,
                    overflow: "hidden",
                }}
            >
                {/* flex, not a fixed 72: the tile's height now comes from the
                    row, and the image takes whatever the label does not. */}
                <View style={{ flex: 1, minHeight: 72 }}>
                    {image ? (
                        <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    ) : null}
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
                            <Text style={{ fontFamily: "Inter-Bold", fontSize: 8.5, letterSpacing: 1, color: U.accentBright }}>
                                PRO
                            </Text>
                        </View>
                    )}
                    {selected && (
                        <View
                            style={{
                                position: "absolute",
                                top: 6,
                                left: 6,
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: U.accent,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Text style={{ color: U.buttonInk, fontSize: 11, fontWeight: "700" }}>✓</Text>
                        </View>
                    )}
                </View>
                {/* The tile's height is set by the image, never by the label —
                    German "Stilübertragung" and Dutch "Buitenontwerp" wrap to
                    two lines and must not change the grid. */}
                <View style={{ paddingHorizontal: 9, paddingTop: 9, paddingBottom: 11, minHeight: 46 }}>
                    {/* A single long word ("Réaménagement") must shrink, not
                        split mid-word — iOS broke it as "Réaménagem / ent" on
                        the French home screen (simulator, 26 Sep). Labels with
                        a space keep their two lines. */}
                    <Text
                        numberOfLines={item.label.includes(" ") ? 2 : 1}
                        adjustsFontSizeToFit={!item.label.includes(" ")}
                        minimumFontScale={0.7}
                        style={{ ...V.tile, color: selected ? U.accentBright : U.ink }}
                    >
                        {item.label}
                    </Text>
                </View>
            </Pressable>
        );
    };

    /**
     * The grid takes the height the furniture band used to occupy.
     *
     * <p>Removing the band left roughly 250px of dead space under the tiles.
     * The options were to centre the block (which floats), to add something
     * (which the spec forbids — "text is the last resort") or to let the
     * photographs grow into it. The photographs ARE the description of each
     * feature, so they grew: the rows share the remaining height with flex,
     * which also means the screen fills correctly on a 17 Pro and a 17 Pro
     * Max without either one being tuned by hand.
     */
    return (
        <View style={{ flex: 1, marginTop: 18, gap: 8, maxHeight: 420 }}>
            <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                {row1.map((i) => tile(i, "31.5%"))}
            </View>
            <View style={{ flex: 1.15, flexDirection: "row", gap: 8 }}>
                {row2.map((i) => tile(i, "48.7%"))}
            </View>
        </View>
    );
}

/** The feature registry stores media in three shapes; the tile wants one still. */
function imageFor(feature?: (typeof STUDIO_FEATURES)[number]) {
    if (!feature) return null;
    const m = feature.media;
    if (m.kind === "single") return m.image;
    return m.after;
}

