# Stitch Prompt — Batch 2 (Screens 11–20)

## Screens in This Batch

| #   | Screen                |
| --- | --------------------- |
| 11  | Gallery — Empty State |
| 12  | Gallery — With Items  |
| 13  | History — Empty State |
| 14  | History — With Items  |
| 15  | Profile               |
| 16  | Credits Dashboard     |
| 17  | Credits Exhausted     |
| 18  | Plans — Selection     |
| 19  | Plans — Confirm       |
| 20  | Upsell — HD Quality   |

---

## Stitch Prompt — Batch 2

```
Create 10 mobile screens for "The Architectural Lens" — a premium AI-powered interior design app for iOS. This is Batch 2 of the design system. The aesthetic is a dark luxury-gallery curator vibe. All screens must follow the design system below EXACTLY.

=== DESIGN SYSTEM (must match across all screens) ===

BRAND IDENTITY:
- App Name: "The Architectural Lens"
- Tagline: "Reimagine Your Space"
- Target Users: architects, interior designers, homeowners wanting premium redesign
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
- CTA gradient: linear-gradient(135deg, #C4A882, #A68A62) — used on ALL primary action buttons

TYPOGRAPHY:
- Headlines/Titles: Noto Serif (serif) — elegant, editorial
- Body/Labels/Buttons: Inter (sans-serif) — clean, modern
- Label style: 11px, uppercase, letter-spacing 0.1em–0.2em, Inter semibold
- App name display: 14px, uppercase, letter-spacing 3px, Noto Serif

DESIGN RULES:
- Dark mode ONLY — no light backgrounds anywhere
- NO visible 1px borders — use tonal surface color shifts to create depth and separation
- Border radius: 12px (signature radius for cards, buttons, inputs)
- CTA buttons: full-width, gold gradient background, flex-row with text LEFT-aligned and arrow icon RIGHT-aligned (justify-between), 11px uppercase tracking, rounded-xl (12px), px-24 py-16 padding
- Secondary actions: outlined with #4D463C border, transparent fill
- Cards: #1C1B1B background, 12px radius, no border — use subtle shadow or surface shift
- Inputs: #2A2A2A background, 12px radius, no visible border, placeholder text in #998F84
- Icons: Ionicons style — outlined variants, gold (#C4A882) for nav, #998F84 for secondary
- Bottom navigation: glassmorphic bar (surface 70% opacity + 20px frosted blur), 4 tabs: Studio (cube-outline), Gallery (grid-outline), History (time-outline), Profile (person-outline)
- Scale-on-press feedback on interactive elements

APP HEADER (appears on Gallery, History, Profile screens):
- Left: hamburger menu icon (gold, 24px) + app name "THE ARCHITECTURAL\nLENS" (2 lines, 14px, uppercase, tracking 3px, Noto Serif)
- Right: circular user avatar (36px diameter)
- Horizontal padding: 32px each side
- Vertical padding: 16px

=== SCREEN 11: GALLERY — EMPTY STATE ===
App header at top (hamburger + "THE ARCHITECTURAL LENS" + avatar).
Below header:
- "CURATION 01" gold label (11px, uppercase, tracking 0.15em)
- "Gallery" headline (36px, Noto Serif, warm white)
- Thin gold accent bar (40px wide, 2px tall, below headline)

Main empty state content (vertically centered in remaining space):
- Large icon area: two overlapping icons — grid-outline (48px) and compass-outline (32px) — in muted gold, inside a subtle #1C1B1B rounded container (96×96)
- "No designs yet" headline (22px, Noto Serif, centered)
- "Your curated architectural portfolio is currently empty. Begin your journey by shaping space and form." body text (14px, secondary text, centered, max-width 280px)
- "CREATE YOUR FIRST DESIGN IN THE STUDIO" gold label text (11px, uppercase, tracking 0.15em, centered)
- CTA button: "Go to Studio" (gold gradient, full width at px-48 horizontal margin, text LEFT "GO TO STUDIO", arrow-forward icon RIGHT, justify-between)
- Bottom: glassmorphic tab bar with "Gallery" tab highlighted in gold

=== SCREEN 12: GALLERY — WITH ITEMS ===
App header at top (hamburger + "THE ARCHITECTURAL LENS" + cube icon in a gold-tinted square instead of avatar).
Below header:
- "CURATION 01" gold label
- "Gallery" headline (36px, Noto Serif)
- Thin gold accent bar
- "Curated Collection" small label (11px, secondary text, uppercase, tracking)

Search bar:
- Full-width, #2A2A2A background, 12px radius
- Left: search icon (#998F84)
- Placeholder: "Search by era or material..."
- Right area: subtle filter icon

Filter chips (horizontal scroll):
- "All Interiors" (selected — gold fill, dark text)
- "Living Room", "Bedroom", "Kitchen", "Bathroom", "Office", "Dining" (unselected — outlined #4D463C, secondary text)

Content (scrollable):
- Hero card: full-width, large image (aspect 16:9), gradient overlay bottom-to-top (transparent to #131313), title "Bauhaus Revival" and description overlaid at bottom-left, arrow-forward icon bottom-right, rounded-xl
- 2-column masonry grid below hero:
  - Card 1: tall (3:4 ratio), interior photo, heart icon top-right, title "Scandinavian Light" at bottom overlay
  - Card 2: shorter (4:5 ratio), interior photo, heart icon, title "Industrial Loft"
  - Card 3: tall, title "Japandi Fusion"
  - Card 4: short, title "Art Deco Suite"
- Editorial card (full-width): #1C1B1B background, "NEW SERIES" gold label, "Light & Shadow in Domestic Spaces" headline (18px, Noto Serif), description text, "Explore →" gold text link
- Bottom: glassmorphic tab bar with "Gallery" tab active

=== SCREEN 13: HISTORY — EMPTY STATE ===
App header at top (hamburger + "THE ARCHITECTURAL LENS" + avatar).
Below header:
- "History" headline (42px, Noto Serif)
- Thin gold accent bar (40px wide, 2px tall)
- "Archived Visual Narratives" subtitle (11px, secondary text, uppercase, tracking)

Main empty state content (vertically centered):
- Large icon: time/clock icon (40px) inside #1C1B1B rounded container (96×96)
- "No history yet" headline (22px, Noto Serif, centered)
- "Your collection of curated spaces is waiting to be built. Begin your journey by exploring the studio." body text (14px, secondary text, centered)
- CTA button: "Start Creating" (gold gradient, full width at px-48, text LEFT "START CREATING", arrow-forward icon RIGHT, justify-between)
- Bottom: glassmorphic tab bar with "History" tab active

=== SCREEN 14: HISTORY — WITH ITEMS ===
App header at top (hamburger + "THE ARCHITECTURAL LENS" + avatar).
Below header:
- "History" headline (42px, Noto Serif)
- Gold accent bar
- "Archived Visual Narratives" subtitle

History list (vertical scroll, FlatList style):
- Each history card:
  - Left: thumbnail image (88×88, rounded-xl)
  - Right content:
    - Top row: "COMPLETED" status badge (green background #1A3D2E, green text #4ADE80, pill shape, 10px uppercase)
    - Title: "Brutalist Retreat" (16px, Noto Serif, warm white)
    - Details line: "RENDER ID: #A9422 · 3 CREDITS" (10px, uppercase, secondary text, tracking)
    - Divider line (#4D463C)
    - Bottom row: "OCTOBER 24, 2023 · 14:20" date text (10px, secondary) + open-outline icon right
  - Full card is pressable

- Second card: "The Marble Atrium" / "RENDER ID: #B7201 · 5 CREDITS" / "OCTOBER 18, 2023 · 09:45"
- Third card: "Charcoal Kitchen" / "RENDER ID: #C3304 · 1 CREDIT" / "OCTOBER 12, 2023 · 16:30"

- Bottom: glassmorphic tab bar with "History" tab active

=== SCREEN 15: PROFILE ===
App header at top (hamburger + "THE ARCHITECTURAL LENS" + avatar).

Profile hero section:
- Large profile photo (100×120 rectangle, rounded-xl, centered)
- Optional "PRO" badge (gold gradient pill, positioned at bottom-right of photo)
- Display name: "Julian Vane" (22px, Noto Serif, warm white, centered)
- Email: "j.vane@architecture.studio" (12px, secondary text, centered)

Stats row (2 cards side by side, gap 12px, horizontal):
- Left card (#1C1B1B, rounded-xl, padding 20px):
  - Circular credit ring (SVG-style circle, gold stroke, partially filled)
  - Large number "148" in center (28px, Noto Serif)
  - "Credits Left" label below (11px, secondary, uppercase)
- Right card (#1C1B1B, rounded-xl, padding 20px):
  - "CURRENT PLAN" label (10px, gold, uppercase, tracking)
  - Plan name "Atelier" (22px, Noto Serif, warm white)
  - "Renews in 12 days" (11px, secondary)

Account Settings section:
- "ACCOUNT SETTINGS" section header (gold label, 10px, uppercase, tracking 1.5px)
- Menu items list (each item: left icon + text + right chevron, py-16 padding, #4D463C bottom divider):
  - heart-outline → "Curated Favorites"
  - notifications-outline → "Notifications" (+ small gold dot indicator)
  - card-outline → "Billing History"
  - shield-outline → "Privacy & Data"
  - log-out-outline → "Sign Out" (gold text, no chevron)

Footer:
- "THE ARCHITECTURAL LENS" watermark text (11px, #4D463C, centered, uppercase, tracking)
- "v4.2.0-stable" version (10px, #4D463C, centered)

Bottom: glassmorphic tab bar with "Profile" tab active

=== SCREEN 16: CREDITS DASHBOARD ===
Full screen, #131313 background.
Back arrow (gold) at top-left, "Credits" title center.

Hero section (centered):
- "AVAILABLE BALANCE" label (11px, gold, uppercase, tracking)
- Large balance number "148" (72px, Noto Serif, warm white, centered)
- "Credits remain in your Studio vault." subtitle (14px, secondary, centered)

Upgrade banner (gold gradient card, rounded-xl, full-width):
- Left content: "Upgrade for more credits" headline (16px), "Unlock unlimited high-fidelity renders and project depth." body (12px, on-primary text)
- Right: chevron-forward icon
- Entire banner is pressable

Reference Guide card (#1C1B1B, rounded-xl):
- "REFERENCE GUIDE" section header (gold label)
- 3 cost rows, each with: label left + credit cost right, separated by subtle dividers
  - "Conceptual Sketch" → "1 Credit"
  - "High-Fidelity Render" → "5 Credits"
  - "3D Structural Analysis" → "12 Credits"

Monthly Usage section:
- "MONTHLY USAGE" header (gold label)
- Ledger list entries, each row:
  - Small thumbnail (40×40, rounded-lg) on left
  - Middle: reason label (gold, 10px, uppercase) + description text (14px, warm white)
  - Right: credit amount (+12 in green, -5 in gold, etc.)
- Vertical scroll

Next Cycle card (#1C1B1B, rounded-xl):
- "NEXT CYCLE" label
- "Your balance will reset on November 1, 2024." text
- Progress bar (60% filled, gold track on #353534 background, rounded-full)
- "18 Days Remaining" right-aligned label

Promo Code section (expandable):
- "PROMOTIONAL CODE" header with chevron toggle
- When expanded: input field (#2A2A2A) + "REDEEM" gold outlined button

=== SCREEN 17: CREDITS EXHAUSTED ===
Full screen, #131313 background, centered vertically.

Large credit ring (192×192):
- Outer circle: thick #2A2A2A stroke
- Inside: hourglass-outline icon (48px, #998F84, faded)
- "0" large number (48px, Noto Serif, warm white)
- "Credits left" label below number (12px, secondary)

"Out of Credits" headline (28px, Noto Serif, centered)
"Your creative journey requires additional fuel. Credits reset in 18 days." body text (14px, secondary, centered)

Pro Recommendation card (#1C1B1B, rounded-xl, relative):
- Decorative corner: faded interior image at top-right, 10% opacity, clipped
- "PRO RECOMMENDATION" label (10px, gold, uppercase, tracking)
- "Upgrade your plan for more compute power and unlimited drafts." body text
- CTA button: "View Plans" (gold gradient, text LEFT, arrow-forward RIGHT, justify-between, full-width)

=== SCREEN 18: PLANS — SELECTION ===
Full screen, #131313 background.
Back arrow (gold) at top-left.

- "Choose Your\nPlan" headline (36px, Noto Serif, 2 lines)
- "Select a tier that matches the scale of your vision." subtitle (14px, secondary)

4 plan cards (vertical scroll, full-width, each card #1C1B1B bg, rounded-xl, p-24):

Card 1 — FOUNDATIONS (Free):
- "FOUNDATIONS" name label (gold, 11px, uppercase, tracking)
- "Free" subtitle (secondary)
- "$0" price (36px, Noto Serif) + "Lifetime" cadence (12px, secondary)
- "Current Plan" button (disabled style — #353534 bg, muted text, rounded-xl)

Card 2 — THE DRAFTSMAN (Basic):
- "THE DRAFTSMAN" name (gold label)
- "Basic" subtitle
- "$9.99" price + "Monthly" cadence
- "Select Basic" button (outlined, #4D463C border, gold text, rounded-xl)

Card 3 — THE ARCHITECT (Pro) — HIGHLIGHTED:
- "MOST POPULAR" badge (gold gradient pill, top-right of card)
- "THE ARCHITECT" name (gold label)
- "Pro" subtitle
- "$24.99" price + "Monthly" cadence
- "Upgrade to Pro" button (GOLD GRADIENT, text left, arrow right, justify-between — primary CTA style)

Card 4 — GLOBAL STUDIO (Max):
- "GLOBAL STUDIO" name (gold label)
- "Max" subtitle
- "$49.99" price + "Monthly" cadence
- "Go Unlimited" button (#2A2A2A bg, warm white text, rounded-xl — dark prominent style)

Feature Comparison table below cards:
- "FEATURE COMPARISON" header (gold label)
- Table with columns: Feature | Free | Basic | Pro | Max
- Rows:
  - "Cloud Gallery Storage": 1 GB | 50 GB | 1 TB | Unlimited
  - "Blueprint Export": PDF | PDF + CAD | All Formats | All + Source
  - "High-Res Render": — | — | ✓ | ✓
  - "Collaborative Workspace": — | — | ✓ | ✓
  - "Custom Domain Portfolio": — | — | — | ✓
- Use checkmarks (gold) and dashes (#998F84) for boolean values
- Table cells: #1C1B1B bg, subtle dividers between rows

=== SCREEN 19: PLANS — CONFIRM (Bottom Sheet Style) ===
Full screen with sheet-style presentation (#131313 bg).
- Drag handle bar at top center (40×4, #353534, rounded-full)

- "MEMBERSHIP TIER" gold label (11px, uppercase, tracking)
- "Upgrade to\nPro" headline (36px, Noto Serif, 2 lines)
- "$24.99" price (32px, gold, Noto Serif) + "/ month" (14px, secondary)

3 Feature rows (each with icon + text block, gap 16px, py-16):
- building-outline icon (gold, 24px) → "Unlimited Blueprints" title (16px, warm white) + "Generate as many designs as your vision demands, with no monthly cap." description (13px, secondary)
- grid-outline icon → "Exclusive Collections" + "Access curated style libraries reserved for Pro members."
- shield-checkmark-outline icon → "Commercial License" + "Full rights to use generated designs in client projects."

Info card (#2A2A2A bg, rounded-xl):
- information-circle icon (gold) + "Your current credits (148) will carry over automatically." text (13px, secondary)

Bottom section:
- CTA: "Confirm & Subscribe" (gold gradient, full width, text LEFT, arrow-forward RIGHT, justify-between)
- "Cancel and Return" text link centered below (secondary text, pressable)

=== SCREEN 20: UPSELL — HD QUALITY ===
Full screen, #131313 background.
Close X icon top-right (gold).

- "MEMBERSHIP REQUIRED" gold label (11px, uppercase, tracking)
- "HD Quality\nrequires Basic." headline (32px, Noto Serif, 2 lines)
- "Experience your architectural visions in surgical detail. HD rendering unlocks texture fidelity and professional-grade exports." body text (14px, secondary)

Side-by-side comparison (2 images, horizontal, gap 12px):
- Left image: standard quality render, slightly blurred/faded, "72dpi" badge at bottom, "Standard" label below (12px, secondary)
- Right image: HD quality render, crisp and detailed, "2048px" gold badge at bottom, "High Definition" label below (12px, gold)
- Both images same room, rounded-xl, aspect 3:4

Value proposition section:
- "Uncompromising." headline (24px, Noto Serif)
- "Get crystal-clear 2048px renders that capture every material texture and light reflection." body (14px, secondary)

Feature checklist (2 items):
- checkmark-circle gold icon + "Advanced Texturing" title (14px, warm white) + "Deep-learning material refinement for photorealistic surfaces." description (12px, secondary)
- checkmark-circle gold icon + "Export Ready" title + "Professional formats for presentations and client deliverables." description

Bottom:
- CTA: "Upgrade to Basic" (gold gradient, full width, text LEFT, arrow-forward RIGHT, justify-between)
- "Review Plan Details" text link below (gold text, centered)

Device frame: iPhone 15 Pro, portrait, 393×852 viewport.
Generate each screen as a separate, complete mobile screen design.
All screens must maintain visual consistency — same colors, fonts, spacing, and component styles throughout.
```
