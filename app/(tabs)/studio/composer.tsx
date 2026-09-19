import { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    Pressable,
    Image,
    ScrollView,
    ActivityIndicator,
    ActivityIndicator as Spinner,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import type { FurnitureItem, CatalogItemResponse } from "@/types/api";
import { RoomTypeSheet } from "@/components/studio/RoomTypeSheet";
import { AdvancedSheet } from "@/components/studio/AdvancedSheet";
import { getStyleImage } from "@/components/studio/styleImages";

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;
const GUTTER = theme.v2Layout.gutterNarrow;

/** The room type assumed when nothing better is known. See `inferredRoomType`. */
const DEFAULT_ROOM_CODE = "LIVING_ROOM";

/**
 * Composer — one screen where there used to be seven.
 *
 * <p><b>What it replaces.</b> "Analyze Your Space" (upload), a separate photo
 * confirmation, "Room Type & Style", "Design Specifications", a full-screen
 * consent wall that appeared the instant a photo was picked, and a red
 * "choose a room type to continue" error that fired even when the photo the
 * user had just tapped was labelled "Living room".
 *
 * <p>The principle: <b>ask for nothing that can be assumed.</b> Style defaults
 * to Modern, room type arrives as a fact the user can correct, and the
 * privacy disclosure becomes a permanently visible button instead of an
 * interstitial. A first-time user can land here and press GENERATE without
 * touching anything.
 *
 * <p>🔴 Generation itself goes through {@link useGenerate} unchanged. That is
 * the money path — it reserves credits, mints and reuses an idempotency key,
 * and maps status codes. It was moved verbatim once before for exactly this
 * reason; rewriting it to fit a new layout is how double-charges ship.
 *
 * <p>🔴 No vertical scroll. The action bar is a real footer that reserves its
 * own height, not an overlay — an overlay is what let the old style grid slide
 * underneath the button.
 */
export default function ComposerScreen() {
    const { t } = useTranslation();
    const params = useLocalSearchParams<{ sheet?: string }>();

    const mode = useStudioStore((s) => s.mode);
    const photo = useStudioStore((s) => s.photo);
    const roomType = useStudioStore((s) => s.roomType);
    const designStyle = useStudioStore((s) => s.designStyle);
    const objectRefs = useStudioStore((s) => s.objectRefs);
    const setRoomType = useStudioStore((s) => s.setRoomType);
    const setDesignStyle = useStudioStore((s) => s.setDesignStyle);

    const roomTypes = useCatalogStore((s) => s.roomTypes);
    const designStyles = useCatalogStore((s) => s.designStyles);
    const ensureCatalog = useCatalogStore((s) => s.ensureLoaded);

    const { pickImage, isUploading } = useImagePicker();
    const { generate, isSubmitting } = useGenerate();
    const { cost } = useCreditCost();

    const [sheet, setSheet] = useState<null | "room" | "advanced">(null);

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

    /**
     * Room type as a fact rather than an empty required field.
     *
     * <p>🔴 This is a DEFAULT, not inference. The spec asks for the type to be
     * read from the photo; doing that honestly needs a scene-analysis response
     * the API does not return yet, and guessing in the client would be a lie
     * dressed as a feature. What this does fix is the actual failure: the user
     * is never blocked by an empty field, and the chip says which assumption
     * is in play so a wrong one is one tap from corrected.
     */
    useEffect(() => {
        if (roomType || roomTypes.length === 0) return;
        const fallback =
            roomTypes.find((r) => r.code === DEFAULT_ROOM_CODE) ?? roomTypes[0];
        if (fallback) setRoomType(fallback);
    }, [roomType, roomTypes, setRoomType]);

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

    /** Modern is preselected — the user can generate without touching the strip. */
    useEffect(() => {
        if (designStyle || designStyles.length === 0) return;
        const modern =
            designStyles.find((s) => s.code?.toUpperCase() === "MODERN") ?? designStyles[0];
        if (modern) setDesignStyle(modern);
    }, [designStyle, designStyles, setDesignStyle]);

    const kicker = useMemo(() => {
        const byMode: Record<string, string> = {
            REDESIGN: t("studio.mode_redesign"),
            EMPTY_ROOM: t("studio.mode_empty_room"),
            INPAINT: t("studio.mode_inpaint"),
            STYLE_TRANSFER: t("studio.mode_style_transfer"),
            OUTDOOR: t("studio.mode_outdoor"),
        };
        return (byMode[mode as string] ?? t("studio.mode_redesign")).toUpperCase();
    }, [mode, t]);

    const pickedProduct = objectRefs[0] ?? null;

    const onReplace = useCallback(() => {
        Haptics.selectionAsync();
        pickImage("gallery").catch(() => {});
    }, [pickImage]);

    const canGenerate = Boolean(photo?.fileId) && !isSubmitting && !isUploading;

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: U.ground }}>
            <View style={{ flex: 1 }}>
                <View style={{ flex: 1, paddingHorizontal: GUTTER }}>
                    {/* Header — no step counter, no step name. The kicker says
                        what the user is doing; the wizard numbering said only
                        how much bureaucracy was left. */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingTop: 8,
                            paddingBottom: 14,
                        }}
                    >
                        <Pressable
                            onPress={() => router.back()}
                            accessibilityRole="button"
                            accessibilityLabel={t("common.back")}
                            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                backgroundColor: U.lineNeutral,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Text style={{ color: U.ink, fontSize: 18, lineHeight: 20 }}>‹</Text>
                        </Pressable>
                        <Text style={{ ...V.kicker, color: U.inkMuted, flex: 1, textAlign: "center" }}>
                            {kicker}
                        </Text>
                        <View style={{ width: 34 }} />
                    </View>

                    <PhotoFrame
                        uri={photo?.uri}
                        roomTypeName={roomType?.name ?? ""}
                        onChangeRoom={() => setSheet("room")}
                        onReplace={onReplace}
                        busy={isUploading}
                    />

                    <StyleStrip
                        styles={designStyles}
                        selectedId={designStyle?.id ?? null}
                        onSelect={(s) => {
                            Haptics.selectionAsync();
                            setDesignStyle(s);
                        }}
                    />

                    {/* Advanced first, the pieces it produced underneath —
                        a chosen sofa is the RESULT of opening the catalogue,
                        so it belongs below the controls, not above them.
                        "Photo & privacy" came off this screen: the consent
                        gate lives in useImagePicker and fires before any
                        photo leaves the device, so this button was a second
                        copy of a statement that had already been made. It is
                        still reachable from Settings. */}
                    <View style={{ marginTop: 18 }}>
                        <SecondaryButton
                            label={t("studio.advanced")}
                            tone="ink"
                            onPress={() => setSheet("advanced")}
                        />
                    </View>

                    <FurnitureRow
                        products={products}
                        picked={pickedProduct}
                        onBrowse={() => router.push("/studio/furniture" as never)}
                    />
                </View>

                {/* Action bar — a real footer with its own height. */}
                <View
                    style={{
                        backgroundColor: U.ground,
                        borderTopWidth: 1,
                        borderTopColor: U.lineNeutral,
                        paddingTop: 12,
                        paddingHorizontal: GUTTER,
                        paddingBottom: 26,
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 12,
                        }}
                    >
                        <Text style={{ ...V.rowQuiet, color: U.inkMuted, flex: 1 }} numberOfLines={1}>
                            {pickedProduct
                                ? t("studio.summary_with_piece", {
                                      style: designStyle?.name ?? "",
                                      room: roomType?.name ?? "",
                                  })
                                : t("studio.summary", {
                                      style: designStyle?.name ?? "",
                                      room: roomType?.name ?? "",
                                  })}
                        </Text>
                        {/* The only statement of cost anywhere in the app. */}
                        <Text style={{ fontFamily: "Archivo-700", fontSize: 12.5, color: U.accentBright }}>
                            {t("studio.credit_cost", { count: cost })}
                        </Text>
                    </View>

                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            generate();
                        }}
                        disabled={!canGenerate}
                        accessibilityRole="button"
                        style={{
                            height: 56,
                            borderRadius: R.button,
                            backgroundColor: U.buttonFill,
                            opacity: canGenerate ? 1 : 0.5,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingHorizontal: 22,
                        }}
                    >
                        {isSubmitting ? (
                            <Spinner color={U.buttonInk} />
                        ) : (
                            <>
                                <Text style={{ ...V.button, color: U.buttonInk }}>
                                    {t("studio.generate")}
                                </Text>
                                <Text style={{ color: U.buttonInk, fontSize: 18 }}>→</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </View>

            {sheet === "room" && (
                <RoomTypeSheet
                    items={roomTypes}
                    selectedId={roomType?.id ?? null}
                    onSelect={(r) => {
                        setRoomType(r);
                        setSheet(null);
                    }}
                    onClose={() => setSheet(null)}
                />
            )}
            {sheet === "advanced" && <AdvancedSheet onClose={() => setSheet(null)} />}
        </SafeAreaView>
    );
}

/* ── photo ──────────────────────────────────────────────────────────── */

function PhotoFrame({
    uri,
    roomTypeName,
    onChangeRoom,
    onReplace,
    busy,
}: {
    uri?: string;
    roomTypeName: string;
    onChangeRoom: () => void;
    onReplace: () => void;
    busy: boolean;
}) {
    const { t } = useTranslation();
    return (
        <View
            style={{
                height: 210,
                borderRadius: R.card,
                overflow: "hidden",
                backgroundColor: U.surface,
            }}
        >
            {uri ? (
                <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={U.inkMuted} />
                </View>
            )}

            <View
                style={{
                    position: "absolute",
                    left: 12,
                    right: 12,
                    bottom: 12,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <PhotoPill onPress={onChangeRoom}>
                    <Text style={{ fontFamily: "Archivo-600", fontSize: 12.5, color: "#fff" }}>
                        {roomTypeName}
                    </Text>
                    <Text style={{ fontFamily: "Archivo-400", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                        {t("studio.change")}
                    </Text>
                </PhotoPill>

                <PhotoPill onPress={onReplace}>
                    {busy ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={{ fontFamily: "Archivo-600", fontSize: 12, color: "#fff" }}>
                            {t("studio.replace")}
                        </Text>
                    )}
                </PhotoPill>
            </View>
        </View>
    );
}

/**
 * A pill that sits on a photograph. It carries its own dark fill and light
 * hairline rather than a theme colour, because the thing behind it is an
 * arbitrary image — a token that assumes a known background fails on a bright
 * kitchen and a dark hallway in opposite directions.
 */
function PhotoPill({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            hitSlop={8}
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: U.photoChrome,
                borderWidth: 1,
                borderColor: U.photoChromeBorder,
                borderRadius: R.pill,
                paddingVertical: 7,
                paddingHorizontal: 13,
            }}
        >
            {children}
        </Pressable>
    );
}

/* ── style strip ────────────────────────────────────────────────────── */

function StyleStrip({
    styles,
    selectedId,
    onSelect,
}: {
    styles: CatalogItemResponse[];
    selectedId: string | null;
    onSelect: (s: CatalogItemResponse) => void;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 18, flexGrow: 0 }}
            contentContainerStyle={{ gap: 9 }}
        >
            {styles.map((s) => {
                const selected = s.id === selectedId;
                return (
                    <Pressable
                        key={s.id}
                        onPress={() => onSelect(s)}
                        accessibilityRole="button"
                        accessibilityLabel={s.name}
                        style={{ width: 96 }}
                    >
                        <View
                            style={{
                                height: 104,
                                borderRadius: R.thumb,
                                overflow: "hidden",
                                backgroundColor: U.surface,
                                borderWidth: selected ? 2.5 : 0,
                                borderColor: U.accentBright,
                            }}
                        >
                            {/* Bundled, not fetched — the API's previewUrl is
                                empty for every style. */}
                            {getStyleImage(s.code) ? (
                                <Image
                                    source={getStyleImage(s.code)!}
                                    style={{ width: "100%", height: "100%" }}
                                    resizeMode="cover"
                                />
                            ) : null}
                        </View>
                        <Text
                            numberOfLines={1}
                            style={{
                                fontFamily: "Archivo-600",
                                fontSize: 12,
                                marginTop: 6,
                                color: selected ? U.accentBright : U.inkMuted,
                            }}
                        >
                            {s.name}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

/* ── furniture row ──────────────────────────────────────────────────── */

function FurnitureRow({
    products,
    picked,
    onBrowse,
}: {
    products: FurnitureItem[];
    picked: { name?: string } | null;
    onBrowse: () => void;
}) {
    const { t } = useTranslation();
    return (
        <Pressable
            onPress={onBrowse}
            accessibilityRole="button"
            style={{
                marginTop: 18,
                backgroundColor: U.surface,
                borderWidth: 1,
                borderColor: U.lineAccent,
                borderRadius: R.button,
                padding: 12,
            }}
        >
            <View style={{ flexDirection: "row", gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <View
                        key={i}
                        style={{
                            flex: 1,
                            height: 56,
                            borderRadius: 9,
                            backgroundColor: U.productPlate,
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                        }}
                    >
                        {products[i] ? (
                            <Image
                                source={{ uri: products[i].imageUrl }}
                                style={{ width: "100%", height: 48 }}
                                resizeMode="contain"
                            />
                        ) : null}
                    </View>
                ))}
            </View>

            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 10,
                }}
            >
                <Text style={{ ...V.row, color: U.ink }} numberOfLines={1}>
                    {picked?.name ?? t("studio.place_a_real_piece")}
                </Text>
                <Text style={{ fontFamily: "Archivo-700", fontSize: 11.5, color: U.accentBright }}>
                    {t("studio.browse")} →
                </Text>
            </View>
        </Pressable>
    );
}

/* ── small buttons ──────────────────────────────────────────────────── */

function SecondaryButton({
    label,
    tone,
    onPress,
}: {
    label: string;
    tone: "ink" | "muted";
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={{
                borderWidth: 1,
                borderColor: U.lineNeutral,
                borderRadius: R.inline,
                paddingVertical: 11,
                paddingHorizontal: 13,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
            }}
        >
            <Text
                style={{
                    fontFamily: tone === "ink" ? "Archivo-600" : "Archivo-400",
                    fontSize: 12.5,
                    color: tone === "ink" ? U.ink : U.inkMuted,
                }}
                numberOfLines={1}
            >
                {label}
            </Text>
            <Text style={{ color: U.inkMuted, fontSize: 13 }}>›</Text>
        </Pressable>
    );
}
