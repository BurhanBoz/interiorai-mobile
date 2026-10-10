import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { theme } from "@/config/theme";
import { ChevronIcon } from "@/components/settings/SettingsIcons";

const U = theme.umber;
const V = theme.v2;

/**
 * A titled group of settings rows (redesign v3, 2026-10-10).
 *
 * <p>Uppercase muted label above a `sheetSurface` card, radius 16, neutral
 * hairline border; rows 52 pt with hairline separators. The last row draws no
 * separator — the card's own border closes it.
 */
export function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
    return (
        <View style={{ gap: 8 }}>
            <Text style={{ ...V.kicker, color: U.inkMuted, paddingLeft: 4 }} accessibilityRole="header">
                {label}
            </Text>
            <View
                style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: U.lineNeutral,
                    backgroundColor: U.sheetSurface,
                }}
            >
                {children}
            </View>
        </View>
    );
}

export function SettingsRow({
    icon,
    label,
    value,
    chevron,
    last,
    hint,
    onPress,
}: {
    icon: ReactNode;
    label: string;
    value?: string;
    chevron?: boolean;
    last?: boolean;
    hint?: string;
    onPress: () => void;
}) {
    return (
        // 🔴 Static style only — NativeWind drops a `({ pressed }) =>` style.
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={value ? `${label}, ${value}` : label}
            accessibilityHint={hint}
            style={{
                minHeight: 52,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderBottomWidth: last ? 0 : 1,
                borderBottomColor: U.lineNeutral,
            }}
        >
            {icon}
            <Text style={{ ...V.row, color: U.ink, flex: 1 }} numberOfLines={1}>
                {label}
            </Text>
            {value ? (
                <Text style={{ ...V.rowQuiet, color: U.inkMuted }} numberOfLines={1}>
                    {value}
                </Text>
            ) : null}
            {chevron ? <ChevronIcon color={U.inkMuted} /> : null}
        </Pressable>
    );
}
