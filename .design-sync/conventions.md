# Roomframe AI — design conventions

Roomframe AI is a live iOS app (iPhone, 390 × 844 pt) that redesigns a photo of the user's own room. This design system is **tokens-only**: the real components are React Native and are not in this bundle, so build screens from plain HTML/React styled with the `--rf-*` tokens below. Design for a phone frame 390 px wide; there is no light theme.

## Setup
Link `styles.css` once. It loads the fonts and every token, and sets the page to the dark ground (`--rf-ground`) with Inter body text. Without it text falls back to system fonts on white.

## Styling idiom — CSS custom properties, `--rf-*`
- **Ground and surfaces:** page `--rf-ground`; cards and plan rows `--rf-surface`; sheets `--rf-sheet`; raised `--rf-surface-high` / `--rf-surface-highest`.
- **Text:** `--rf-ink` primary, `--rf-ink-variant` secondary, `--rf-ink-muted` captions. Text on gold is always `--rf-on-gold`, never white.
- **Accent:** `--rf-gold` for selected borders, kickers and links; `--rf-gold-dawn` for active icons. Primary button: `background: var(--rf-gradient-primary)` (or `--rf-button-fill`), label `--rf-on-gold`, `font: var(--rf-button)`, `letter-spacing: var(--rf-track-button)`, uppercase, height `--rf-button-h`, radius `--rf-radius-button`.
- **Type:** headlines in Noto Serif via `font: var(--rf-display-l)` … `var(--rf-title)`, sentence case. UI text in Inter: `--rf-body-s`, `--rf-row`, `--rf-caption`. The only uppercase styles are `--rf-button`, `--rf-tier`, `--rf-kicker`, `--rf-brand`, each with its `--rf-track-*` letter-spacing.
- **Shape:** `--rf-radius-card` (18) cards, `--rf-radius-tile` (14) tiles and thumbnails, `--rf-radius-sheet` (26) sheets, `--rf-radius-pill` chips. Side padding `--rf-gutter`; spacing `--rf-space-*`.
- **Depth:** `--rf-shadow-sm|md|lg`; selected gold elements may glow with `--rf-glow-gold`. Lines: `--rf-line-neutral`, accent hairline `--rf-line-accent`.
- **On photographs:** chips and labels over a room photo use `--rf-photo-chrome` with a 1px `--rf-photo-chrome-border`; caption gradients `--rf-gradient-image-caption`.

## Where the truth lives
Read `tokens/colors.css`, `tokens/typography.css`, `tokens/layout.css`, `tokens/effects.css` before styling. `guidelines/product-rules.md` lists what screens must and must not contain; `guidelines/screens.md` describes each screen; `guidelines/reference/` shows the current app.

## Example
```html
<link rel="stylesheet" href="styles.css">
<section style="padding: 0 var(--rf-gutter); display:grid; gap: var(--rf-space-lg)">
  <p style="font: var(--rf-kicker); letter-spacing: var(--rf-track-kicker); text-transform: uppercase; color: var(--rf-ink-muted)">Roomframe</p>
  <h1 style="font: var(--rf-display-l); color: var(--rf-ink); margin:0">Redesign every room</h1>
  <button style="height: var(--rf-button-h); border:0; border-radius: var(--rf-radius-button); background: var(--rf-gradient-primary); color: var(--rf-on-gold); font: var(--rf-button); letter-spacing: var(--rf-track-button); text-transform: uppercase">Start Pro</button>
</section>
```
