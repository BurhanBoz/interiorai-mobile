# Product rules

These are App Store requirements and product decisions already taken. A design that breaks one cannot ship.

## Paywall and prices
- Two plans only: **Pro Weekly** and **Pro Monthly**. Prices come from the App Store at runtime; in designs use the current ones as placeholders: weekly $5.99 the first week, then $7.99/week; monthly $20.99 the first month, then $26.99/month.
- Under the purchase button, state the billed amount and the renewal plainly ("First week $5.99, then $7.99 weekly. Renews automatically; cancel any time in Settings at least 24 hours before renewal.").
- A visible close (X) at the top right. Links: Restore purchases · Terms · Privacy.
- No countdown timers, no fake strike-through prices, no "only N left", no urgency copy.

## Rating
- Ratings use Apple's own star sheet only. Never draw a custom star-rating widget or a "Rate us" card.

## Screen discipline
- Keep the current layout logic of each screen; improve hierarchy, spacing and imagery.
- Do not add step labels ("Step 2 of 4"), helper lines under controls, or full-screen explainer cards.
- The result screen shows the design and its actions, nothing else: no banners, no inline asks, no promo cards.

## Content
- The user's own room photo is the hero wherever it exists (options, progress, result, paywall before/after).
- The app ships in 10 languages: English, Turkish, German, French, Spanish, Italian, Dutch, Japanese, Korean and Arabic. Arabic is right-to-left; German words run long — leave room.
- Credits are the unit of use ("1 credit"); never convert credits to money on screen.

## Accessibility
- Minimum 44 pt touch targets (`--rf-tap-min`); WCAG AA contrast on `--rf-ground`. Text on gold is `--rf-on-gold`.
