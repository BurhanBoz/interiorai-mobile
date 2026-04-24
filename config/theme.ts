/**
 * Design tokens — the single source of truth for cross-component values
 * that can't be expressed in Tailwind classes alone (shadows, motion
 * durations, icon sizes, animated gradients).
 *
 * Usage:
 *   import { theme } from "@/config/theme";
 *   <View style={theme.elevation.md} />
 *   Animated.timing(v, { duration: theme.motion.base, ... })
 *
 * Rule: if you catch yourself typing a raw hex / duration / px value in a
 * component file, add it here first and reference the token. Discipline is
 * what separates "premium concept" from "premium execution".
 */

import { Easing } from "react-native";

/* ───── Color aliases ───── */
export const color = {
  // Neutral surface stack (matches tailwind.config.js)
  surface: "#131313",
  surfaceContainer: "#201F1F",
  surfaceContainerLow: "#1C1B1B",
  surfaceContainerHigh: "#2A2A2A",
  surfaceContainerHighest: "#353534",

  // Gold / primary palette — always reference this
  goldDawn: "#FDDEB5",
  goldMidday: "#E1C39B",
  goldContainer: "#C4A882",
  goldDusk: "#A68A62",
  onGold: "#3F2D11",

  // Text
  onSurface: "#E5E2E1",
  onSurfaceVariant: "#D0C5B8",
  onSurfaceMuted: "#998F84",

  // Semantic
  success: "#7BB38A",
  warning: "#E5B567",
  danger: "#D98A7B",
  info: "#8FB3CC",

  // Outline / dividers
  outline: "#998F84",
  outlineVariant: "#4D463C",
  divider: "rgba(77,70,60,0.35)",

  // Overlays
  scrim: "rgba(19,19,19,0.82)",
  scrimSoft: "rgba(19,19,19,0.55)",
} as const;

/* ───── Signature gradients ───── */
export const gradient = {
  // Primary CTA — warm gold, golden-hour feel
  primary: [color.goldDawn, color.goldMidday] as const,
  primaryDeep: [color.goldContainer, color.goldDusk] as const,
  // Shimmer / loading — subtle gold wash
  shimmer: [
    "rgba(225,195,155,0)",
    "rgba(225,195,155,0.14)",
    "rgba(225,195,155,0)",
  ] as const,
  // Card border — diagonal gold-to-transparent
  cardBorder: [
    "rgba(225,195,155,0.28)",
    "rgba(225,195,155,0.06)",
  ] as const,
  // Image caption overlay — darkens the bottom of gallery tiles
  imageCaption: [
    "rgba(19,19,19,0)",
    "rgba(19,19,19,0.75)",
  ] as const,
  // Destructive — quieter than iOS red for our editorial tone
  destructive: ["#7A4B42", "#552E28"] as const,
} as const;

/* ───── Elevation / shadow scale ───── */
export const elevation = {
  none: {},
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  // Gold-tinted glow for focused/hovered gold elements
  goldGlow: {
    shadowColor: color.goldDawn,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 0,
  },
  goldGlowSoft: {
    shadowColor: color.goldMidday,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 0,
  },
} as const;

/* ───── Motion tokens ─────
 * One signature timing across the app so every screen transition,
 * press feedback, and reveal feels part of the same product.
 */
export const motion = {
  duration: {
    instant: 80,
    fast: 160,
    base: 240,
    slow: 360,
    glacial: 560,
  },
  stagger: {
    // Delay between sibling reveals on screen mount (header → hero → CTA)
    base: 80,
    comfortable: 120,
  },
  easing: {
    // Signature: material standard (similar to iOS default)
    standard: Easing.bezier(0.4, 0, 0.2, 1),
    // Exits — faster deceleration
    exit: Easing.bezier(0.4, 0, 1, 1),
    // Entrances — slower start, smooth land
    enter: Easing.bezier(0, 0, 0.2, 1),
    // Bouncy — for emphasis moments (purchase success, tier upgrade)
    emphasize: Easing.bezier(0.2, 0, 0, 1),
  },
  spring: {
    // Drawer, bottom sheet — firm but not stiff
    drawer: { damping: 24, stiffness: 220 } as const,
    // Toggle, chip select — snappy
    snappy: { damping: 16, stiffness: 320 } as const,
    // Gentle — count-ups, card morphs
    gentle: { damping: 20, stiffness: 160 } as const,
  },
} as const;

/* ───── Icon sizes ───── */
export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  "2xl": 40,
} as const;

/* ───── Tap targets ───── */
export const tapTarget = {
  // iOS HIG minimum
  min: 44,
  comfortable: 48,
} as const;

/* ───── Typographic mixins ─────
 * Inline style helpers that bundle fontFamily + fontSize + lineHeight + tracking
 * for any component that can't reach into Tailwind classes (e.g. animated text).
 */
export const text = {
  displayXl: {
    fontFamily: "NotoSerif-Bold",
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -0.5,
  },
  displayLg: {
    fontFamily: "NotoSerif-Bold",
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.4,
  },
  displayMd: {
    fontFamily: "NotoSerif",
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  headlineLg: {
    fontFamily: "NotoSerif",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.2,
  },
  headlineMd: {
    fontFamily: "NotoSerif",
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.1,
  },
  titleLg: {
    fontFamily: "Inter-SemiBold",
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  titleMd: {
    fontFamily: "Inter-SemiBold",
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  bodyLg: {
    fontFamily: "Inter",
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: "Inter",
    fontSize: 15,
    lineHeight: 22,
  },
  bodySm: {
    fontFamily: "Inter",
    fontSize: 14,
    lineHeight: 20,
  },
  captionMd: {
    fontFamily: "Inter",
    fontSize: 12,
    lineHeight: 16,
  },
  captionSm: {
    fontFamily: "Inter",
    fontSize: 11,
    lineHeight: 14,
  },
  labelMd: {
    fontFamily: "Inter-SemiBold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.8,
    textTransform: "uppercase" as const,
  },
  labelSm: {
    fontFamily: "Inter-SemiBold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.65,
    textTransform: "uppercase" as const,
  },
  microMd: {
    fontFamily: "Inter-SemiBold",
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  microSm: {
    fontFamily: "Inter-SemiBold",
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.8,
    textTransform: "uppercase" as const,
  },
} as const;

export const theme = {
  color,
  gradient,
  elevation,
  motion,
  iconSize,
  tapTarget,
  text,
} as const;

export type Theme = typeof theme;
