import { FlatList, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "@/config/theme";
import { BottomSheet } from "./BottomSheet";
import { catalogName } from "@/utils/catalogI18n";
import type { CatalogItemResponse } from "@/types/api";

const U = theme.umber;
const V = theme.v2;

/**
 * Correcting the room type — reached from the chip on the photo, never as a
 * gate.
 *
 * <p>In v1 this list was a required step: a red "choose a room type to
 * continue" fired before the user could go anywhere, and it opened a
 * full-screen list of 26 options in which Living Room and Home Office shared
 * a monitor icon. The list is the same data; what changed is that the user
 * arrives here by choice, with an answer already filled in.
 *
 * <p>The icons are gone rather than fixed. Two of them were wrong, none of
 * them carried information the name did not, and a wrong icon is worse than
 * no icon — it tells the user the app has misunderstood the room before they
 * have read a word.
 */
export function RoomTypeSheet({
    items,
    selectedId,
    onSelect,
    onClose,
}: {
    items: CatalogItemResponse[];
    selectedId: string | null;
    onSelect: (item: CatalogItemResponse) => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    return (
        <BottomSheet heightRatio={0.72} onClose={onClose}>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingTop: 18,
                    paddingBottom: 12,
                }}
            >
                <Text style={{ ...V.displayS, color: U.ink }}>{t("studio.room_type")}</Text>
                <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button"
                    accessibilityLabel={t("common.close")}>
                    <Text style={{ color: U.inkMuted, fontSize: 22 }}>×</Text>
                </Pressable>
            </View>

            <FlatList
                data={items}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
                renderItem={({ item }) => {
                    const selected = item.id === selectedId;
                    return (
                        <Pressable
                            onPress={() => onSelect(item)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            style={{
                                paddingVertical: 15,
                                borderBottomWidth: 1,
                                borderBottomColor: U.lineNeutral,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <Text style={{ ...V.row, color: selected ? U.accentBright : U.ink }}>
                                {catalogName(t, "room", item)}
                            </Text>
                            {selected && <Text style={{ color: U.accentBright, fontSize: 15 }}>✓</Text>}
                        </Pressable>
                    );
                }}
            />
        </BottomSheet>
    );
}
