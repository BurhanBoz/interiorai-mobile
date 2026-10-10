import { useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { theme } from "@/config/theme";
import { useCatalogStore } from "@/stores/catalogStore";
import { catalogName } from "@/utils/catalogI18n";
import { getStyleImage } from "@/components/studio/styleImages";

const U = theme.umber;
const THUMB = 44;

/**
 * "Try another style" (redesign v3) — the old four-tile strip, folded into one
 * row under the video card.
 *
 * <p>Same doors as before, smaller: two styles the user has not used on this
 * room (each tap re-runs the generation through the screen's handleRestyle —
 * one charge path, see useGenerate), Reference — the PRO one, which taps
 * through to the paywall rather than pretending to be available — and "+",
 * every other style, which opens the composer with the same photo still
 * loaded. The current style is excluded: offering the thing they are already
 * looking at is the one option that cannot be interesting.
 *
 * <p>Every tap here is a charge, so the price sits under the label, beside the
 * tap.
 */
export function AnotherStyleRow({
    currentStyleCode, cost, onPick, onLocked, onMore, busy, pendingCode,
}: {
    currentStyleCode: string | null;
    cost: number | null | undefined;
    onPick: (code: string) => void;
    onLocked: () => void;
    onMore: () => void;
    busy: boolean;
    /** The style whose render is being submitted — it carries the spinner. */
    pendingCode: string | null;
}) {
    const { t } = useTranslation();
    const styles = useCatalogStore((s) => s.designStyles);

    const picks = useMemo(() => {
        const preferred = ["MINIMALIST", "SCANDINAVIAN", "WARM_MOCHA", "MODERN", "INDUSTRIAL"];
        const byCode = new Map(styles.map((s) => [s.code?.toUpperCase(), s]));
        const out: { code: string; name: string }[] = [];
        for (const code of preferred) {
            if (out.length === 2) break;
            if (code === currentStyleCode?.toUpperCase()) continue;
            const s = byCode.get(code);
            // The composer's name for it, in the user's language.
            if (s) out.push({ code: s.code, name: catalogName(t, "style", s) });
        }
        return out;
    }, [styles, currentStyleCode, t]);

    return (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flexShrink: 1 }}>
                <Text style={{ ...theme.v2.row, color: U.ink }} numberOfLines={2}>
                    {t("result.try_another_style")}
                </Text>
                {cost != null ? (
                    <Text style={{ ...theme.v2.captionStrong, color: U.accentBright, marginTop: 2 }}>
                        {t("studio.credit_cost", { count: cost })}
                    </Text>
                ) : null}
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
                {picks.map((p) => (
                    <Pressable
                        key={p.code}
                        onPress={() => onPick(p.code)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={cost != null ? `${p.name}. ${t("studio.credit_cost", { count: cost })}` : p.name}
                        accessibilityState={{ disabled: busy, busy: pendingCode === p.code }}
                        style={{ width: THUMB, height: THUMB, borderRadius: theme.v2Layout.radius.thumb, overflow: "hidden", backgroundColor: U.surface, opacity: busy && pendingCode !== p.code ? 0.5 : 1 }}
                    >
                        {getStyleImage(p.code) ? (
                            <Image source={getStyleImage(p.code)!} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                        ) : null}
                        {pendingCode === p.code ? (
                            <View style={{
                                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: U.overlayScrim, alignItems: "center", justifyContent: "center",
                            }}>
                                <ActivityIndicator size="small" color={U.accentBright} />
                            </View>
                        ) : null}
                    </Pressable>
                ))}

                <Pressable
                    onPress={onLocked}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`${t("result.reference_style")}. PRO`}
                    style={{ width: THUMB, height: THUMB, borderRadius: theme.v2Layout.radius.thumb, overflow: "hidden", backgroundColor: U.surface, opacity: busy ? 0.5 : 1 }}
                >
                    <Image
                        source={require("@/assets/features/style_after.jpg")}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                    />
                    <View style={{
                        position: "absolute", left: 0, right: 0, bottom: 0,
                        backgroundColor: U.photoChrome, paddingVertical: 1, alignItems: "center",
                    }}>
                        <Text style={{ fontFamily: "Inter-Bold", fontSize: 7.5, letterSpacing: 0.8, color: U.accentBright }}>
                            PRO
                        </Text>
                    </View>
                </Pressable>

                <Pressable
                    onPress={onMore}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={t("result.more_styles")}
                    style={{
                        width: THUMB, height: THUMB, borderRadius: theme.v2Layout.radius.thumb,
                        backgroundColor: U.surface, borderWidth: 1, borderColor: U.lineNeutral,
                        alignItems: "center", justifyContent: "center", opacity: busy ? 0.5 : 1,
                    }}
                >
                    <Ionicons name="add" size={20} color={U.ink} />
                </Pressable>
            </View>
        </View>
    );
}
