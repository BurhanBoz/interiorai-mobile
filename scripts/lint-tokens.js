#!/usr/bin/env node
/**
 * lint-tokens — a non-blocking hex-literal detector.
 *
 * The design-token layer (config/theme.ts + tailwind.config.js) is the
 * single source of truth for color. Any #RRGGBB / #RGB / #RRGGBBAA
 * literal outside those two files is drift: a shortcut that will age
 * into inconsistency as the palette evolves.
 *
 * This script scans app/ and components/ for raw hex literals in .tsx
 * files, grouped by file, and prints a baseline count. It always exits
 * 0 — it's a health-check, not a gate. Wire it into CI later to fail
 * on NEW violations only (diff-style) once the baseline has been burned
 * down in a dedicated pass.
 *
 * Usage: npm run lint:tokens
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components"];
const EXEMPT_FILES = new Set([
  path.join(ROOT, "config", "theme.ts"),
  path.join(ROOT, "tailwind.config.js"),
]);

// 3–8 hex chars so #RGB / #RRGGBB / #RRGGBBAA all match.
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith(".tsx")) yield full;
  }
}

function scanFile(file) {
  const src = fs.readFileSync(file, "utf8");
  const matches = [];
  let match;
  while ((match = HEX_RE.exec(src))) {
    // Skip obvious non-colors (rare but possible): hashes at word boundaries
    // inside URLs, SHA prefixes, etc. Color hexes live inside strings or
    // style objects — the 3-8 char length is a conservative filter.
    matches.push({ hex: match[0], index: match.index });
  }
  return matches;
}

function main() {
  let totalHits = 0;
  let filesWithHits = 0;
  const byFile = [];

  for (const dirName of SCAN_DIRS) {
    const dir = path.join(ROOT, dirName);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      if (EXEMPT_FILES.has(file)) continue;
      const hits = scanFile(file);
      if (hits.length > 0) {
        filesWithHits++;
        totalHits += hits.length;
        byFile.push({
          rel: path.relative(ROOT, file),
          count: hits.length,
        });
      }
    }
  }

  byFile.sort((a, b) => b.count - a.count);

  console.log("\n── design-token lint — hex baseline ──────────────────────\n");
  if (byFile.length === 0) {
    console.log("✓ No hardcoded hex literals found in app/ or components/.");
  } else {
    for (const { rel, count } of byFile) {
      const bar = "█".repeat(Math.min(count, 24));
      console.log(`  ${String(count).padStart(4)} ${bar.padEnd(24)}  ${rel}`);
    }
    console.log("\n  ─────────────────────────────");
    console.log(
      `  ${String(totalHits).padStart(4)} total hex literals across ${filesWithHits} files`,
    );
    console.log(
      "\n  Exemptions: config/theme.ts, tailwind.config.js (the token layer).",
    );
    console.log(
      "  Goal: drive this baseline down in future passes. New code should reference\n  theme.color.* or tailwind classes instead of inline #RRGGBB values.",
    );
  }
  console.log("");
  // Non-blocking: always exit 0.
  process.exit(0);
}

main();
