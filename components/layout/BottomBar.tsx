import { View, Dimensions, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { theme } from "@/config/theme";

/**
 * A floating container for primary CTAs that sits fixed at the bottom of
 * the screen without being clipped by the bottom tab bar.
 *
 * Before this component existed, every screen hardcoded something like
 * `paddingBottom: 96` which happened to work on simulators without a home
 * indicator but on iPhone X+ the CTA ended up partially covered by the
 * blurred tab bar pill.
 *
 * The math:
 *   - Tab bar pill visual height ≈ 58px (icon 22 + label 14 + indicator 2
 *     + gaps 8 + vertical padding 24) — matches GlassNavBar.
 *   - Tab bar outer container adds 32px of paddingBottom as a baseline.
 *   - Home indicator on iPhone X+ eats another ~34px (`insets.bottom`).
 *   - Breathing cushion so the CTA doesn't kiss the tab bar: 16px.
 *
 * Pass `overTabBar={false}` on screens that don't render the tab bar
 * (modals, /generation/progress outside the tabs group).
 */

const TAB_BAR_VISIBLE_HEIGHT = 58;
const TAB_BAR_OUTER_PADDING = 32;
// 2026-07-15 founder pass: 16px still read as "glued" under the tab
// Air between a fixed CTA and whatever sits under it (tab bar or home
// indicator). 24pt was measured too tight on the wizard steps: the button
// looked welded to the tab bar (founder screenshot, 2026-08-07).
//
// Responsive on purpose. A fixed 32 that breathes on a 6.7" screen eats a
// meaningful slice of an iPhone SE, where vertical space is the scarce
// resource — so the gap scales with the screen and is then clamped, which
// keeps small phones usable and stops tall ones from looking gappy.
const BREATHING = Math.round(
  Math.min(40, Math.max(28, Dimensions.get("window").height * 0.042)),
);

interface BottomBarProps {
  children: ReactNode;
  /** Set to false on screens without the bottom tab bar. Default: true. */
  overTabBar?: boolean;
  /**
   * Render a soft gradient backdrop that fades from transparent into the
   * surface color. Helps content stop "bleeding" behind the CTA when the
   * user scrolls to the end of the list.
   */
  backdrop?: boolean;
  style?: ViewStyle;
}

export function BottomBar({
  children,
  overTabBar = true,
  backdrop = true,
  style,
}: BottomBarProps) {
  const insets = useSafeAreaInsets();

  const bottomOffset = overTabBar
    ? TAB_BAR_VISIBLE_HEIGHT + TAB_BAR_OUTER_PADDING + BREATHING
    : insets.bottom + BREATHING;

  return (
    <View
      pointerEvents="box-none"
      style={[
        {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingTop: 24,
          paddingHorizontal: theme.space.gutter,
          paddingBottom: bottomOffset,
        },
        style,
      ]}
    >
      {backdrop ? (
        <LinearGradient
          colors={["rgba(19,19,19,0)", "rgba(19,19,19,0.92)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.4 }}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      ) : null}
      <View pointerEvents="box-none">{children}</View>
    </View>
  );
}

/**
 * The amount of empty space a ScrollView should reserve at the bottom
 * when a BottomBar overlays it. Add this to `contentContainerStyle.paddingBottom`
 * so the last row of content doesn't get trapped behind the floating CTA.
 */
export const BOTTOM_BAR_SCROLL_PADDING = (
  overTabBar = true,
  /**
   * Height of what the bar actually renders. The default covers a lone
   * CTA button; pass the real figure when the bar carries more — Options
   * stacks a summary strip above its button, and reserving for a button
   * alone left the last control trapped underneath it.
   */
  barContentHeight = 72,
) =>
  (overTabBar
    ? TAB_BAR_VISIBLE_HEIGHT + TAB_BAR_OUTER_PADDING + BREATHING
    : BREATHING) +
  barContentHeight +
  24; // the bar's own paddingTop
