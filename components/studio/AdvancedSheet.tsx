import { Pressable, ScrollView, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";

import { theme } from "@/config/theme";
import { useStudioStore } from "@/stores/studioStore";
import { usePlanPermission } from "@/hooks/useEntitlement";
import { BottomSheet } from "./BottomSheet";

const U = theme.umber;
const V = theme.v2;

type PaletteTheme = {
    id: string;
    labelKey: string;
    colors: readonly [string, string, string];
};

/**
 * The eight palettes, unchanged from the options screen they used to live on
 * — same ids, same hex triples, same wire format. Moving the control must not
 * move the values it produces.
 */
const PALETTE_THEMES: readonly PaletteTheme[] = [
    { id: "warm-mocha", labelKey: "studio.palette_warm_mocha", colors: ["#A48359", "#EADEC8", "#F5F1E8"] },
    { id: "soft-neutrals", labelKey: "studio.palette_soft_neutrals", colors: ["#E1C39B", "#F7F7F7", "#8A8A8A"] },
    { id: "sage-sanctuary", labelKey: "studio.palette_sage_sanctuary", colors: ["#A8B599", "#D8DFC8", "#F5F1E8"] },
    { id: "coastal-calm", labelKey: "studio.palette_coastal_calm", colors: ["#9AB7CF", "#F5F1E8", "#A48359"] },
    { id: "terracotta-earth", labelKey: "studio.palette_terracotta_earth", colors: ["#C87B5D", "#E1C39B", "#5D432C"] },
    { id: "charcoal-brass", labelKey: "studio.palette_charcoal_brass", colors: ["#2A2A2A", "#B79561", "#A48359"] },
    { id: "navy-heritage", labelKey: "studio.palette_navy_heritage", colors: ["#264B70", "#B79561", "#EADEC8"] },
    { id: "japandi-pure", labelKey: "studio.palette_japandi_pure", colors: ["#FFFFFF", "#E5E5E5", "#2A2A2A"] },
];

/** The wire format the backend parses. Joined with ';' — do not change. */
const encodePalette = (colors: readonly string[]) => colors.join(";");

/**
 * Advanced — three controls, no prose.
 *
 * <p><b>What came off.</b> The options screen carried quality tier, number of
 * outputs, speed mode, seed, negative prompt and a paragraph under each
 * control. Founder call (2026-09-19): palette, transformation and preserve
 * layout are the three a user actually turns, and the explanations under them
 * were describing controls the picture already describes.
 *
 * <p><b>Number of outputs is gone, not hidden.</b> The store is pinned to 1
 * by the composer, so nothing here can ask for two. The server still accepts
 * a count and its rules still price one — that cleanup is a separate pass,
 * and leaving the field at its default is the safe half to do first.
 *
 * <p>Transformation is plan-gated (allow_strength). A locked slider is shown
 * disabled rather than removed: the control is what the upgrade buys, and a
 * control you cannot see is not an argument for buying it.
 */
export function AdvancedSheet({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();

    const mode = useStudioStore((s) => s.mode);
    const colorPalette = useStudioStore((s) => s.colorPalette);
    const setColorPalette = useStudioStore((s) => s.setColorPalette);
    const strength = useStudioStore((s) => s.strength);
    const setStrength = useStudioStore((s) => s.setStrength);
    const preserveLayout = useStudioStore((s) => s.preserveLayout);
    const setPreserveLayout = useStudioStore((s) => s.setPreserveLayout);

    const { allowed: strengthAllowed } = usePlanPermission("allow_strength");

    // Style Transfer takes its character from the reference photo; a
    // transformation slider on top of it fights the thing the user chose.
    const showStrength = mode !== "STYLE_TRANSFER";
    const percent = Math.round(strength * 100);

    return (
        <BottomSheet heightRatio={0.72} onClose={onClose}>
            <View style={{ flex: 1, paddingTop: 14 }}>
                <View
                    style={{
                        alignSelf: "center",
                        width: 44,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: U.lineNeutral,
                        marginBottom: 18,
                    }}
                />

                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingHorizontal: 20,
                        marginBottom: 20,
                    }}
                >
                    <Text style={{ ...V.displayS, color: U.ink }}>{t("studio.advanced")}</Text>
                    <Pressable
                        onPress={onClose}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel={t("common.close")}
                    >
                        <Text style={{ color: U.inkMuted, fontSize: 22 }}>×</Text>
                    </Pressable>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
                >
                    <SectionLabel>{t("studio.color_palette")}</SectionLabel>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
                        <PaletteChip
                            label={t("studio.palette_none")}
                            colors={null}
                            selected={!colorPalette}
                            onPress={() => setColorPalette("")}
                        />
                        {PALETTE_THEMES.map((p) => {
                            const encoded = encodePalette(p.colors);
                            return (
                                <PaletteChip
                                    key={p.id}
                                    label={t(p.labelKey)}
                                    colors={p.colors}
                                    selected={colorPalette === encoded}
                                    onPress={() => setColorPalette(colorPalette === encoded ? "" : encoded)}
                                />
                            );
                        })}
                    </View>

                    {showStrength && (
                        <>
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "baseline",
                                    justifyContent: "space-between",
                                    marginTop: 26,
                                }}
                            >
                                <SectionLabel style={{ marginBottom: 0 }}>
                                    {t("studio.transformation")}
                                </SectionLabel>
                                <Text
                                    style={{
                                        fontFamily: "Archivo-700",
                                        fontSize: 13,
                                        color: strengthAllowed ? U.accentBright : U.inkMuted,
                                    }}
                                >
                                    {percent}%
                                </Text>
                            </View>
                            <Slider
                                value={strength}
                                onValueChange={setStrength}
                                minimumValue={0.2}
                                maximumValue={1}
                                step={0.05}
                                disabled={!strengthAllowed}
                                minimumTrackTintColor={strengthAllowed ? U.accent : U.lineNeutral}
                                maximumTrackTintColor={U.lineNeutral}
                                thumbTintColor={strengthAllowed ? U.accentBright : U.inkMuted}
                                style={{ marginTop: 6, opacity: strengthAllowed ? 1 : 0.5 }}
                            />
                        </>
                    )}

                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: 26,
                            gap: 12,
                        }}
                    >
                        <Text style={{ ...V.row, color: U.ink, flex: 1 }}>
                            {t("studio.preserve_layout")}
                        </Text>
                        <Toggle value={preserveLayout} onChange={setPreserveLayout} />
                    </View>
                </ScrollView>

                <View style={{ paddingHorizontal: 20, paddingBottom: 28 }}>
                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        style={{
                            height: 56,
                            borderRadius: 16,
                            backgroundColor: U.buttonFill,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text style={{ ...V.button, color: U.buttonInk }}>{t("common.done")}</Text>
                    </Pressable>
                </View>
            </View>
        </BottomSheet>
    );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: object }) {
    return (
        <Text style={{ ...V.kicker, color: U.inkMuted, marginBottom: 12, ...style }}>{children}</Text>
    );
}

/**
 * A palette reads as its three colours; the name is the caption, not the
 * control. "None" carries a diagonal rule instead of swatches so the absence
 * is a visible state rather than an empty chip.
 */
function PaletteChip({
    label,
    colors,
    selected,
    onPress,
}: {
    label: string;
    colors: readonly string[] | null;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            style={{
                width: "31.5%",
                borderRadius: 12,
                borderWidth: selected ? 1.5 : 1,
                borderColor: selected ? U.accent : U.lineNeutral,
                backgroundColor: U.surface,
                padding: 8,
                gap: 7,
            }}
        >
            <View style={{ flexDirection: "row", height: 26, borderRadius: 7, overflow: "hidden" }}>
                {colors ? (
                    colors.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)
                ) : (
                    <View style={{ flex: 1, backgroundColor: U.ground, alignItems: "center", justifyContent: "center" }}>
                        <View
                            style={{
                                width: "70%",
                                height: 1,
                                backgroundColor: U.inkMuted,
                                transform: [{ rotate: "-20deg" }],
                            }}
                        />
                    </View>
                )}
            </View>
            <Text
                style={{ ...V.caption, color: selected ? U.accentBright : U.inkMuted }}
                numberOfLines={1}
            >
                {label}
            </Text>
        </Pressable>
    );
}

/** Same 48 × 28 switch as the result screen's reminder. */
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <Pressable
            onPress={() => onChange(!value)}
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
            hitSlop={10}
            style={{
                width: 48,
                height: 28,
                borderRadius: 14,
                backgroundColor: value ? U.accent : U.lineNeutral,
                justifyContent: "center",
                paddingHorizontal: 3,
            }}
        >
            <View
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: U.ground,
                    alignSelf: value ? "flex-end" : "flex-start",
                }}
            />
        </Pressable>
    );
}
