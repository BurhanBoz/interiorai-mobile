# design-sync notes — Roomframe AI (interiorai-mobile)

- 2026-10-10 first sync, **tokens-only by the owner's choice**: the app is React Native + NativeWind with no web build (no react-native-web/react-dom) and no Storybook, so the converter's bundle path does not apply. Bundle is produced by `.design-sync/build_bundle.py` (off-script layout); `_ds_bundle.js` is the empty-bodied tokens-only form. No lookalike components — the skill forbids reimplementations.
- Token values are hand-copied from `config/theme.ts` (`umber`, `v2`, `v2Layout`, `elevation`, `gradient`, `motion`, `space`) and `tailwind.config.js`. **Change theme.ts first, then the script.**
- Fonts: the app's own `assets/fonts/*.ttf` (Noto Serif 400/700, Inter 400–700, Archivo 400–700, Instrument Serif). RN names (`NotoSerif`, `Inter-SemiBold`) map to CSS families + weights.
- Reference screenshots in `.design-sync/reference/` come from the iOS simulator (2026-10-09, Release build, TR locale).
- DesignSync needs `/design-login` from an interactive `claude` terminal session; the desktop session cannot run it.

- 2026-10-20 re-sync: tokens updated to the lifted umber ground (build 116: #221C17 etc.), references replaced with 2.6.1 screens, `guidelines/first-run-brief.md` added (owner's radical-redesign brief for the first-run flow), screens.md rewritten for Studio v4. Off-script build again (tokens-only); the skill's `package-validate.mjs` is run against `ds-bundle/` before upload.

## Re-sync risks
- Token drift: any edit to `config/theme.ts` is invisible here until `build_bundle.py` is updated by hand.
- No `_ds_sync.json` anchor (honest choice for an off-script tokens-only bundle) → every sync re-uploads everything; harmless at this size.
- Reference screenshots go stale with each app release.
