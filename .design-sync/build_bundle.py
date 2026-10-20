#!/usr/bin/env python3
"""Roomframe → Claude Design: tokens-only design-system bundle (off-script, 2026-10-10).

The app is React Native (NativeWind); Claude Design renders web React, so no component can
ship as the real compiled code. Per the owner's choice this bundle carries the brand: colour,
type, spacing, radius, elevation, gradient and motion tokens from config/theme.ts and
tailwind.config.js, the app's own font files, the conventions header, guidelines and current
screen references. _ds_bundle.js is the empty-bodied tokens-only form. No lookalike components.

Run from interiorai-mobile/:  python3 .design-sync/build_bundle.py   → ./ds-bundle
Values below are copied from config/theme.ts (umber + v2 + legacy aliases) — change them there
first, then here.
"""
import json, pathlib, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "ds-bundle"
DS = ROOT / ".design-sync"

if OUT.exists():
    shutil.rmtree(OUT)
for d in ("tokens", "fonts", "guidelines/reference", "_vendor", "_preview", "components"):
    (OUT / d).mkdir(parents=True, exist_ok=True)

# ── fonts ──────────────────────────────────────────────────────────────────
FONTS = [  # (file, family, weight, style)
    ("NotoSerif-Regular.ttf", "Noto Serif", 400, "normal"),
    ("NotoSerif-Bold.ttf", "Noto Serif", 700, "normal"),
    ("Inter-Regular.ttf", "Inter", 400, "normal"),
    ("Inter-Medium.ttf", "Inter", 500, "normal"),
    ("Inter-SemiBold.ttf", "Inter", 600, "normal"),
    ("Inter-Bold.ttf", "Inter", 700, "normal"),
    ("Archivo-400.ttf", "Archivo", 400, "normal"),
    ("Archivo-500.ttf", "Archivo", 500, "normal"),
    ("Archivo-600.ttf", "Archivo", 600, "normal"),
    ("Archivo-700.ttf", "Archivo", 700, "normal"),
    ("InstrumentSerif-Regular.ttf", "Instrument Serif", 400, "normal"),
    ("InstrumentSerif-Italic.ttf", "Instrument Serif", 400, "italic"),
]
faces = []
for f, fam, w, st in FONTS:
    shutil.copy(ROOT / "assets/fonts" / f, OUT / "fonts" / f)
    faces.append(f'@font-face {{ font-family: "{fam}"; src: url("./{f}") format("truetype"); '
                 f'font-weight: {w}; font-style: {st}; font-display: swap; }}')
(OUT / "fonts/fonts.css").write_text("/* Roomframe's bundled fonts — the same files the iOS app ships (assets/fonts). */\n" + "\n".join(faces) + "\n")

# ── tokens ─────────────────────────────────────────────────────────────────
colors = """/* Colour — Umber palette (config/theme.ts `umber`, 2026-09-19; lifted ground 2026-10-14 build 116, synced 2026-10-20). Dark-only product: there is no light theme. */
:root {
  /* Grounds and surfaces, darkest to lightest */
  --rf-ground: #221C17;                 /* every screen's background (build 116: lifted from #191510) */
  --rf-surface-lowest: #1A1510;
  --rf-sheet: #28221C;                  /* bottom sheets, low containers */
  --rf-surface: #2C261F;                /* cards, tiles, plan rows */
  --rf-surface-high: #342C23;
  --rf-surface-highest: #3B3228;
  --rf-surface-bright: #44392D;

  /* Ink */
  --rf-ink: #F1EADF;                    /* primary text */
  --rf-ink-variant: #CFC4B0;            /* secondary text on cards */
  --rf-ink-muted: #A89D8B;              /* captions, metadata, inactive tabs */

  /* Gold accent — golden-hour, never neon */
  --rf-gold-dawn: #EFD0A0;              /* bright gold: gradient start, active icons */
  --rf-gold: #DDB477;                   /* the accent: selected borders, links, kickers */
  --rf-gold-dusk: #C09B62;              /* gradient end */
  --rf-button-fill: #E2C08E;            /* solid primary button */
  --rf-on-gold: #231B10;                /* text/icons ON gold — always this, never white */

  /* Lines */
  --rf-line-accent: rgba(221,180,119,0.16);
  --rf-line-neutral: rgba(246,241,231,0.12);
  --rf-outline: #9A8F7D;
  --rf-outline-variant: #3D362A;

  /* Over photography */
  --rf-photo-chrome: rgba(14,13,12,0.70);         /* pills/chips laid on a room photo */
  --rf-photo-chrome-border: rgba(255,255,255,0.20);
  --rf-scrim: rgba(34,28,23,0.50);
  --rf-sheet-scrim: rgba(0,0,0,0.55);
  --rf-product-plate: #F6F1E7;                    /* light plate behind furniture cut-outs */

  /* Semantic — belong to the state, not the brand */
  --rf-success: #7BB38A;
  --rf-warning: #E5B567;
  --rf-danger: #D98A7B;
  --rf-info: #8FB3CC;
}
"""
typography = """/* Type — Noto Serif for the editorial voice, Inter for UI (config/theme.ts `v2` + `text`). */
:root {
  --rf-font-display: "Noto Serif", Georgia, serif;
  --rf-font-ui: "Inter", -apple-system, "Segoe UI", sans-serif;
  --rf-font-accent: "Instrument Serif", Georgia, serif;   /* rare italic accents only */

  /* Display — Noto Serif, sentence case, slight negative tracking */
  --rf-display-xl: 400 44px/45px var(--rf-font-display);   /* onboarding headline;   tracking -0.6px */
  --rf-display-l: 400 36px/38px var(--rf-font-display);    /* paywall headline;      tracking -0.4px */
  --rf-display-m: 400 34px/38px var(--rf-font-display);    /* gallery title;         tracking -0.3px */
  --rf-display-s: 400 26px/30px var(--rf-font-display);    /* section/sheet titles;  tracking -0.2px */
  --rf-price: 400 28px/30px var(--rf-font-display);        /* prices */
  --rf-display-xs: 400 20px/25px var(--rf-font-display);
  --rf-title: 400 17px/23px var(--rf-font-display);        /* card titles */

  /* UI — Inter */
  --rf-body: 400 16px/23px var(--rf-font-ui);              /* onboarding/marketing body */
  --rf-body-s: 400 14px/21px var(--rf-font-ui);            /* in-app body copy */
  --rf-row: 600 13px/18px var(--rf-font-ui);               /* list rows, chips, style labels */
  --rf-row-quiet: 400 12.5px/17px var(--rf-font-ui);
  --rf-tile: 700 12.5px/16px var(--rf-font-ui);            /* feature tile labels */
  --rf-caption: 400 11px/15px var(--rf-font-ui);           /* 10.5px is the floor; nothing smaller */
  --rf-caption-strong: 600 10.5px/14px var(--rf-font-ui);

  /* Uppercase labels — the only uppercase styles; pair with their tracking */
  --rf-button: 700 15px/20px var(--rf-font-ui);            /* tracking 1.4px, uppercase */
  --rf-tier: 700 12px/16px var(--rf-font-ui);              /* plan tier: tracking 1.6px, uppercase */
  --rf-kicker: 600 11.5px/15px var(--rf-font-ui);          /* screen kicker: tracking 2.2px, uppercase */
  --rf-brand: 600 11.5px/15px var(--rf-font-ui);           /* "ROOMFRAME" lockup: tracking 2.6px */
  --rf-track-button: 1.4px;
  --rf-track-tier: 1.6px;
  --rf-track-kicker: 2.2px;
  --rf-track-brand: 2.6px;
}
"""
layout = """/* Layout — iPhone, points = px (config/theme.ts `space`, `v2Layout`, `tapTarget`). */
:root {
  --rf-screen-w: 390px;
  --rf-status-bar: 52px;
  --rf-tab-bar: 78px;
  --rf-gutter: 20px;          /* v2 screens' side padding (legacy screens 24px) */
  --rf-gutter-narrow: 18px;

  --rf-space-xs: 4px;  --rf-space-sm: 8px;  --rf-space-md: 12px;  --rf-space-lg: 16px;
  --rf-space-xl: 24px; --rf-space-2xl: 32px; --rf-space-3xl: 48px;

  --rf-radius-card: 18px;     /* cards, plan rows, photo frames */
  --rf-radius-button: 16px;
  --rf-radius-tile: 14px;     /* feature tiles, style thumbnails */
  --rf-radius-inline: 13px;
  --rf-radius-thumb: 12px;
  --rf-radius-sheet: 26px;    /* bottom sheets (top corners) */
  --rf-radius-pill: 100px;

  --rf-tap-min: 44px;         /* every touch target */
  --rf-button-h: 56px;        /* primary button height */

  --rf-icon-sm: 16px; --rf-icon-md: 20px; --rf-icon-lg: 24px; --rf-icon-xl: 32px;
}
"""
effects = """/* Elevation, gradients, motion (config/theme.ts `elevation`, `gradient`, `motion`). */
:root {
  --rf-shadow-sm: 0 2px 6px rgba(0,0,0,0.20);
  --rf-shadow-md: 0 6px 14px rgba(0,0,0,0.28);
  --rf-shadow-lg: 0 12px 24px rgba(0,0,0,0.40);
  --rf-glow-gold: 0 0 18px rgba(240,206,153,0.35);       /* focused/selected gold elements */
  --rf-glow-gold-soft: 0 4px 22px rgba(221,180,119,0.18);

  --rf-gradient-primary: linear-gradient(135deg, #EFD0A0, #DDB477);      /* primary CTA */
  --rf-gradient-primary-deep: linear-gradient(135deg, #DDB477, #C09B62);
  --rf-gradient-muted-cta: linear-gradient(135deg, #B8AE9C, #A69C8A);    /* second CTA; label stays --rf-on-gold */
  --rf-gradient-card-border: linear-gradient(135deg, rgba(225,195,155,0.28), rgba(225,195,155,0.06));
  --rf-gradient-image-caption: linear-gradient(180deg, rgba(19,19,19,0), rgba(19,19,19,0.75));
  --rf-gradient-destructive: linear-gradient(135deg, #7A4B42, #552E28);

  --rf-dur-instant: 80ms; --rf-dur-fast: 160ms; --rf-dur-base: 240ms; --rf-dur-slow: 360ms; --rf-dur-glacial: 560ms;
  --rf-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --rf-ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --rf-ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --rf-ease-emphasize: cubic-bezier(0.2, 0, 0, 1);
}
"""
for name, body in (("colors.css", colors), ("typography.css", typography), ("layout.css", layout), ("effects.css", effects)):
    (OUT / "tokens" / name).write_text(body)

(OUT / "_ds_bundle.css").write_text("""/* Base document styles for designs built with Roomframe — dark ground, Inter body. */
html, body { background: var(--rf-ground); color: var(--rf-ink); }
body { margin: 0; font: var(--rf-body-s); -webkit-font-smoothing: antialiased; }
""")
(OUT / "styles.css").write_text("""/* Roomframe AI design system — import this one file. */
@import "./fonts/fonts.css";
@import "./tokens/colors.css";
@import "./tokens/typography.css";
@import "./tokens/layout.css";
@import "./tokens/effects.css";
@import "./_ds_bundle.css";
""")

header = {"namespace": "RoomframeDS", "components": [], "sourceHashes": {}, "inlinedExternals": [], "builtBy": "cc-design-sync"}
(OUT / "_ds_bundle.js").write_text(f"/* @ds-bundle: {json.dumps(header)} */\n"
                                   "/* Tokens-only design system: Roomframe's components are React Native and do not ship here. */\n"
                                   "window.RoomframeDS = window.RoomframeDS || {};\n")
(OUT / "_ds_needs_recompile").write_text(json.dumps({"by": "design-sync-cli"}))
# Local-only build metadata the validator reads; componentCount 0 = the tokens-only form.
(OUT / ".ds-build-meta.json").write_text(json.dumps({"componentCount": 0, "shape": "package", "tokensOnly": True}, indent=2) + "\n")

# ── guidelines + references ────────────────────────────────────────────────
for g in (DS / "guidelines").glob("*.md"):
    shutil.copy(g, OUT / "guidelines" / g.name)
for p in (DS / "reference").glob("*"):
    shutil.copy(p, OUT / "guidelines/reference" / p.name)
shutil.copy(ROOT / "assets/logo.png", OUT / "guidelines/reference/logo.png")

conv = (DS / "conventions.md").read_text()
token_index = "\n".join(f"- `tokens/{n}`" for n in ("colors.css", "typography.css", "layout.css", "effects.css"))
(OUT / "README.md").write_text(conv.rstrip() + f"""

---

## Files
- `styles.css` — imports everything below; link this one file.
{token_index}
- `fonts/fonts.css` — Noto Serif, Inter, Archivo, Instrument Serif (the app's own .ttf files)
- `guidelines/` — brand, screen patterns and product rules; `guidelines/reference/` holds the current app screens.
""")
for d in ("_vendor", "_preview", "components"):
    if not any((OUT / d).iterdir()):
        (OUT / d).rmdir()
print("ds-bundle:", sorted(str(p.relative_to(OUT)) for p in OUT.rglob("*") if p.is_file()))
