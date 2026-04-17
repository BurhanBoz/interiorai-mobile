# Stitch Prompt — Batch 1 (Screens 1–10)

## Full Screen List (38 total — for reference)

| #   | Screen                               | Batch |
| --- | ------------------------------------ | ----- |
| 1   | Onboarding (3-slide carousel)        | **1** |
| 2   | Login                                | **1** |
| 3   | Register                             | **1** |
| 4   | Forgot Password                      | **1** |
| 5   | Studio — Empty (Upload Photo)        | **1** |
| 6   | Studio — Photo Uploaded              | **1** |
| 7   | Studio — Room Type & Style Selection | **1** |
| 8   | Studio — Design Options              | **1** |
| 9   | Studio — Review & Generate           | **1** |
| 10  | Side Drawer / Navigation Menu        | **1** |
| 11  | Gallery — Empty State                | 2     |
| 12  | Gallery — With Items                 | 2     |
| 13  | History — Empty State                | 2     |
| 14  | History — With Items                 | 2     |
| 15  | Profile                              | 2     |
| 16  | Credits Dashboard                    | 2     |
| 17  | Credits Exhausted                    | 2     |
| 18  | Plans — Selection                    | 2     |
| 19  | Plans — Confirm                      | 2     |
| 20  | Upsell Modal                         | 2     |
| 21  | Generation — Progress                | 3     |
| 22  | Generation — Upscale                 | 3     |
| 23  | Result — Detail                      | 3     |
| 24  | Result — Before/After Compare        | 3     |
| 25  | Smart Edit (Inpainting)              | 3     |
| 26  | Style Transfer                       | 3     |
| 27  | Settings — Language                  | 3     |
| 28  | Settings — Notifications             | 3     |
| 29  | Settings — Help & FAQ                | 4     |
| 30  | Settings — Privacy Policy            | 4     |
| 31  | Settings — Terms of Service          | 4     |
| 32  | Error Screen                         | 4     |
| 33  | 404 Not Found                        | 4     |
| 34+ | Additional states/variants           | 4     |

---

## Stitch Prompt — Batch 1

```
Create a mobile app design system and 10 screens for "The Architectural Lens" — a premium AI-powered interior design app for iOS. The app lets users upload room photos and generate AI-redesigned interiors. The aesthetic is a dark luxury-gallery curator vibe.

=== DESIGN SYSTEM ===

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
- Bottom navigation: glassmorphic bar (surface 70% opacity + 20px frosted blur), 4 tabs: Studio (cube), Gallery (grid), History (time), Profile (person)
- Scale-on-press feedback on interactive elements (show pressed state at 98% scale)
- Step indicators: "STEP 1 OF 4" in gold label style above headlines

APP HEADER (appears on ALL main screens):
- Left: hamburger menu icon (gold, 24px) + app name "THE ARCHITECTURAL\nLENS" (2 lines, 14px, uppercase, tracking 3px, Noto Serif)
- Right: circular user avatar (36px diameter)
- Horizontal padding: 32px
- Vertical padding: 16px

SIDE DRAWER (opens from hamburger):
- Full-height left panel, width ~80% of screen, background #1C1B1B
- Dark overlay on rest of screen
- Top section: user avatar (64px) + display name + email + credit balance with flash icon
- Navigation section: "NAVIGATE" label header, items: Studio, Gallery, History, Profile — each with left icon + text + right chevron
- Settings section: "SETTINGS" label header, items: Language, Notifications, Help, Privacy Policy — each with left icon + text + right chevron
- Bottom: Sign Out button with red icon and text
- Each item has subtle separator line (#4D463C)
- Active/current page item highlighted with gold text

=== SCREEN 1: ONBOARDING ===
3-slide welcome carousel on #131313 background.
Each slide:
- Large hero image at top (60% height) — show gorgeous AI-generated interior photos
- Below image: small dot pagination (gold active, muted inactive)
- Headline in Noto Serif, 32px, warm white
- Subtitle in Inter, 14px, secondary text color
- Slide 1: "Reimagine Your Space" / "Upload any room and watch AI transform it into your dream interior."
- Slide 2: "Every Detail, Perfected" / "Choose from curated architectural styles — modern, classic, industrial and more."
- Slide 3: "Your Vision, Realized" / "Professional-grade renders in seconds. Start designing today."
- Bottom: CTA button "Get Started" (gold gradient, full width, arrow-forward icon right)
- Above button: "Already have an account? Sign In" text link in gold

=== SCREEN 2: LOGIN ===
Full screen, #131313 background.
- "Welcome\nBack" headline (36px, Noto Serif, 2 lines)
- Subtitle: "Sign in to continue your design journey" (14px, secondary text)
- Email input field (#2A2A2A bg, 12px radius, mail icon left, placeholder "Email address")
- Password input field (#2A2A2A bg, 12px radius, lock icon left, eye toggle right, placeholder "Password")
- "Forgot Password?" right-aligned text link in gold, small
- CTA button "Sign In" (gold gradient, full width, arrow-forward right)
- Divider: horizontal line with "or continue with" text centered
- Social login row: Google + Apple buttons (outlined style, icon + text, side by side)
- Bottom: "Don't have an account? Register" text with gold "Register" link
- All content centered vertically with generous spacing

=== SCREEN 3: REGISTER ===
Full screen, #131313 background.
- Background: subtle, blurred interior design image at ~10% opacity behind content
- "Create\nAccount" headline (36px, Noto Serif, 2 lines)
- Subtitle: "Join the future of interior design" (14px, secondary text)
- Full name input field
- Email input field
- Password input field (with eye toggle)
- CTA button "Create Account" (gold gradient, full width, arrow-forward right)
- Divider: "or continue with"
- Social login row: Google + Apple
- Bottom: "Already have an account? Sign In"

=== SCREEN 4: FORGOT PASSWORD ===
Minimal, centered layout on #131313.
- Back arrow at top left (gold)
- Lock icon in a circle (surface-container-high bg, gold icon, 80px, centered)
- "Reset\nPassword" headline (36px, Noto Serif)
- "Enter your email and we'll send you instructions to reset your password." subtitle
- Email input field
- CTA button "Send Reset Link" (gold gradient, full width, arrow-forward right)
- Bottom: "Remember your password? Sign In" link

=== SCREEN 5: STUDIO — EMPTY STATE (Upload Photo) ===
App header at top (hamburger + name + avatar).
- "STEP 1 OF 4" gold label above headline
- "Analyze Your Space" headline (36px, Noto Serif)
- "Upload a room photo to begin the transformation process." subtitle
- Large dashed-border upload zone (centered, 200px tall, rounded-xl, border color #4D463C dashed 2px):
  - Cloud-upload icon (48px, gold)
  - "Tap to Upload" text (gold, label style)
  - "JPG, PNG — Max 10MB" small muted text
- OR text divider
- "Take a Photo" outlined button (camera icon left)
- Below: 3 tip cards horizontally scrollable:
  - Each card: #1C1B1B bg, 12px radius, small gold icon, tip text in secondary color
  - Tips: "Ensure natural daylight illuminates the space", "Capture from a corner angle to maximize spatial volume", "Clear loose objects to expose the true architectural lines"
- Bottom: glassmorphic tab bar

=== SCREEN 6: STUDIO — PHOTO UPLOADED ===
App header at top.
- "STEP 1 OF 3" gold label
- "Analyze Your Space" headline
- "We'll examine structural lines, spatial volume, and lighting potential of your environment." subtitle
- Uploaded photo preview (4:3 aspect ratio, rounded-xl, fills width)
- Small X button on top-right of photo to remove
- "Change Photo" gold text link below photo
- CTA button at bottom: "Continue to Architecture" (gold gradient, text left, arrow right, full width)

=== SCREEN 7: STUDIO — ROOM TYPE & STYLE SELECTION ===
App header at top.
- "STEP 2 OF 4" gold label
- "Describe Your Space" headline (36px, Noto Serif)
- "Select the spatial category and design language to guide the AI transformation." subtitle

ROOM TYPE section:
- "ROOM TYPE" section label (gold, label-sm style)
- Horizontal scrolling chips (pill-shaped, outlined by default, gold fill when selected):
  - Living Room, Bedroom, Kitchen, Bathroom, Office, Dining Room, etc.

DESIGN STYLE section:
- "DESIGN STYLE" section label
- 2-column grid of style cards, each card:
  - Interior photo thumbnail (4:5 aspect ratio, top, rounded-top-xl)
  - Below photo: card footer (#1C1B1B bg) with "STYLE" label + style name
  - Selected state: gold border glow, label changes to "SELECTED" in gold
  - Styles: Modern Minimalist, Art Deco, Industrial Loft, Japandi, Mid-Century Modern, Coastal, etc.

Bottom: CTA "Next Step" (gold gradient, full width, text left, arrow right)

=== SCREEN 8: STUDIO — DESIGN OPTIONS ===
App header at top.
- "STEP 3 OF 4" gold label
- "Design Settings" headline
- "Customize the generation with these additional parameters." subtitle

Scrollable content:
- DESIGN MODE section: horizontal chips (Redesign selected by default, Empty Room, Exterior, Style Transfer — locked items show lock icon)
- QUALITY section: 3-option segmented control (Standard / HD ★ / Ultra HD ★★), selected = gold fill
- AI STRENGTH slider: horizontal slider 0–100%, value label, track in gold
- COLOR PALETTE section: horizontal scrolling color circles (pastel, warm, monochrome, earth, cool), selected has gold ring
- VARIANTS: stepper (minus/plus) showing count, 1–4 range
- PRESERVE LAYOUT toggle: toggle switch with label
- CUSTOM PROMPT: text area input (#2A2A2A bg, 12px radius, 4 lines)

Bottom: CTA "Next" (gold gradient, pill shape rounded-full, centered, icon+text — this one is intentionally different: a floating pill centered at bottom)

=== SCREEN 9: STUDIO — REVIEW & GENERATE ===
App header at top.
- "STEP 4 OF 4" gold label
- "Final Review" headline
- "Verify your configuration before initiating the AI rendering process." subtitle

Content:
- Photo preview with room type + style badges overlaid at bottom
- 2-column summary grid:
  - Card 1: "MODE" label + mode value (e.g. "Redesign")
  - Card 2: "QUALITY" label + quality value (e.g. "Ultra High (4K)")
  - Card 3: "STRENGTH" label + percentage
  - Card 4: "VARIANTS" label + count ("02 Iterations")
  - Each card: #2A2A2A bg, 12px radius
- Cost display: flash icon + "24 Credits" in gold label style
- Balance section: "Current Balance" left, "148" + "Credits" right
- CTA: "Generate" (gold gradient, text left, sparkles icon right, full width)
- Small italic text below: "Estimated generation time: 45 seconds"

=== SCREEN 10: SIDE DRAWER / NAVIGATION MENU ===
Show the side drawer overlaid on the Studio screen:
- Dark semi-transparent overlay covering the right portion of screen
- Left drawer panel (width ~80%, #1C1B1B background, full height):
  - Top: user avatar (64px circle) + "John Doe" name + "john@email.com" + credit balance pill (flash icon + "148 Credits")
  - Divider line (#4D463C)
  - "NAVIGATE" section header (gold label-sm):
    - Studio (cube icon) — highlighted/active in gold
    - Gallery (grid icon)
    - History (time icon)
    - Profile (person icon)
    - Each item: icon left + text middle + chevron-forward right, full width, py-14 padding
  - Divider line
  - "SETTINGS" section header:
    - Language (globe icon)
    - Notifications (notifications icon)
    - Help (help-circle icon)
    - Privacy Policy (shield icon)
  - Divider line
  - Sign Out (log-out icon, red tint text)

Device frame: iPhone 15 Pro, portrait, 393×852 viewport.
Generate each screen as a separate, complete mobile screen design.
```

---

## How to Use

1. Copy the prompt above (everything between the ``` code fences)
2. Paste into Stitch as a single project prompt
3. Stitch will generate 10 screen designs
4. We'll implement each screen from the Stitch output
5. Then move to Batch 2, 3, and 4 for the remaining screens
