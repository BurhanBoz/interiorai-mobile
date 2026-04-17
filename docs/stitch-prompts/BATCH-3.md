# Stitch Prompt — Batch 3 (Screens 21–28)

## Screens in This Batch

| #   | Screen                        |
| --- | ----------------------------- |
| 21  | Generation — Progress         |
| 22  | Generation — Upscale          |
| 23  | Result — Detail               |
| 24  | Result — Before/After Compare |
| 25  | Smart Edit (Inpainting)       |
| 26  | Style Transfer                |
| 27  | Settings — Language           |
| 28  | Settings — Notifications      |

---

## Stitch Prompt — Batch 3

```
Create 8 mobile screens for "The Architectural Lens" — a premium AI-powered interior design app for iOS. This is Batch 3 of the design system. The aesthetic is a dark luxury-gallery curator vibe. All screens must follow the design system below EXACTLY and be visually consistent with Batches 1 and 2.

=== DESIGN SYSTEM (must match across all batches) ===

BRAND IDENTITY:
- App Name: "The Architectural Lens"
- Tagline: "Reimagine Your Space"
- Tone: sophisticated, minimal, premium — like a luxury art gallery app

COLOR PALETTE (strict — use EXACT hex values):
- Background/Surface: #131313 (near-black)
- Card backgrounds: #1C1B1B (surface-container-low)
- Mid surfaces: #201F1F (surface-container)
- Elevated surfaces: #2A2A2A (surface-container-high)
- Highest elevation: #353534 (surface-container-highest)
- Primary text: #E5E2E1 (warm off-white)
- Secondary text: #D0C5B8 (muted warm gray)
- Gold accent (primary): #E1C39B
- Gold secondary: #C4A882
- Text on gold: #3F2D11 (dark brown)
- Muted borders: #998F84
- Subtle dividers: #4D463C
- Error: #FFB4AB
- Success green: #66BB6A
- CTA gradient: linear-gradient(135deg, #C4A882, #A68A62) — used on ALL primary action buttons

TYPOGRAPHY:
- Headlines/Titles: Noto Serif (serif) — elegant, editorial
- Body/Labels/Buttons: Inter (sans-serif) — clean, modern
- Label style: 11px, uppercase, letter-spacing 0.1em–0.2em, Inter semibold
- App name display: 14px, uppercase, letter-spacing 3px, Noto Serif

DESIGN RULES:
- Dark mode ONLY — no light backgrounds anywhere
- NO visible 1px borders — use tonal surface color shifts to create depth
- Border radius: 12px (signature radius for cards, buttons, inputs)
- CTA buttons: full-width, gold gradient background, flex-row with text LEFT-aligned and arrow icon RIGHT-aligned (justify-between), 11px uppercase tracking, rounded-xl (12px), px-24 py-16 padding
- Secondary actions: outlined with #4D463C border, transparent fill
- Cards: #1C1B1B background, 12px radius, no visible border
- Inputs: #2A2A2A background, 12px radius, no visible border, placeholder text in #998F84
- Icons: Ionicons style — outlined variants, gold (#C4A882) for nav, #998F84 for secondary
- Bottom navigation: glassmorphic bar (surface 70% opacity + 20px frosted blur), 4 tabs: Studio (cube-outline), Gallery (grid-outline), History (time-outline), Profile (person-outline)

APP HEADER (used on Smart Edit and Style Transfer):
- Left: hamburger menu icon (gold, 24px) + app name "THE ARCHITECTURAL\nLENS" (2 lines, 14px, uppercase, tracking 3px, Noto Serif)
- Right: circular user avatar (36px diameter)
- Horizontal padding: 32px, vertical padding: 16px

=== SCREEN 21: GENERATION — PROGRESS ===
Full screen, #131313 background. This is a loading/processing screen shown while the AI generates a design.

Top bar:
- Left: "THE ARCHITECTURAL LENS" brand text (13px, uppercase, tracking 3px, Noto Serif, warm white)
- Right: Close button (38×38 circle, #2A2A2A background, X icon 18px white)

Center content (vertically centered, slight upward offset):
- Animated concentric circles area (150×150):
  - Outer ring: 150px circle, very faint gold border (1px, rgba(196,168,130,0.08))
  - Middle pulsing ring: 140px circle, gold border (1px, #C4A882), partially transparent (pulsing animation)
  - Inner spinning arc: 128px circle, 2.5px gold arc (partial circle, rotating animation)
  - Center element: 56px circle, #1C1B1B background, time-outline icon (28px, gold)
- Title below rings: "Creating Your Design..." (28px, Noto Serif, warm white, centered)
- Rotating status text below (cycles every 3s):
  - "Analyzing Room Structure..."
  - "Applying Design Style..."
  - "Rendering Final Output..."
  - "Optimizing Quality..."
  - (11px, uppercase, tracking 2px, secondary text, 70% opacity)

Design Principle card (bottom area, full width):
- #1C1B1B background, 12px radius, padding 24px
- Top row: bulb-outline icon (16px, gold) + "DESIGN PRINCIPLE" label (10px, gold, uppercase, tracking 2px)
- Quote text: "Scandinavian design prioritizes 'Hygge'—creating a warm atmosphere and a feeling of coziness, contentment, and well-being through thoughtful simplicity." (14px, Inter, italic, secondary text)
- Small decorative gold bar (48×2px, rgba(196,168,130,0.3))

"Powered by" badge (centered, below card):
- Pill shape, #2A2A2A background, rounded-full
- Flash icon (13px, gold) + "Powered by SDXL" (10px, uppercase, tracking 1.5px)

=== SCREEN 22: GENERATION — UPSCALE ===
Full screen, #131313 background. Shows HD upscaling progress with real-time feedback.

Header:
- Left: back arrow icon (22px, warm white) + "THE ARCHITECTURAL LENS" (14px, uppercase, tracking 3px, Noto Serif, gold)
- Right: Avatar circle (36px)

Scrollable content:
- Section label: "CURRENT WORKFLOW" (10px, gold, uppercase, tracking 2.5px)
- Title: "Upscaling to HD..." (34px, Noto Serif, italic, warm white)
- Phase label row: sparkles icon (14px, 60% opacity) + dynamic phase text:
  - "PHASE 1: NOISE REDUCTION" (progress < 40%)
  - "PHASE 2: TEXTURAL REFINEMENT" (40–80%)
  - "PHASE 3: FINAL ENHANCEMENT" (80%+)
  - (10px, uppercase, tracking 1.5px)

Image preview (full width, 4:5 aspect ratio, rounded-xl):
- Blurred room photo as background (heavy blur)
- Dark overlay (45% opacity) with centered content:
  - Progress bar: 200px wide, 2px tall, gold fill on dark track
  - "Enhancing Detail: 63%" (11px, uppercase, tracking 1.5px, warm white)
  - "Applying AI super-resolution" (12px, secondary text, 60% opacity)
- Badge (top-right corner): "HD PROCESSING" (9px, uppercase, tracking 1.5px, on dark pill bg)

Process Log section:
- Header row: "Process Log" (17px, Noto Serif, italic) right-aligned "REAL-TIME" (9px, gold, uppercase, tracking 2px)
- Log entry 1 (completed): #1C1B1B card, 12px radius
  - checkmark-circle icon (18px, green #66BB6A) + "Standard Render Complete" (14px, medium weight) + "Base image generated successfully" (12px, 60% opacity)
- Log entry 2 (in progress): same card style
  - Spinning sync icon (18px, 50% opacity) + "HD Upscaling In Progress" (14px) + "Enhancing resolution and detail with AI" (12px, 60% opacity)

Bottom buttons (fixed, 2 side by side):
- "Cancel" button: flex-1, height 52px, #2A2A2A background, 12px radius, text 12px uppercase
- "Done" button: flex-1, height 52px, gold at 40% opacity (disabled state), 12px radius, text 12px uppercase

=== SCREEN 23: RESULT — DETAIL ===
Full screen, #131313 background. Shows the final AI-generated result with metadata and actions.

Top bar:
- Left: back arrow (gold)
- Center: "THE ARCHITECTURAL LENS" branding
- Right: avatar

Main image (full width, 4:5 aspect ratio, rounded-xl):
- Generated interior design photo filling the frame
- "FREE" badge (top-left): surface at 70% opacity, rounded-lg, text "FREE" (10px, bold, uppercase, tracking 1.5px)
- Pagination dots (bottom center): 3 dots — first dot gold 8px, other dots muted 6px

Action row (horizontal, below image, gap between icons):
- 4 action buttons side by side:
  - Save: 48×48, #2A2A2A background, 12px radius, download-outline icon (22px) + "Save" label below (9px)
  - Share: same style, share-social-outline icon + "Share"
  - Store: same style, bookmark-outline icon + "Store"
  - Upscale button (right-aligned, wider): #2A2A2A bg, flex-row, contains:
    - "HI/RES" mini badge (#353534 bg, 8px text) + "UPSCALE" (11px, bold, uppercase) + "3 Credits" (10px, gold)

Generation Metadata card (#1C1B1B, rounded-xl, padding 24):
- Title: "Generation Metadata" (18px, Noto Serif)
- 2×2 grid of info pairs:
  - "ROOM TYPE" label → "Gallery Lounge" value
  - "STYLE" label → "Quiet Luxury" value
  - "MODEL ENGINE" label → "SDXL 1.0" value
  - "COST" label → "1 Credit" value
  - Labels: 9px, uppercase, tracking 1.5px, secondary text
  - Values: 15px, warm white

Material Palette section:
- "MATERIAL PALETTE" label (10px, gold, uppercase, tracking 2.5px)
- Horizontal row of 5 color circles (56×56 each, rounded-full) with names below:
  - Brass (#C4A882), Slate (#6B7280), Linen (#D6CFC4), Oak (#A68E6B), Clay (#9B7E6B)
  - Names: 10px, secondary text

CTA button at bottom:
- Gold gradient, full width, centered layout:
  - color-wand-outline icon (18px, dark brown) + "REDESIGN AGAIN" (12px, semibold, uppercase, tracking 1.5px, on-primary text)

=== SCREEN 24: RESULT — BEFORE/AFTER COMPARE ===
Full screen, #131313 background. Side-by-side before/after comparison view.

Header:
- Left: back arrow (22px, warm white)
- Center: "Transformation" (17px, Noto Serif, warm white)
- Right: share-social-outline icon (22px, warm white)

Before/After comparison (main visual, mx-24, rounded-xl):
- Two images side by side filling the container, tall format (~110% of screen width height)
- Left half: "Before" — original room photo
  - Badge bottom-left: "ORIGINAL" (9px, uppercase, tracking, on surface/70% bg)
- Center divider: vertical line (1px, gold at 50% opacity)
  - Diamond handle: 36×36 circle, #2A2A2A bg, 1px gold border (40% opacity), diamond-outline icon (16px, gold) — positioned at center of divider line
- Right half: "After" — AI-enhanced room photo
  - Badge bottom-right: "AI ENHANCED" (9px, uppercase, tracking, gold bg at 80%, dark text)

Metadata section below:
- Left column:
  - "PROJECT 082" label (10px, uppercase, tracking 2px, secondary)
  - "Minimalist brutalist renovation" title (26px, Noto Serif, warm white, 2 lines)
  - Description: "Applying a curated luxury aesthetic to raw industrial shells. The AI engine interpreted the spatial volume to suggest high-end textures, metallic accents, and integrated lighting systems." (14px, secondary, lineHeight 22)
- Right column (top-right area):
  - "ESTIMATED VALUE" label (9px, uppercase, secondary)
  - "+24%" large number (20px, Noto Serif, gold)
  - "Increase" text (14px, gold)

Action buttons (2 side by side, full width):
- "Save Variations": flex-1, height 56px, #2A2A2A background, 12px radius, text "SAVE VARIATIONS" (11px, uppercase, tracking 1.5px)
- "Regenerate": flex-1, height 56px, gold gradient, text "REGENERATE" (11px, uppercase, tracking 1.5px, on-primary)

=== SCREEN 25: SMART EDIT (INPAINTING) ===
Full screen with app header (hamburger + branding + avatar). This is the brush-based AI editing tool.

App header at top (standard: hamburger menu + "THE ARCHITECTURAL LENS" + avatar).

Scrollable content:
- Step label: "STEP 03 — REFINEMENT" (10px, uppercase, tracking 2px, secondary text)
- Title: "Smart Edit" (28px, Noto Serif, warm white)

Image canvas (full width, 4:5 aspect ratio, rounded-xl, #1C1B1B bg):
- Room photo fills the canvas
- Tool buttons overlay (top-right of image, vertical stack, gap 8):
  - Brush tool: 40×40 circle, active state = gold bg (90% opacity) with dark icon, inactive = dark bg (70% opacity) with white icon. brush icon (20px)
  - Undo button: 40×40 circle, dark bg (70% opacity), arrow-undo icon (20px, white)
- Brush size slider (bottom overlay on image, semi-transparent dark bg):
  - Small dot (8px) on left — horizontal slider — large dot (16px) on right
  - Slider track: gold for minimum side, #4D463C for maximum side, gold thumb

"Describe the Change" section:
- Label: "DESCRIBE THE CHANGE" (10px, uppercase, tracking 2px, secondary)
- Text area: #1C1B1B background (focused: #2A2A2A), 12px radius, 100px min-height
  - Placeholder: "e.g., Replace this sofa with a minimal marble coffee table..."
  - Placeholder color: #998F84

Quality & Variants row (2 cards side by side):
- Quality Tier card (#1C1B1B, 12px radius):
  - "QUALITY TIER" label (9px, uppercase, tracking 1.5px)
  - "Ultra HD" text + Toggle switch (gold when on, dark when off)
- Variants card (#1C1B1B, 12px radius):
  - "VARIANTS" label (9px, uppercase, tracking 1.5px)
  - "2 Images" text + chevron-down icon (#998F84)

CTA button (gold gradient, full width, justify-between):
- Left: "GENERATE REFINEMENT" (11px, semibold, uppercase, tracking 1.8px, on-primary)
- Right: credit badge (dark translucent bg, flash icon 14px + "12" text) + arrow-forward icon (20px, dark brown)

=== SCREEN 26: STYLE TRANSFER ===
Full screen with app header (hamburger + branding + avatar). Max-tier exclusive feature for applying reference aesthetics.

App header at top (standard).

Scrollable content:
- Mode badge row: "STYLE TRANSFER" chip (rounded-lg, gold-tinted bg rgba(196,168,130,0.15), gold text, 10px uppercase tracking 2px) + "MAX" label (10px, uppercase, tracking 1.5px, secondary)
- Title: "Curate Your\nAesthetic" (36px, Noto Serif, warm white, 2 lines, lineHeight 42)

Image pair (side by side, gap 16):
- Left column: "Your Room"
  - "YOUR ROOM" label (10px, uppercase, tracking 2px, secondary)
  - Room photo (3:4 aspect ratio, 12px radius)
- Arrow icon between columns: arrow-forward (22px, #998F84)
- Right column: "Ref. Style"
  - "REF. STYLE" label (10px, uppercase, tracking 2px, secondary)
  - Upload area: dashed border (1.5px, rgba(77,70,60,0.4)), #2A2A2A bg, 12px radius, 3:4 aspect ratio
    - cloud-upload-outline icon (28px, #998F84)
    - "Upload reference\nphotograph" (12px, secondary, centered, 2 lines)

Influence Strength section:
- Header row: "INFLUENCE STRENGTH" label left (10px, uppercase) + percentage value right (18px, Noto Serif, gold, e.g. "75%")
- Horizontal slider: gold track for filled portion, #4D463C for unfilled, warm white thumb handle

Quality & Variants row (2 cards side by side, #2A2A2A bg):
- Quality card: "QUALITY" label → "Ultra High (4K)" value
- Variants card: "VARIANTS" label → "02 Iterations" value (zero-padded)

Cost display (centered):
- Flash icon (16px, gold) + "COST: 24 CREDITS" (11px, uppercase, tracking 1.5px, secondary)

CTA button (gold gradient, full width, justify-between):
- Left: "NEXT: RENDER SEQUENCE" (11px, semibold, uppercase, tracking 1.8px, on-primary)
- Right: arrow-forward icon (20px, dark brown)

=== SCREEN 27: SETTINGS — LANGUAGE ===
Full screen, #131313 background. Language selection screen.

Header section (no back arrow — accessed from drawer):
- Title: "Choose Language" (38px, Noto Serif, warm white)
- Decorative gold bar below (48px wide, 2px tall, #C4A882)

Language list (scrollable, gap 12):
- 8 language options, each a full-width row (height 64px, px-20, 12px radius):
  - Selected state: #2A2A2A background, warm white text, checkmark-circle icon (24px, gold) on right
  - Unselected state: #1C1B1B background, secondary text (#D0C5B8), no icon
  - Languages:
    1. "English" (selected by default)
    2. "Türkçe"
    3. "العربية"
    4. "Español"
    5. "Français"
    6. "Deutsch"
    7. "日本語"
    8. "中文"

Continue button (fixed at bottom, with fade gradient above):
- Fade overlay: transparent → #131313 gradient wash
- Button: gold gradient, full width, height 56px, 12px radius
  - "CONTINUE" text (semibold, uppercase, tracking-widest, on-primary) + arrow-forward icon (18px, dark brown)

=== SCREEN 28: SETTINGS — NOTIFICATIONS ===
Full screen, #131313 background. Notification preference toggles.

Top bar:
- Left: back arrow (24px, gold #C4A882)
- Center: "Notifications" (18px, Noto Serif, gold)
- Right: placeholder circle (32×32, #2A2A2A)

Hero section:
- Label: "PREFERENCES" (11px, gold, uppercase, tracking 2.2px)
- Title: "Tailor your architectural experience." (30px, Noto Serif, warm white, lineHeight 36)
- Decorative gold bar (96px wide, 2px tall, #C4A882)

Group 1: "PROJECT LIFECYCLE" (10px, uppercase, tracking 1.65px, secondary)
- 3 toggle rows (each: #1C1B1B bg, 12px radius, padding 20px):
  - Row 1: "Design completed" title + "Alerts for final render submissions." description + Toggle switch (gold track when on)
  - Row 2: "New styles" + "Notifications for seasonal collection drops." + Toggle
  - Row 3: "Blueprint revisions" + "Critical updates to active structural plans." + Toggle
  - Toggle: gold track (#C4A882) when on, #353534 when off, thumb: on=#3F2D11 off=#D0C5B8

Group 2: "CURATED NETWORK" (same label style)
- 2 toggle rows:
  - Row 4: "Gallery mentions" + "When your studio is cited in a collection." + Toggle
  - Row 5: "Curator insights" + "Weekly digest of architectural trends." + Toggle

Visual break: full-width interior architecture photo (4:3 aspect, 12px radius, 75% opacity, muted)

Quote section (centered, bottom):
- "Design is not just what it looks like and feels like. Design is how it works." (12px, italic, centered, secondary text)
- "The Silent Curator" (9px, gold, uppercase, tracking 3px)

Device frame: iPhone 15 Pro, portrait, 393×852 viewport.
Generate each screen as a separate, complete mobile screen design.
All screens must maintain visual consistency with Batch 1 (auth + studio screens) and Batch 2 (gallery, history, profile, credits, plans screens) — same colors, fonts, spacing, and component styles throughout.
```
