import { forwardRef } from "react";
import { View, Text, Image as RNImage } from "react-native";
import { Image } from "expo-image";
import { theme } from "@/config/theme";

const U = theme.umber;

/** Card size in points; on a 3× screen the capture is 1080 × 1350 (4:5). */
export const SHARE_CARD_W = 360;
export const SHARE_CARD_H = 450;
/** The picture's width inside the 10pt margins. */
const INNER_W = SHARE_CARD_W - 20;

/**
 * The before/after card the result screen shares (2.4.1, owner 12 Oct).
 *
 * <p>Rendered off-screen and captured with react-native-view-shot. It replaces
 * the bare render on "Share": in 30 days 131 people opened a result, 8 saved
 * one and share fired 4 times, and a lone render carries no trace of where it
 * came from. The card shows the room as it was, the design, and the Roomframe
 * mark — the shape the paid ads and pins use.
 *
 * <p>Images are the same expo-image sources (and cache keys) as the result
 * frame above, so they are normally already on device. The parent waits for
 * both onLoad callbacks before capturing and falls back to the plain render
 * otherwise.
 */
export const ShareCard = forwardRef<View, {
    beforeUrl: string;
    beforeHeaders: Record<string, string>;
    beforeCacheKey?: string;
    afterUrl: string;
    afterCacheKey?: string;
    beforeLabel: string;
    afterLabel: string;
    onBeforeLoad: () => void;
    onAfterLoad: () => void;
}>(function ShareCard(p, ref) {
    return (
        <View
            ref={ref}
            collapsable={false}
            pointerEvents="none"
            // Off-screen, never visible: captured on demand.
            style={{ position: "absolute", left: -10000, top: 0, width: SHARE_CARD_W, height: SHARE_CARD_H, backgroundColor: U.ground }}
        >
            {/* The slider at its middle (build 114): the before fills the card, the after covers
                its right half, a gold seam between — the frame people drag to on the result
                screen, and the one that reads at a glance in a feed. */}
            <View style={{ flex: 1, margin: 10, marginBottom: 6, borderRadius: 12, overflow: "hidden", backgroundColor: U.surface }}>
                <Image
                    source={{ uri: p.beforeUrl, headers: p.beforeHeaders, cacheKey: p.beforeCacheKey }}
                    style={{ position: "absolute", top: 0, left: 0, width: INNER_W, height: "100%" }}
                    contentFit="cover"
                    onLoad={p.onBeforeLoad}
                />
                <View style={{ position: "absolute", top: 0, bottom: 0, left: INNER_W / 2, width: INNER_W / 2, overflow: "hidden" }}>
                    <Image
                        source={{ uri: p.afterUrl, cacheKey: p.afterCacheKey }}
                        style={{ position: "absolute", top: 0, left: -INNER_W / 2, width: INNER_W, height: "100%" }}
                        contentFit="cover"
                        onLoad={p.onAfterLoad}
                    />
                </View>
                <View style={{ position: "absolute", top: 0, bottom: 0, left: INNER_W / 2 - 1, width: 2, backgroundColor: U.accentBright }} />
                <Pill text={p.beforeLabel} />
                <Pill text={p.afterLabel} gold right />
            </View>
            <View style={{ height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <RNImage source={require("@/assets/icon.png")} style={{ width: 22, height: 22, borderRadius: 5 }} />
                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 12, letterSpacing: 2.4, color: U.accentBright }}>ROOMFRAME AI</Text>
            </View>
        </View>
    );
});

function Pill({ text, gold, right }: { text: string; gold?: boolean; right?: boolean }) {
    return (
        <View style={{
            position: "absolute", [right ? "right" : "left"]: 8, top: 8, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
            backgroundColor: gold ? U.accentBright : "rgba(0,0,0,0.55)",
        }}>
            <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 10, letterSpacing: 1.4, color: gold ? U.buttonInk : "#fff" }}>
                {text.toLocaleUpperCase()}
            </Text>
        </View>
    );
}
