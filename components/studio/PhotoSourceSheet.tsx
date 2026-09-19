import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "@/config/theme";
import { BottomSheet } from "./BottomSheet";

const U = theme.umber;
const V = theme.v2;

/**
 * Where the photo comes from — camera or library.
 *
 * <p><b>Why a sheet.</b> The intake row used to spend two of its three
 * columns saying the same thing twice: "Shoot the room" and "Choose a photo"
 * are one decision ("give me a photo") split across two tiles before the user
 * has decided they want to give one at all. Merging them into a single "+"
 * gives that tile room to be the obvious thing on the screen, and moves the
 * camera-or-library question to the moment it actually arises.
 *
 * <p><b>Why the two buttons are not equal.</b> Camera keeps the filled
 * treatment the "Shoot the room" tile had. The product works best on the room
 * the user is standing in — a photographed room is the whole premise — and a
 * library pick is more often a screenshot or a magazine page, which renders
 * badly and teaches the wrong expectation. The library stays one tap away; it
 * is simply not the recommendation.
 *
 * <p>The consent gate lives in {@code useImagePicker}, which both paths go
 * through, so nothing here can send a photo unasked.
 */
export function PhotoSourceSheet({
    onCamera,
    onGallery,
    onClose,
}: {
    onCamera: () => void;
    onGallery: () => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();

    return (
        <BottomSheet onClose={onClose}>
            <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 }}>
                {/* Grab handle — the sheet is draggable-looking because the
                    scrim behind it is tappable; the handle says so. */}
                <View
                    style={{
                        alignSelf: "center",
                        width: 44,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: U.lineNeutral,
                        marginBottom: 20,
                    }}
                />

                <Text style={{ ...V.displayS, color: U.ink, textAlign: "center" }}>
                    {t("studio.photo_source_title")}
                </Text>
                <Text
                    style={{
                        ...V.rowQuiet,
                        color: U.inkMuted,
                        textAlign: "center",
                        marginTop: 8,
                        marginBottom: 24,
                    }}
                >
                    {t("studio.photo_source_body")}
                </Text>

                <SourceButton
                    label={t("studio.camera")}
                    glyph={<CameraGlyph color={U.buttonInk} />}
                    tone="primary"
                    onPress={() => {
                        onClose();
                        onCamera();
                    }}
                />
                <View style={{ height: 10 }} />
                <SourceButton
                    label={t("studio.gallery")}
                    glyph={<LibraryGlyph color={U.accentBright} />}
                    tone="secondary"
                    onPress={() => {
                        onClose();
                        onGallery();
                    }}
                />
            </View>
        </BottomSheet>
    );
}

function SourceButton({
    label,
    glyph,
    tone,
    onPress,
}: {
    label: string;
    glyph: React.ReactNode;
    tone: "primary" | "secondary";
    onPress: () => void;
}) {
    const primary = tone === "primary";
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={{
                height: 56,
                borderRadius: 16,
                backgroundColor: primary ? U.buttonFill : "transparent",
                borderWidth: primary ? 0 : 1,
                borderColor: U.accent,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
            }}
        >
            {glyph}
            <Text
                style={{
                    fontFamily: "Inter-Bold",
                    fontSize: 15,
                    color: primary ? U.buttonInk : U.accentBright,
                }}
                numberOfLines={1}
            >
                {label}
            </Text>
        </Pressable>
    );
}

/* ── glyphs ─────────────────────────────────────────────────────────
 * Drawn rather than imported so they carry the palette's stroke weight
 * and cannot arrive at a different one when an icon set updates.
 */

function CameraGlyph({ color }: { color: string }) {
    return (
        <View
            style={{
                width: 22,
                height: 19,
                borderWidth: 2,
                borderColor: color,
                borderRadius: 5,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <View style={{ width: 7, height: 7, borderRadius: 4, borderWidth: 2, borderColor: color }} />
        </View>
    );
}

function LibraryGlyph({ color }: { color: string }) {
    return (
        <View style={{ width: 22, height: 19 }}>
            <View
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: 16,
                    height: 15,
                    borderWidth: 2,
                    borderColor: color,
                    borderRadius: 4,
                }}
            />
            <View
                style={{
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    width: 16,
                    height: 15,
                    borderWidth: 2,
                    borderColor: color,
                    borderRadius: 4,
                    backgroundColor: "transparent",
                }}
            />
        </View>
    );
}
