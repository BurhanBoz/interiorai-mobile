#!/usr/bin/env node
/**
 * Refuses to let a development value reach a production build.
 *
 * This exists because of a mistake made here: a build went out with the
 * developer's own `.env` compiled into it. Drop Studio got this guard first,
 * written from that incident. Roomframe — where it happened — did not have it
 * until now.
 *
 * Configuration alone cannot prevent it, for two reasons specific to Expo:
 *
 *   1. `expo export` forces NODE_ENV=production, so you cannot switch files by
 *      setting NODE_ENV yourself — it is already set.
 *   2. The precedence is  .env.[mode].local > .env.local > .env.[mode] > .env
 *      which means a stray `.env.local` OUTRANKS `.env.production`, and any key
 *      `.env.production` does not set falls through to `.env`. Here that
 *      fallthrough lands on http://localhost:8080.
 *
 * So the protection has to be a gate, not a convention. This resolves the files
 * exactly as the bundler will, then asserts that what came out is fit to ship.
 *
 *   node scripts/check-env.js production
 *   node scripts/check-env.js development
 */
const fs = require('fs');
const path = require('path');

const mode = process.argv[2] === 'development' ? 'development' : 'production';
const root = path.resolve(__dirname, '..');

/** Expo/dotenv order, lowest priority first — later files overwrite earlier. */
const FILES = [`.env`, `.env.${mode}`, `.env.local`, `.env.${mode}.local`];

function parse(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return null;
  const out = {};
  for (const raw of fs.readFileSync(full, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    out[line.slice(0, eq).trim()] = line
      .slice(eq + 1)
      .trim()
      .replace(/^["'](.*)["']$/, '$1');
  }
  return out;
}

const resolved = {};
const origin = {};
const loaded = [];
for (const file of FILES) {
  const values = parse(file);
  if (!values) continue;
  loaded.push(file);
  for (const [k, v] of Object.entries(values)) {
    resolved[k] = v;
    origin[k] = file;
  }
}

const problems = [];
const note = (msg) => problems.push(msg);

function required(key, test, expectation) {
  const value = resolved[key];
  if (value === undefined || value === '') {
    note(`${key} is not set (looked in ${FILES.join(', ')})`);
    return;
  }
  if (!test(value)) {
    note(`${key}=${value}\n      from ${origin[key]} — ${expectation}`);
  }
}

if (mode === 'production') {
  // A `.env.local` outranks `.env.production`, so its mere existence is the
  // hazard. There is no legitimate use for one in this project.
  if (fs.existsSync(path.join(root, '.env.local'))) {
    note(
      '.env.local exists and takes priority over .env.production.\n' +
        '      Delete it — that file is the exact way a dev value ships.',
    );
  }
  if (fs.existsSync(path.join(root, '.env.production.local'))) {
    note('.env.production.local exists and outranks everything. Delete it.');
  }

  required(
    'EXPO_PUBLIC_API_URL',
    (v) =>
      v.startsWith('https://') &&
      !/localhost|127\.0\.0\.1|ngrok|trycloudflare|\d+\.\d+\.\d+\.\d+|\.local(:|$)/i.test(v),
    'a production build must point at the real API over https — not localhost, a LAN address or a tunnel',
  );
  required(
    'EXPO_PUBLIC_ENV',
    (v) => v === 'production',
    'should be "production" so anything reading it behaves accordingly',
  );
  required(
    'EXPO_PUBLIC_ENABLE_LOGGING',
    (v) => v === 'false',
    'request/response logging in a shipped build leaks tokens into the device console',
  );
  required(
    'EXPO_PUBLIC_REVENUECAT_API_KEY_IOS',
    (v) => v.startsWith('appl_') && v.length > 20,
    'must be the real public App Store key. Without it the paywall ships with nothing to sell',
  );
  required(
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
    (v) => v.endsWith('.apps.googleusercontent.com'),
    'Google sign-in silently fails without it',
  );
  required(
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    (v) => v.endsWith('.apps.googleusercontent.com'),
    'Google sign-in silently fails without it',
  );
}

const label = mode === 'production' ? 'PRODUCTION' : 'development';
console.log(`\n  ${label} env — files loaded, lowest priority first:`);
console.log(`    ${loaded.length ? loaded.join('  →  ') : '(none found)'}\n`);
for (const key of Object.keys(resolved).filter((k) => k.startsWith('EXPO_PUBLIC_')).sort()) {
  const shown = /KEY|TOKEN|SECRET/i.test(key)
    ? resolved[key].slice(0, 9) + '…'
    : resolved[key];
  console.log(`    ${key.padEnd(36)} ${shown.padEnd(44)} (${origin[key]})`);
}

if (problems.length) {
  console.error(`\n  ✖ ${problems.length} problem(s) — this must not be built for production:\n`);
  problems.forEach((p) => console.error(`    • ${p}`));
  console.error('');
  process.exit(1);
}
console.log(`\n  ✓ ${label} configuration is fit to ship.\n`);
