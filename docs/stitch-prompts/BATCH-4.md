# Stitch Prompt — Batch 4 (Screens 29–33, Final)

## Screens in This Batch

| #   | Screen                      |
| --- | --------------------------- |
| 29  | Settings — Help & FAQ       |
| 30  | Settings — Privacy Policy   |
| 31  | Settings — Terms of Service |
| 32  | Error Screen                |
| 33  | 404 Not Found               |

---

## Stitch Prompt — Batch 4

```
Create 5 mobile screens for "The Architectural Lens" — a premium AI-powered interior design app for iOS. This is Batch 4 (final batch) of the design system. The aesthetic is a dark luxury-gallery curator vibe. All screens must follow the design system below EXACTLY and be visually consistent with Batches 1, 2, and 3.

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
- Light text variant: #F5F0EB (brightest white used in headers)
- Secondary text: #D0C5B8 (muted warm gray)
- Gold accent (primary): #E1C39B
- Gold secondary: #C4A882
- Text on gold: #3F2D11 (dark brown)
- Muted borders/placeholders: #998F84
- Subtle dividers: #4D463C
- Error: #FFB4AB
- CTA gradient: linear-gradient(135deg, #C4A882, #A68A62) — used on ALL primary action buttons

TYPOGRAPHY:
- Headlines/Titles: Noto Serif (serif) — elegant, editorial
- Body/Labels/Buttons: Inter (sans-serif) — clean, modern
- Label style: 11px, uppercase, letter-spacing 0.1em–0.2em, Inter semibold
- App name display: 20px, uppercase, letter-spacing 4px, Noto Serif
- Large display headlines: 56px, lineHeight 62, letterSpacing -1px, Noto Serif

DESIGN RULES:
- Dark mode ONLY — no light backgrounds anywhere
- NO visible 1px borders — use tonal surface color shifts to create depth
- Border radius: 12px (signature radius for cards, buttons, inputs)
- CTA buttons: gold gradient background, rounded-xl (12px), py-16 padding
- Secondary buttons: #353534 background, warm white text, rounded-xl
- Cards: #1C1B1B or #2A2A2A background, 12px radius, no visible border
- Inputs: #1C1B1B background, 12px radius, placeholder text in #998F84
- Icons: Ionicons style — outlined variants
- Press animations: scale 0.98 on interactive elements

COMMON HEADER PATTERN (used on Help, Terms screens):
- Left: back arrow (24px, gold #C4A882) + "THE ARCHITECTURAL LENS" (20px, uppercase, tracking 4px, Noto Serif, #F5F0EB)
- Right: 32×32 avatar placeholder circle (#2A2A2A)
- px-32, py-24

=== SCREEN 29: SETTINGS — HELP & FAQ ===
Full screen, #131313 background. Help center with search and expandable FAQ accordions.

Header:
- Left: back arrow (24px, gold)
- Center: "THE ARCHITECTURAL LENS" (20px, uppercase, tracking 4px, Noto Serif, #F5F0EB)
- Right: 32×32 circle placeholder (#2A2A2A)

Hero section:
- "Help &\nSupport" display headline (56px, Noto Serif, warm white, 2 lines, lineHeight 62, letterSpacing -1px)
- Gold decorative bar (96px wide, 4px tall, rounded-full, #C4A882)
- Subtitle: "Seeking clarity on our architectural process or studio credits? Explore our curated guides below." (14px, Inter, secondary text, maxWidth 280px)

Search bar:
- "SEARCH KNOWLEDGE BASE" label above (11px, uppercase, tracking 1.1px, secondary)
- Input: #1C1B1B background, 12px radius, px-16 py-16
  - search icon (20px, #998F84) on left
  - Placeholder: "Find answers..."
  - Clear icon (close-circle, 18px, #998F84) appears when text entered

FAQ section:
- Header row: "Frequent Inquiries" (20px, Noto Serif, warm white) + "VIEW ALL" link (11px, uppercase, gold)
- 3 accordion cards (gap 16), each card: #2A2A2A background, 12px radius, padding 24px
  - Closed state: question text (14px, Inter, semibold, warm white) + chevron-down icon (18px, gold)
  - Open state: question text changes to gold (#E1C39B), chevron flips to chevron-up, answer text expands below (12px, Inter, secondary text, relaxed line-height)
  - FAQ 1: "How do credits work?" — "Each generation consumes credits based on the complexity of the style and resolution selected. Standard designs cost 1 credit, while HD upscales and premium styles may cost 2–5 credits. Credits refresh monthly with your plan or can be purchased à la carte."
  - FAQ 2 (default open): "Licensing & Usage" — "All studio renderings are under the \"Silent Curator\" license. Credits allow for high-resolution exports and commercial publication rights for your interior monographs."
  - FAQ 3: "Collaborative Access" — "Team plans allow up to 5 members to share a single credit pool. Invite collaborators from your profile settings. Each member maintains their own generation history while drawing from the shared balance."

Contact section (#1C1B1B card, 12px radius, padding 32px):
- Subtle ambient glow: faded gold circle (128px, 10% opacity) positioned top-right corner
- "Still curious?" heading (20px, Noto Serif, warm white)
- "Our concierge is available for personalized architectural consultations." description (12px, secondary)
- CTA button: gold gradient, full width, centered layout:
  - mail icon (18px, dark brown) + "Contact Us" (14px, semibold, on-primary)
- Email below: "CONCIERGE@ARCHLENS.STUDIO" (11px, uppercase, tracking 2.2px, gold at 80% opacity, centered)

Footer:
- Thin divider line (48px, very faint)
- "VERSION 2.4.0 — THE SILENT CURATOR" (10px, uppercase, tracking 3.3px, #998F84, centered)

=== SCREEN 30: SETTINGS — PRIVACY POLICY ===
Full screen, #131313 background. Long-form legal content with editorial styling.

Sticky header (semi-transparent bg, rgba(19,19,19,0.8)):
- Left: back arrow (24px, #D0C5B8)
- Center: "Privacy Policy" (18px, Noto Serif, gold)

Hero section:
- "THE ARCHITECTURAL LENS" label (11px, uppercase, tracking 2.2px, gold)
- "Data\nIntegrity." display headline (56px, Noto Serif, bold, warm white, 2 lines, lineHeight 62)
- Thin gold divider (48px wide, 1px tall, rgba(225,195,155,0.3))

Content sections (scrollable, gap 48px between sections — generous editorial spacing):

Section 1 — card style (#1C1B1B bg, 12px radius, padding 32px):
- "1. Information We Curate" heading (20px, Noto Serif, warm white)
- Body paragraph (14px, Inter, secondary, relaxed line-height)
- Bullet list with gold dot markers (●):
  - "Studio Preferences: Saved design moods, color palettes, and materiality selections."
  - "Gallery Interactions: Viewing history and archival bookmarks."

Section 2 — no card, open layout:
- "2. Purpose of Processing" heading (20px, Noto Serif)
- Body paragraph (14px, secondary, lineHeight 25)
- Atmospheric interior photo (16:9, 12px radius, 40% opacity — very muted, decorative only)

Section 3 — card style (#2A2A2A bg, 12px radius, padding 32px):
- "3. Third-Party Collaboration" heading
- Body paragraph about no data sharing with advertisers

Section 4 — no card:
- "4. Rights & Retention" heading
- Body paragraph about right to erase data

CTA button at bottom:
- Solid gold background (#C4A882, NOT gradient), full width, 12px radius, py-16
- "ACKNOWLEDGE & CONTINUE" (12px, semibold, uppercase, tracking 2px, on-primary text)

Footer: "LAST UPDATED: OCTOBER 2023" (10px, uppercase, tracking 2px, very faint #D0C5B8 at 40% opacity)

=== SCREEN 31: SETTINGS — TERMS OF SERVICE ===
Full screen, #131313 background. Legal terms with editorial magazine styling.

Header:
- Left group: back arrow (24px, gold) + "THE ARCHITECTURAL LENS" (20px, uppercase, tracking 4px, Noto Serif, #F5F0EB)
- Right: 32×32 avatar placeholder (#2A2A2A)

Hero:
- "Terms of Service" display headline (56px, Noto Serif, warm white, lineHeight 62, letterSpacing -1px)
- Gold accent bar (48px wide, 2px tall, #E1C39B)

Content sections (scrollable, gap 48px):

Intro block (#1C1B1B card, 12px radius, padding 24px):
- "UPDATED OCTOBER 2023" label (11px, uppercase, gold, tracking 1.1px)
- Welcome text: "Welcome to The Architectural Lens. By accessing our studio gallery and digital monographs, you agree to be bound by the following aesthetic and legal standards. Our platform is a curated space dedicated to the silent observation of design." (14px, secondary, lineHeight 22)

Clause 1 — open layout:
- "1. Curated Access" heading (20px, Noto Serif, warm white)
- Two paragraphs about usage restrictions and intellectual property (14px, secondary, lineHeight 25)

Decorative image interstitial:
- Full-width interior architecture photo (16:9, 12px radius, 80% opacity)

Clause 2 — open layout:
- "2. User Conduct" heading
- Paragraph about "No Clutter" policy (14px, secondary, lineHeight 25)

Highlighted clause (#2A2A2A card, 12px radius, padding 24px):
- "LIABILITY & INDEMNITY" label (11px, uppercase, tracking 1.1px, warm white)
- Body text about disclaimers (14px, secondary, lineHeight 22)

Clause 3 — open layout:
- "3. Data Stewardship" heading
- Paragraph about data handling

Footer:
- "THE ARCHITECTURAL LENS © 2024" copyright (11px, uppercase, tracking 1.1px, #D0C5B8 at 50% opacity)
- CTA button: solid gold bg (#C4A882), full width, centered, py-16, 12px radius
  - "Acknowledge & Return" (14px, semibold, on-primary text)

=== SCREEN 32: ERROR SCREEN ===
Full screen, #131313 background. Centered error state shown when AI generation fails.

Centered content (vertically and horizontally centered):

Icon cluster:
- Atmospheric glow: 144×144 faded circle (#F5F0EB at 6% opacity) behind icon
- Icon box: #1C1B1B background, 12px radius, padding 24px
  - warning-outline icon (60px, gold #C4A882)

Title: "Something Went Wrong." (28px, Noto Serif, #F5F0EB, centered, lineHeight 34)
Description: "We encountered an unexpected structural error during the render. Credits have been refunded to your studio account." (14px, Inter, secondary text, centered, relaxed line-height)

Action buttons (stacked vertically, maxWidth 320px, gap 16px):
- Primary: "Try Again" — gold gradient, height 56px, 12px radius, centered text (16px, semibold, on-primary)
- Secondary: "Contact Support" — #353534 background, height 56px, 12px radius, centered text (11px, uppercase, tracking 1.1px, #F5F0EB)

Decorative footer (at very bottom, centered):
- "ERROR LOG REF: 0X8A4_CURATOR" (11px, uppercase, tracking 2.2px, warm white at 20% opacity)

=== SCREEN 33: 404 NOT FOUND ===
Full screen with dramatic background. Cinematic error page.

Full-bleed background:
- Large beautiful interior architecture photo covering entire screen
- Dark gradient overlay from top: rgba(19,19,19,0.80) → rgba(19,19,19,0.60) → transparent (top-to-bottom, for text readability)
- Dark gradient overlay from bottom: rgba(19,19,19,0.20) → rgba(19,19,19,1.0) (bottom darkening for CTA area)

Content (vertically centered, left-aligned, px-32):
- "ERROR 404" label (11px, uppercase, tracking 2.2px, gold)
- "Page Not\nFound" headline (48px, Noto Serif, warm white, 2 lines, tight line-height)
- "The space you are looking for has been moved or archived." description (18px, Inter, secondary text, maxWidth 280px, relaxed line-height)

CTA button (left-aligned, NOT full width — fits content):
- Gold gradient background, 12px radius, px-40 py-20
- "Return to Studio" (16px, Inter, medium weight, on-primary text)

Device frame: iPhone 15 Pro, portrait, 393×852 viewport.
Generate each screen as a separate, complete mobile screen design.
All screens must maintain visual consistency with Batch 1 (auth + studio), Batch 2 (gallery, history, profile, credits, plans), and Batch 3 (generation, results, smart edit, style transfer, settings) — same colors, fonts, spacing, and component styles throughout.
```
