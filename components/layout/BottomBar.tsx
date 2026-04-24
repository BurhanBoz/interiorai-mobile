import { View, type ViewStyle } from "react-native";
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
const BREATHING = 16;

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
          paddingHorizontal: 24,
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
export const BOTTOM_BAR_SCROLL_PADDING = (overTabBar = true) =>
  (overTabBar
    ? TAB_BAR_VISIBLE_HEIGHT + TAB_BAR_OUTER_PADDING + BREATHING
    : BREATHING) + 72; // 72 ≈ CTA button height + its own paddingTop
