/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#191510",
          dim: "#191510",
          bright: "#3A3124",
          tint: "#DDB477",
          variant: "#332B1E",
          "container-lowest": "#141009",
          "container-low": "#201B15",
          container: "#241F18",
          "container-high": "#2C2519",
          "container-highest": "#332B1E",
        },
        "on-surface": {
          DEFAULT: "#F6F1E7",
          variant: "#CFC4B0",
        },
        background: "#191510",
        "on-background": "#F6F1E7",
        primary: {
          DEFAULT: "#DDB477",
          container: "#DDB477",
          fixed: "#F0CE99",
          "fixed-dim": "#DDB477",
          // Gradient-only tones (for the signature gold)
          "gradient-start": "#F0CE99",
          "gradient-mid": "#DDB477",
          "gradient-end": "#C09B62",
          // Contextual gold variants (golden-hour palette)
          dawn: "#F0CE99",
          midday: "#DDB477",
          dusk: "#C09B62",
        },
        "on-primary": {
          DEFAULT: "#231B10",
          container: "#513D1F",
          fixed: "#281901",
          "fixed-variant": "#584325",
        },
        "inverse-primary": "#715B3A",
        secondary: {
          DEFAULT: "#C8C6C5",
          container: "#474746",
          fixed: "#E4E2E1",
          "fixed-dim": "#C8C6C5",
        },
        "on-secondary": {
          DEFAULT: "#303030",
          container: "#B6B5B4",
          fixed: "#1B1C1C",
          "fixed-variant": "#474746",
        },
        tertiary: {
          DEFAULT: "#CBC7C2",
          container: "#B0ACA7",
          fixed: "#E6E2DD",
          "fixed-dim": "#CAC6C1",
        },
        "on-tertiary": {
          DEFAULT: "#32302D",
          container: "#42403D",
          fixed: "#1D1B19",
          "fixed-variant": "#484643",
        },
        error: {
          DEFAULT: "#FFB4AB",
          container: "#93000A",
        },
        "on-error": {
          DEFAULT: "#690005",
          container: "#FFDAD6",
        },
        // Semantic status tokens (History, generation progress, etc.)
        status: {
          success: "#7BB38A",
          warning: "#E5B567",
          danger: "#D98A7B",
          info: "#8FB3CC",
        },
        outline: {
          DEFAULT: "#9A8F7D",
          variant: "#3D362A",
          // Quieter destructive tone — muted, editorial (replaces salmon #FFB4AB)
          muted: "#9A8F7D",
        },
        "inverse-surface": "#F6F1E7",
        "inverse-on-surface": "#313030",
      },
      fontFamily: {
        // Display + headline voice — used sparingly, max 1x/screen
        headline: ["NotoSerif"],
        "headline-bold": ["NotoSerif-Bold"],
        // Body voice — the system default
        body: ["Inter"],
        "body-medium": ["Inter-Medium"],
        "body-semibold": ["Inter-SemiBold"],
        "body-bold": ["Inter-Bold"],
        // Labels / eyebrows — UPPERCASE tracked
        label: ["Inter-Medium"],
        "label-bold": ["Inter-SemiBold"],
        // Monospace — version strings, job IDs
        mono: ["Courier"],
      },
      // 4px grid system — every spacing value is a multiple of 4
      spacing: {
        "0.5": "2px",
        1: "4px",
        1.5: "6px",
        2: "8px",
        2.5: "10px",
        3: "12px",
        3.5: "14px",
        4: "16px",
        5: "20px",
        6: "24px", // standard content padding
        7: "28px",
        8: "32px", // section gap
        9: "36px",
        10: "40px", // major section
        11: "44px", // iOS HIG minimum tap target
        12: "48px", // hero spacing
        13: "52px",
        14: "56px", // button height
        16: "64px",
        20: "80px",
        24: "96px",
        28: "112px",
        32: "128px",
        36: "144px",
        40: "160px",
      },
      borderRadius: {
        none: "0",
        xs: "4px",
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px", // cards, primary buttons
        "2xl": "20px",
        "3xl": "24px",
        full: "9999px",
      },
      fontSize: {
        // Editorial display voice (NotoSerif)
        "display-xl": ["48px", { lineHeight: "52px", letterSpacing: "-0.5px" }],
        "display-lg": ["40px", { lineHeight: "44px", letterSpacing: "-0.4px" }],
        "display-md": ["32px", { lineHeight: "38px", letterSpacing: "-0.3px" }],
        "headline-lg": ["28px", { lineHeight: "34px", letterSpacing: "-0.2px" }],
        "headline-md": ["22px", { lineHeight: "28px", letterSpacing: "-0.1px" }],
        "title-lg": ["18px", { lineHeight: "24px" }],
        "title-md": ["16px", { lineHeight: "22px" }],
        // Body (Inter)
        "body-lg": ["16px", { lineHeight: "24px" }],
        "body-md": ["15px", { lineHeight: "22px" }],
        "body-sm": ["14px", { lineHeight: "20px" }],
        // Caption + label — sentence case OR uppercase tracked (sparingly)
        "caption-lg": ["13px", { lineHeight: "18px" }],
        "caption-md": ["12px", { lineHeight: "16px" }],
        "caption-sm": ["11px", { lineHeight: "14px" }],
        // Eyebrow labels — UPPERCASE TRACKED, max 1x/screen
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "1.8px" }],
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "1.65px" }],
        "label-xs": ["10px", { lineHeight: "13px", letterSpacing: "1.5px" }],
        // Micro (badges, dense meta)
        "micro-md": ["10px", { lineHeight: "13px", letterSpacing: "1.2px" }],
        "micro-sm": ["9px", { lineHeight: "12px", letterSpacing: "1.8px" }],
      },
      letterSpacing: {
        // Normalized as em-like multiples (per-font computed px values)
        tightest: "-0.5px",
        tighter: "-0.3px",
        tight: "-0.1px",
        normal: "0",
        wide: "0.3px",
        wider: "0.5px",
        widest: "1px",
        // Editorial eyebrow tracks (specific to uppercase labels)
        eyebrow: "1.65px",
        "eyebrow-wide": "2.1px",
      },
      lineHeight: {
        tight: "1.1",
        snug: "1.3",
        normal: "1.5",
        relaxed: "1.6",
        loose: "1.75",
      },
    },
  },
  plugins: [],
};
