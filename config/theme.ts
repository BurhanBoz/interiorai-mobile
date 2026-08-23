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

/* ───── Corner radii ─────
 * Four steps, nothing else. The audit (2026-08-07) counted FOURTEEN distinct
 * radii in use — 8/10/12/14/16/18/20/22/24 all appearing within a few screens
 * of each other. The eye cannot name that difference but it reads it as
 * hand-made rather than designed, which is the opposite of the brief.
 *
 * Mapping is gentle and upward (softer, never sharper):
 *   8,10,12 → sm · 14,16,18 → md · 20,22,24 → lg · 999,9999 → pill
 *
 * Hairline values (1–4) are deliberately NOT in the scale: they belong to
 * progress bars and stroke caps, not to surfaces, and rounding those to 10
 * would visibly deform them.
 */
export const radius = {
  /** Chips, inputs, small controls. */
  sm: 10,
  /** Elements inside a card — thumbnails, inline media, nested tiles. */
  md: 16,
  /** Cards, sheets, modals — the product's signature softness. */
  lg: 22,
  /** Fully round: pills, avatars, badges. */
  pill: 999,
} as const;

/* ───── Spacing ─────
 * The page gutter is the single most visible consistency tell: when it
 * changes between screens, content shifts sideways during navigation. The
 * audit found seven different values, including a lone `paddingHorizontal: 25`
 * that is plainly a typo — and looked exactly like one.
 */
export const space = {
  /** THE page gutter. Every screen's horizontal padding is this value. */
  gutter: 24,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
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

/* ───── Type scale ─────
 * EIGHT steps. Not nine, not sixteen. Every piece of text in the app resolves
 * to one of these, and a raw `fontSize:` in a component file is a bug.
 *
 * ── Why this was rewritten (audit 2026-08-07) ──
 * The previous scale had sixteen steps and **zero** references: `theme.text.*`
 * appeared nowhere in 46 screens. Components carried 447 hand-written
 * `fontSize` values across 24 distinct sizes — including 9.5, 12.5 and 14.5,
 * which exist in no design system anywhere and are simply someone nudging a
 * number until it looked right. The same role rendered at five different
 * sizes: the screen title was 36pt in review, 34 in upload, 32 in studio, 30
 * in options, 28 in onboarding. Nobody can name that difference; everybody
 * feels it, as "hand-made" rather than "designed".
 *
 * ── How the anchors were chosen ──
 * Each step sits at the median of an observed cluster, then rounds DOWN.
 * Downward is deliberate: shrinking text can never introduce a new line wrap,
 * so the migration cannot break a layout it wasn't already breaking. It also
 * serves the compactness half of the brief. The single exception is `caption`,
 * which pulls 9–11pt body copy UP to 12 — the audit found 48% of all text at
 * or below 12.5pt, and sub-12 sentence-case copy is where "dense" comes from.
 *
 * ── Two voices ──
 * NotoSerif carries the editorial voice (hero → title). Inter carries the UI
 * voice (subtitle → label). A step's family is part of the step: overriding
 * `fontFamily` next to one of these spreads re-opens the exact drift this
 * scale closes.
 *
 * ── Tracking ──
 * Only `label` is tracked, and at 1.4 rather than the old 1.65–2.0. Wide
 * tracking on 9pt uppercase reads as an airline boarding pass; the brief is
 * a design magazine.
 *
 * Usage — spread it, never copy values out of it:
 *   <Text style={{ ...theme.text.body, color: theme.color.onSurfaceVariant }}>
 */
export const text = {
  /** Hero numerals and landing statements. One per screen, at most. */
  hero: {
    fontFamily: "NotoSerif",
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  /** Screen title. Absorbs the old 28/30/32/34/36 spread. */
  display: {
    fontFamily: "NotoSerif",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  /** Section heading within a screen. Absorbs 20/21/22/24/26. */
  headline: {
    fontFamily: "NotoSerif",
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  /** Card title in the editorial voice — the FeatureCard register. 17/18/19. */
  title: {
    fontFamily: "NotoSerif",
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.1,
  },
  /** Emphasised UI text: list-row titles, field labels, button-adjacent. 15–18 sans. */
  subtitle: {
    fontFamily: "Inter-SemiBold",
    fontSize: 15,
    lineHeight: 21,
  },
  /** Primary body copy. Line-height is generous on purpose — that IS "soft". */
  body: {
    fontFamily: "Inter",
    fontSize: 14,
    lineHeight: 21,
  },
  /** Secondary copy, helper text, metadata. The floor for sentence case. */
  caption: {
    fontFamily: "Inter",
    fontSize: 12,
    lineHeight: 17,
  },
  /** THE uppercase label. If a second uppercase style appears, delete it. */
  label: {
    fontFamily: "Inter-SemiBold",
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
} as const;

export const theme = {
  color,
  gradient,
  elevation,
  motion,
  radius,
  space,
  iconSize,
  tapTarget,
  text,
} as const;

export type Theme = typeof theme;
