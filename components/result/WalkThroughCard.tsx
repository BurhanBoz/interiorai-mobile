import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { theme } from "@/config/theme";

const U = theme.umber;

/**
 * "Walk through it" — the room-video door (redesign v3; the V183 clip button
 * in a new body).
 *
 * <p>Same three faces as the old VideoCta, from the same status: make (with
 * the price, or a lock when the plan is below the feature), in progress
 * (disabled — the clip renders on its own and the push brings the user back),
 * watch (opens the clip). The press itself is still the screen's handleVideo,
 * so every door it guards — paywall below the plan, credits paywall on an
 * empty wallet, the progress screen, a finished clip never bought twice — is
 * unchanged.
 *
 * <p>🔴 The price stays ON the control, the composer's rule for Generate:
 * nobody is charged a number they did not see. It moved from the hint line to
 * the right edge, beside the chevron.
 *
 * <p>The thumbnail is the user's own design, not the stock teaser clip the old
 * button looped: the card is about moving THIS room.
 */
export function WalkThroughCard({
    state, cost, locked, busy, pushGranted, thumbUrl, thumbCacheKey, onPress,
}: {
    state: "make" | "progress" | "watch";
    cost: number | null;
    locked: boolean;
    busy: boolean;
    /** False = no push will come; the hint promises the gallery instead. */
    pushGranted: boolean | null;
    thumbUrl?: string;
    thumbCacheKey?: string;
    onPress: () => void;
}) {
    const { t } = useTranslation();
    const title =
        state === "watch" ? t("result.video_watch")
        : state === "progress" ? t("result.video_in_progress")
        : t("result.video_walk_title");
    const sub =
        state === "progress"
            ? t(pushGranted === false ? "result.video_in_progress_hint_gallery" : "result.video_in_progress_hint")
            : t("result.video_walk_sub");
    const price =
        state === "make" && !locked && cost != null ? t("studio.credit_cost", { count: cost }) : null;
    const showLock = state === "make" && locked;
    const working = busy || state === "progress";

    return (
        <Pressable
            onPress={onPress}
            disabled={working}
            accessibilityRole="button"
            accessibilityState={{ disabled: working, busy: working }}
            accessibilityLabel={[title, sub, price, showLock ? t("result.video_locked_hint") : null]
                .filter(Boolean)
                .join(". ")}
            // Static style: the `({ pressed }) => …` form was dropped whole by NativeWind here.
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                padding: 10,
                borderRadius: theme.v2Layout.radius.card,
                backgroundColor: U.surface,
                borderWidth: 1,
                borderColor: U.lineAccent,
            }}
        >
            <View style={{ width: 72, height: 72, borderRadius: theme.v2Layout.radius.thumb, overflow: "hidden", backgroundColor: U.ground }}>
                {thumbUrl ? (
                    <Image
                        source={{ uri: thumbUrl, cacheKey: thumbCacheKey }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                    />
                ) : null}
                <View style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: U.overlayScrim, alignItems: "center", justifyContent: "center",
                }}>
                    {working ? (
                        <ActivityIndicator size="small" color={U.ink} />
                    ) : (
                        <Ionicons name="play" size={22} color={U.ink} />
                    )}
                </View>
            </View>

            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ fontFamily: "NotoSerif", fontSize: 17, lineHeight: 23, color: U.ink }} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={{ ...theme.v2.rowQuiet, color: U.inkMuted }} numberOfLines={2}>
                    {sub}
                </Text>
            </View>

            {price ? (
                <Text style={{ fontFamily: "Inter-Bold", fontSize: 12.5, color: U.accentBright }}>{price}</Text>
            ) : null}
            {showLock ? (
                // A lock, not a plan name: since V187 the clip is on Base and Pro.
                <View style={{ borderWidth: 1, borderColor: U.accent, borderRadius: 5, paddingVertical: 2, paddingHorizontal: 4 }}>
                    <Ionicons name="lock-closed" size={10} color={U.accentBright} />
                </View>
            ) : null}
            {state !== "progress" ? (
                <Ionicons name="chevron-forward" size={16} color={U.accentBright} />
            ) : null}
        </Pressable>
    );
}
