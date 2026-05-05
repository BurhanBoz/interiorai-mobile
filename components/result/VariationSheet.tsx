import { useState, useEffect, useRef } from "react";
import {
    Modal,
    View,
    Text,
    Pressable,
    Alert,
    Animated,
    Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { createVariation, type VariationStrength } from "@/services/jobs";
import { useCreditStore } from "@/stores/creditStore";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

interface VariationSheetProps {
    visible: boolean;
    onClose: () => void;
    sourceJobId: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Variation picker — Result screen ↻ button (V20 / Pricing Strategy V2 §4).
 *
 * <h3>Visual contract</h3>
 *
 * <p>Bottom-sheet modal with translucent backdrop. The sheet keeps the
 * result image partially visible behind it, framing variation as
 * "refining the thing you're looking at" rather than navigating away.
 *
 * <p>Card layout follows the founder-approved screenshot reference:
 * <ul>
 *   <li>Large uppercase serif title ("TRY ANOTHER VERSION") with wide
 *       letter-spacing — the "decision moment" header.</li>
 *   <li>Quiet sans-serif subtitle below.</li>
 *   <li>Three cards stacked vertically, each with an outlined icon on
 *       the left and uppercase serif title + descriptive copy on the
 *       right. Selected card carries a 1px gold border + checkmark.</li>
 *   <li>Diamond-icon eyebrow ("1 CREDIT") above the gradient gold CTA.</li>
 * </ul>
 *
 * <h3>Why this layout works</h3>
 *
 * <p>v1 used icon-only cards which forced users to read description
 * text to grok the difference. v2 added intensity dots but those were
 * judged too utilitarian for a premium picker. v3 (this) keeps the
 * iconography expressive (leaf / sparkles / droplet) and lets the
 * copy do the explaining: each preset's hint is a single short line
 * that resolves "what does this actually do?" in one read.
 */
export function VariationSheet({ visible, onClose, sourceJobId }: VariationSheetProps) {
    const { t } = useTranslation();
    const balance = useCreditStore((s) => s.balance);
    const [selected, setSelected] = useState<VariationStrength>("BOLD");
    const [submitting, setSubmitting] = useState(false);

    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 320,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 240,
                useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const VARIATION_COST = 1;
    const insufficientCredits = balance < VARIATION_COST;

    const handleGenerate = async () => {
        if (insufficientCredits) {
            handleClose();
            setTimeout(() => router.push("/credits-exhausted"), 250);
            return;
        }
        setSubmitting(true);
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const job = await createVariation(sourceJobId, selected);
            handleClose();
            setSelected("BOLD");
            setTimeout(() => {
                router.push(`/generation/progress?jobId=${job.id}` as never);
            }, 280);
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            const msg =
                status === 402
                    ? t("studio.insufficient_credits")
                    : status === 429
                        ? t("errors.rate_limit")
                        : t("errors.generic");
            Alert.alert(t("generation.failed"), msg);
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Preset definitions. Icons chosen to communicate intensity at a
     * glance:
     *   • leaf — quiet, organic refinement (Subtle)
     *   • sparkles — magic-touch transformation (Bold)
     *   • water — fluid, unpredictable interpretation (Wild)
     */
    const presets: ReadonlyArray<{
        key: VariationStrength;
        titleKey: string;
        hintKey: string;
        icon: "leaf-outline" | "sparkles-outline" | "water-outline";
    }> = [
        { key: "SUBTLE", titleKey: "result.variation_subtle_title", hintKey: "result.variation_subtle_hint", icon: "leaf-outline" },
        { key: "BOLD",   titleKey: "result.variation_bold_title",   hintKey: "result.variation_bold_hint",   icon: "sparkles-outline" },
        { key: "WILD",   titleKey: "result.variation_wild_title",   hintKey: "result.variation_wild_hint",   icon: "water-outline" },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            {/* Backdrop — tap to dismiss */}
            <Animated.View
                style={{
                    flex: 1,
                    backgroundColor: "#000",
                    opacity: backdropAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 0.55],
                    }),
                }}
            >
                <Pressable style={{ flex: 1 }} onPress={handleClose} />
            </Animated.View>

            {/* Sheet body — slides up from below, rounded top */}
            <Animated.View
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    transform: [{ translateY: slideAnim }],
                }}
            >
                <Pressable onPress={() => {}}>
                    <View
                        style={{
                            backgroundColor: "#111111",
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            paddingTop: 10,
                            paddingBottom: 28,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: -8 },
                            shadowOpacity: 0.5,
                            shadowRadius: 24,
                            elevation: 24,
                            borderTopWidth: 1,
                            borderTopColor: "rgba(225,195,155,0.12)",
                        }}
                    >
                        {/* Drag handle */}
                        <View style={{ alignItems: "center", marginBottom: 18 }}>
                            <View
                                style={{
                                    width: 40,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: "rgba(225,195,155,0.22)",
                                }}
                            />
                        </View>

                        {/* Header — large uppercase serif title with wide
                            letter-spacing, sub-line below. Centred to
                            match the screenshot's editorial feel. The
                            title naturally wraps to two lines because of
                            the wide tracking — that's intentional, gives
                            the picker its "decision moment" gravity. */}
                        <View style={{ paddingHorizontal: 24, marginBottom: 22 }}>
                            <Text
                                style={{
                                    fontSize: 26,
                                    lineHeight: 36,
                                    fontWeight: "700",
                                    color: "#E5E2E1",
                                    fontFamily: "NotoSerif",
                                    textAlign: "center",
                                    letterSpacing: 4,
                                    textTransform: "uppercase",
                                }}
                            >
                                {t("result.variation_sheet_title")}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: "rgba(208,197,184,0.58)",
                                    textAlign: "center",
                                    marginTop: 10,
                                    letterSpacing: 0.2,
                                    fontFamily: "Inter",
                                }}
                            >
                                {t("result.variation_sheet_subtitle")}
                            </Text>
                        </View>

                        {/* Preset cards — three-row structural layout.
                            Each card composes:
                              ┌─────────────────────────────────────┐
                              │                                     │
                              │   [ICON]   TITLE (header, ↑ space)  │
                              │   large    description (↓ space)    │
                              │                                     │
                              └─────────────────────────────────────┘
                            • Icon — large outlined glyph on the left,
                              centred vertically against the text column
                            • Title — uppercase serif header, room to
                              breathe between it and the description
                            • Description — sans-serif subline below
                            • Soft gold border around EVERY card (not
                              just the selected one) so the trio reads
                              as a unified premium tier; selected card
                              upgrades to a brighter, slightly thicker
                              gold + glow.
                            • Spacious 24px gap between icon and the
                              text column gives the icon "room" instead
                              of crowding the header. */}
                        {/*
                         * Cards — faithful React Native port of the Stitch HTML:
                         *
                         * Unselected:
                         *   bg: #1C1B1B (surface-container-low) — lifts off the
                         *       #0E0E0E sheet so the card reads as a distinct
                         *       surface without needing a heavy stroke.
                         *   border: rgba(77,70,60,0.45) — ghost-border (outline-
                         *       variant) bumped from 20% to 45% for mobile where
                         *       the "felt but not seen" threshold is higher.
                         *
                         * Selected:
                         *   bg: #2A2A2A (surface-container-high) — one level up.
                         *   border: #E1C39B solid — gold-border, exact Stitch value.
                         *   scale: 1.015 — matches HTML's scale-[1.02] dialled
                         *       down slightly for native feel.
                         *   checkmark: position absolute top/right, filled circle.
                         *
                         * Layout: flexDirection row, alignItems flex-start (items-start),
                         *   gap 20 (gap-5 = 20px). Icon column has paddingTop 2 (mt-1).
                         *   Text column paddingRight 36 when selected to clear checkmark.
                         */}
                        <View style={{ paddingHorizontal: 20 }}>
                            {presets.map((preset, index) => {
                                const isSelected = selected === preset.key;
                                const isLast = index === presets.length - 1;
                                return (
                                    <View key={preset.key}>
                                    <Pressable
                                        key={`p_${preset.key}`}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setSelected(preset.key);
                                        }}
                                        style={({ pressed }) => ({
                                            padding: 20,
                                            borderRadius: 12,
                                            backgroundColor: isSelected ? "#2A2A2A" : "#1C1B1B",
                                            borderWidth: 1,
                                            borderColor: isSelected
                                                ? "#E1C39B"
                                                : "rgba(77, 70, 60, 0.45)",
                                            flexDirection: "row",
                                            alignItems: "flex-start",
                                            gap: 20,
                                            transform: [
                                                { scale: pressed ? 0.982 : isSelected ? 1.015 : 1 },
                                            ],
                                            ...(isSelected && {
                                                shadowColor: "#000",
                                                shadowOffset: { width: 0, height: 8 },
                                                shadowOpacity: 0.5,
                                                shadowRadius: 20,
                                                elevation: 8,
                                            }),
                                        })}
                                    >
                                        {/* Icon — paddingTop 2 matches HTML's mt-1,
                                            aligning the glyph baseline with the
                                            NotoSerif title cap-height. */}
                                        <View style={{ paddingTop: 2 }}>
                                            <Ionicons
                                                name={preset.icon}
                                                size={28}
                                                color={isSelected ? "#E1C39B" : "#D1C5B8"}
                                            />
                                        </View>

                                        {/* Text column — paddingRight clears
                                            the absolute-positioned checkmark. */}
                                        <View
                                            style={{
                                                flex: 1,
                                                paddingRight: isSelected ? 32 : 0,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontFamily: "NotoSerif",
                                                    fontSize: 16,
                                                    fontWeight: isSelected ? "600" : "400",
                                                    letterSpacing: 2.4,
                                                    textTransform: "uppercase",
                                                    color: isSelected ? "#E1C39B" : "#E5E2E1",
                                                    marginBottom: 6,
                                                }}
                                            >
                                                {t(preset.titleKey)}
                                            </Text>
                                            <Text
                                                style={{
                                                    fontFamily: "Inter",
                                                    fontSize: 13,
                                                    lineHeight: 19,
                                                    color: isSelected
                                                        ? "#D1C5B8"
                                                        : "rgba(209,197,184,0.75)",
                                                }}
                                                numberOfLines={2}
                                            >
                                                {t(preset.hintKey)}
                                            </Text>
                                        </View>

                                        {/* Checkmark — absolute top-right,
                                            mirrors HTML's absolute top-6 right-6.
                                            Only rendered when selected. */}
                                        {isSelected && (
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={22}
                                                color="#E1C39B"
                                                style={{
                                                    position: "absolute",
                                                    top: 20,
                                                    right: 20,
                                                }}
                                            />
                                        )}
                                    </Pressable>

                                    {/* Gold divider between cards — renders
                                        only between items, never after the last.
                                        Horizontal inset (marginHorizontal 14)
                                        keeps the line within the card visual
                                        column, avoiding full-bleed feel. */}
                                    {!isLast && (
                                        <View
                                            style={{
                                                height: 1,
                                                backgroundColor: "rgba(225,195,155,0.2)",
                                                marginHorizontal: 14,
                                            }}
                                        />
                                    )}
                                    </View>
                                );
                            })}
                        </View>

                        {/* Cost eyebrow + Generate CTA. The CTA delegates
                            to PrimaryButton — the same canonical component
                            that ships every other "primary" gold gradient
                            in the app (Studio's "Continue to Architecture",
                            "Confirm & Subscribe", etc.). Hand-rolled
                            gradients here drift from the spec over time;
                            using the component keeps every primary CTA
                            visually identical. Insufficient-credit state
                            renders a muted disabled button instead. */}
                        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    marginBottom: 14,
                                }}
                            >
                                <Ionicons
                                    name="diamond-outline"
                                    size={14}
                                    color={insufficientCredits ? "#FFB4AB" : "#E0C29A"}
                                />
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: insufficientCredits ? "#FFB4AB" : "#E0C29A",
                                        letterSpacing: 1.6,
                                        textTransform: "uppercase",
                                        fontFamily: "Inter-SemiBold",
                                        fontWeight: "700",
                                    }}
                                >
                                    {t("result.variation_cost")}
                                </Text>
                            </View>

                            <PrimaryButton
                                label={t("result.variation_cta")}
                                onPress={handleGenerate}
                                loading={submitting}
                                disabled={insufficientCredits}
                            />
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        </Modal>
    );
}
