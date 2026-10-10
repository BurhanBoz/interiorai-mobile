import { useRef } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";
import type { CatalogItemResponse } from "@/types/api";
import { catalogName } from "@/utils/catalogI18n";
import { getStyleImage } from "@/components/studio/styleImages";
import { RoomIcon } from "@/components/studio/RoomIcon";
import { useSelectionMotion } from "@/components/studio/selectionMotion";

const U = theme.umber;
const V = theme.v2;
const R = theme.v2Layout.radius;

/**
 * The composer's two required choices — room and style — as horizontal strips
 * (redesign v3, 2026-10-10).
 *
 * <p><b>Why the room became a strip.</b> Until v3 the room type was a pill on
 * the photo that opened {@code RoomTypeSheet}, preset to Living room. The
 * owner's read of real sessions: "living room etc. are not understood" — the
 * pill looked like a caption, not a question, so a kitchen went out labelled
 * as a living room. The strip asks the question in the same shape as the
 * style strip directly below it, which people already scroll and tap.
 *
 * <p>Both strips render the server catalogue as-is, in catalogue order. A code
 * the client has no icon or bundled image for still appears (generic icon /
 * plain plate) — the catalogue decides what exists, the client only dresses
 * it.
 *
 * <p>Selected = gold ring + soft gold glow, faded in by
 * {@link useSelectionMotion}; the tapped tile springs 0.96 → 1. The ring is a
 * separate absolutely positioned layer so its opacity can animate on the UI
 * thread without re-laying out the tile.
 */

/** Room tile edge; the strip is exactly one tile tall. */
const ROOM_TILE = 84;
const ROOM_GAP = 10;
const STYLE_CARD_W = 104;
const STYLE_GAP = 12;
/**
 * Vertical room for the glow. A horizontal ScrollView clips to its bounds, so
 * without this the shadow is cut flat at the top and bottom edge.
 */
const GLOW_PAD = 8;

/** Gold ring + glow layer shared by both tile kinds. */
function Ring({ style, radius, tint }: { style: object; radius: number; tint: boolean }) {
    return (
        <Animated.View
            pointerEvents="none"
            style={[
                {
                    position: "absolute",
                    // Over the tile's own hairline, not inside it.
                    top: -1.5,
                    left: -1.5,
                    right: -1.5,
                    bottom: -1.5,
                    borderRadius: radius,
                    borderWidth: 1.5,
                    borderColor: U.accent,
                    // Room tiles take a faint gold wash as well; style cards
                    // do not — a tint over a photograph only muddies it.
                    backgroundColor: tint ? U.lineAccent : "transparent",
                    shadowColor: U.accentBright,
                    shadowOpacity: 0.3,
                    shadowRadius: 9,
                    shadowOffset: { width: 0, height: 0 },
                },
                style,
            ]}
        />
    );
}

/**
 * Keeps a choice the user made on an earlier run visible on arrival: the
 * strip scrolls so the selected tile is in view instead of leaving a gold
 * ring somewhere off the right edge.
 */
function useScrollToSelected(index: number, step: number) {
    const ref = useRef<ScrollView>(null);
    const done = useRef(false);
    // Content size, not layout: the catalogue can arrive after the strip has
    // already been laid out empty, and only the content size changes then.
    const onContentSizeChange = () => {
        if (done.current || index < 1) return;
        done.current = true;
        ref.current?.scrollTo({ x: Math.max(0, index * step - step), animated: false });
    };
    return { ref, onContentSizeChange };
}

/* ── room ───────────────────────────────────────────────────────────── */

function RoomTile({
    item,
    selected,
    onSelect,
}: {
    item: CatalogItemResponse;
    selected: boolean;
    onSelect: (r: CatalogItemResponse) => void;
}) {
    const { t } = useTranslation();
    const { pulse, scaleStyle, ringStyle } = useSelectionMotion(selected);
    const name = catalogName(t, "room", item);
    const ink = selected ? U.accentBright : U.ink;
    return (
        <Pressable
            onPress={() => {
                pulse();
                onSelect(item);
            }}
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityState={{ selected }}
        >
            <Animated.View
                style={[
                    {
                        width: ROOM_TILE,
                        height: ROOM_TILE,
                        borderRadius: R.tile,
                        backgroundColor: U.surface,
                        borderWidth: 1.5,
                        borderColor: U.lineNeutral,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        paddingHorizontal: 6,
                    },
                    scaleStyle,
                ]}
            >
                <Ring style={ringStyle} radius={R.tile} tint />
                <RoomIcon code={item.code} color={ink} />
                <Text
                    numberOfLines={2}
                    style={{
                        fontFamily: "Inter-SemiBold",
                        fontSize: 11.5,
                        lineHeight: 14,
                        textAlign: "center",
                        color: ink,
                    }}
                >
                    {name}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

export function RoomStrip({
    items,
    selectedId,
    onSelect,
    gutter,
}: {
    items: CatalogItemResponse[];
    selectedId: string | null;
    onSelect: (r: CatalogItemResponse) => void;
    /** Leading inset; the strip itself runs edge to edge so it reads as scrollable. */
    gutter: number;
}) {
    const index = items.findIndex((r) => r.id === selectedId);
    const { ref, onContentSizeChange } = useScrollToSelected(index, ROOM_TILE + ROOM_GAP);
    return (
        <ScrollView
            ref={ref}
            onContentSizeChange={onContentSizeChange}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, marginVertical: -GLOW_PAD }}
            contentContainerStyle={{ gap: ROOM_GAP, paddingHorizontal: gutter, paddingVertical: GLOW_PAD }}
        >
            {items.map((r) => (
                <RoomTile key={r.id} item={r} selected={r.id === selectedId} onSelect={onSelect} />
            ))}
        </ScrollView>
    );
}

/* ── style ──────────────────────────────────────────────────────────── */

function StyleCard({
    item,
    selected,
    onSelect,
}: {
    item: CatalogItemResponse;
    selected: boolean;
    onSelect: (s: CatalogItemResponse) => void;
}) {
    const { t } = useTranslation();
    const { pulse, scaleStyle, ringStyle } = useSelectionMotion(selected);
    const name = catalogName(t, "style", item);
    const image = getStyleImage(item.code);
    return (
        <Pressable
            onPress={() => {
                pulse();
                onSelect(item);
            }}
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityState={{ selected }}
        >
            <Animated.View
                style={[
                    {
                        width: STYLE_CARD_W,
                        padding: 4,
                        borderRadius: R.thumb + 3,
                        borderWidth: 1.5,
                        borderColor: U.lineNeutral,
                    },
                    scaleStyle,
                ]}
            >
                <Ring style={ringStyle} radius={R.thumb + 3} tint={false} />
                <View
                    style={{
                        height: 104,
                        borderRadius: R.thumb,
                        overflow: "hidden",
                        backgroundColor: U.surface,
                    }}
                >
                    {/* Bundled, not fetched — the API's previewUrl is empty
                        for every style. */}
                    {image ? (
                        <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    ) : null}
                </View>
                <Text
                    numberOfLines={1}
                    style={{
                        ...V.row,
                        marginTop: 6,
                        paddingHorizontal: 4,
                        paddingBottom: 2,
                        color: selected ? U.accentBright : U.ink,
                    }}
                >
                    {name}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

export function StyleStrip({
    styles,
    selectedId,
    onSelect,
    gutter,
}: {
    styles: CatalogItemResponse[];
    selectedId: string | null;
    onSelect: (s: CatalogItemResponse) => void;
    gutter: number;
}) {
    const index = styles.findIndex((s) => s.id === selectedId);
    const { ref, onContentSizeChange } = useScrollToSelected(index, STYLE_CARD_W + STYLE_GAP);
    return (
        <ScrollView
            ref={ref}
            onContentSizeChange={onContentSizeChange}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, marginVertical: -GLOW_PAD }}
            contentContainerStyle={{ gap: STYLE_GAP, paddingHorizontal: gutter, paddingVertical: GLOW_PAD }}
        >
            {styles.map((s) => (
                <StyleCard key={s.id} item={s} selected={s.id === selectedId} onSelect={onSelect} />
            ))}
        </ScrollView>
    );
}
