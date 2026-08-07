import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { theme } from "@/config/theme";

/**
 * Progressive disclosure for the four generation controls almost nobody
 * changes.
 *
 * <p><b>The problem it solves.</b> Step 3 asked for six decisions —
 * quality, transformation strength, colour palette, output count, layout
 * preservation, custom prompt — and every single one already had the right
 * default. The screen was therefore a wall the user had to walk past on the
 * way to every generation, not a set of choices they wanted to make.
 *
 * <p>Quality and the prompt stay above the fold because they are the two a
 * user genuinely reaches for. The rest live here, one tap away, with their
 * current values summarised in the header so nothing is hidden — only
 * folded.
 *
 * <p>Collapsed state is deliberately NOT persisted: the whole point is that
 * the default answer is right, so every generation should start from the
 * short screen. A user who opens it for one render has not asked to opt out
 * of the simple path forever.
 */

// Android needs this opt-in for LayoutAnimation; harmless elsewhere. iOS is
// the shipping target but the app carries an android/ folder.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Same shell the Quality card uses one row above: page gutter, 24pt inset,
 *  surfaceContainerLow. Matching it is what makes the folded row read as part
 *  of the same form rather than a heading someone forgot to indent. */
const SHELL = {
    marginHorizontal: theme.space.gutter,
    padding: 24,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surfaceContainerLow,
} as const;

interface AdvancedSettingsProps {
    open: boolean;
    onToggle: () => void;
    /** One line of current values, e.g. "70% · Sage Sanctuary · 1 · Layout kept". */
    summary: string;
    children: React.ReactNode;
}

export function AdvancedSettings({ open, onToggle, summary, children }: AdvancedSettingsProps) {
    const { t } = useTranslation();

    const handleToggle = () => {
        Haptics.selectionAsync();
        LayoutAnimation.configureNext(
            LayoutAnimation.create(
                theme.motion.duration.base,
                LayoutAnimation.Types.easeInEaseOut,
                LayoutAnimation.Properties.opacity,
            ),
        );
        onToggle();
    };

    return (
        <View style={{ marginTop: 32 }}>
            {/* The shell lives on a STATIC-styled View, not on the Pressable's
                style callback. Three separate controls in this app carried
                their layout in a `({pressed}) => ({...})` callback and rendered
                without it — this one lost its gutter, padding and surface and
                read as a stray heading at the screen edge (founder screenshots,
                2026-08-07). Whatever swallows the callback (NativeWind v4's JSX
                interop is the prime suspect; it wraps every element here), a
                static object is not subject to it. The Pressable is now purely
                a touch target, which is the pattern FeatureCard already uses
                and the one that visibly works. */}
            <Pressable
                onPress={handleToggle}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={t("studio.advanced_settings")}
            >
                <View style={SHELL}>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={{ ...theme.text.subtitle, color: theme.color.onSurface }}>
                                {t("studio.advanced_settings")}
                            </Text>
                            {/* The summary is what makes folding honest: the values
                                are still on screen, just not as six controls. */}
                            {!open && summary ? (
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        ...theme.text.caption,
                                        color: theme.color.onSurfaceMuted,
                                        marginTop: 3,
                                    }}
                                >
                                    {summary}
                                </Text>
                            ) : null}
                        </View>
                        <Ionicons
                            name={open ? "chevron-up" : "chevron-down"}
                            size={theme.iconSize.md}
                            color={theme.color.goldMidday}
                        />
                    </View>
                </View>
            </Pressable>

            {open ? <View style={{ marginTop: 12 }}>{children}</View> : null}
        </View>
    );
}
