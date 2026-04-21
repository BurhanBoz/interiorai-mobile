#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# clean.sh — Wipe every layer of cache that causes "I changed
# the code but the Simulator still shows the old version" bugs.
#
# Covers: running Metro, Watchman, node module cache, Expo
# prebuild output, Metro/Haste temp dirs, Xcode DerivedData,
# iOS native build artifacts, and the installed app binary
# on the currently-booted iOS Simulator.
#
# Usage:
#   npm run clean          # clean only
#   npm run clean:start    # clean + npx expo start --clear
#   npm run clean:ios      # clean + npx expo run:ios (native rebuild)
# ─────────────────────────────────────────────────────────────

set -uo pipefail

BUNDLE_ID="com.thearchitecturallens.mobile"
TMP="${TMPDIR:-/tmp}"

echo "🧹 [1/6] Killing Metro / Node / Watchman…"
killall -9 node 2>/dev/null || true
watchman watch-del-all > /dev/null 2>&1 || true

echo "🧹 [2/6] Clearing node + Expo + Metro caches…"
rm -rf node_modules/.cache .expo

echo "🧹 [3/6] Clearing Metro / Haste temp dirs…"
rm -rf "$TMP"/metro-* "$TMP"/haste-map-* "$TMP"/react-* 2>/dev/null || true

echo "🧹 [4/6] Clearing iOS build output + Xcode DerivedData…"
rm -rf ios/build 2>/dev/null || true
rm -rf "$HOME/Library/Developer/Xcode/DerivedData/"* 2>/dev/null || true

echo "🧹 [5/6] Uninstalling app from booted Simulator…"
xcrun simctl uninstall booted "$BUNDLE_ID" 2>/dev/null || true

echo "🧹 [6/6] Done."
echo ""
echo "Next:"
echo "  • JS-only changes:    npx expo start --clear"
echo "  • Native/asset change: npx expo run:ios"
echo "  • Full prebuild:      npx expo prebuild --clean && npx expo run:ios"
