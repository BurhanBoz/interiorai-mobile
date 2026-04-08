/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#131313",
          dim: "#131313",
          bright: "#393939",
          tint: "#E0C29A",
          variant: "#353534",
          "container-lowest": "#0E0E0E",
          "container-low": "#1C1B1B",
          container: "#201F1F",
          "container-high": "#2A2A2A",
          "container-highest": "#353534",
        },
        "on-surface": {
          DEFAULT: "#E5E2E1",
          variant: "#D0C5B8",
        },
        background: "#131313",
        "on-background": "#E5E2E1",
        primary: {
          DEFAULT: "#E1C39B",
          container: "#C4A882",
          fixed: "#FDDEB5",
          "fixed-dim": "#E0C29A",
        },
        "on-primary": {
          DEFAULT: "#3F2D11",
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
        outline: {
          DEFAULT: "#998F84",
          variant: "#4D463C",
        },
        "inverse-surface": "#E5E2E1",
        "inverse-on-surface": "#313030",
      },
      fontFamily: {
        headline: ["NotoSerif"],
        body: ["Inter"],
        label: ["Inter"],
      },
      borderRadius: {
        DEFAULT: "4px",
        lg: "8px",
        xl: "12px",
        full: "9999px",
      },
      fontSize: {
        "display-lg": ["56px", { lineHeight: "1.1", fontFamily: "NotoSerif" }],
        "headline-md": ["28px", { lineHeight: "1.3", fontFamily: "NotoSerif" }],
        "title-md": ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "1.6" }],
        "label-sm": [
          "11px",
          {
            lineHeight: "1.4",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          },
        ],
      },
    },
  },
  plugins: [],
};
