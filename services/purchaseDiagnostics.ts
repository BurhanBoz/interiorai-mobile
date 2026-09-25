import { AppState, Platform } from "react-native";
import Purchases, { type LOG_LEVEL } from "react-native-purchases";

/**
 * What one purchase attempt looked like from inside the app (1.7.1, V188).
 *
 * WHY THIS FILE EXISTS
 * On 2026-09-25 two TestFlight installs pressed "buy" thirteen times between
 * them and never saw Apple's sheet. One got "Purchase was cancelled." about
 * 210 ms after every tap. The other waited up to four minutes, then had seven
 * attempts cancelled within 80 ms of each other — one for every time the
 * paywall had been closed and reopened. The rows said USER_CANCELLED and
 * nothing else: whether anyone saw the sheet had to be inferred from the
 * timestamps around them, and why it never came could not be answered at all.
 *
 * So every attempt now carries:
 *  - its timing, the StoreKit call on its own — nobody closes Apple's sheet
 *    in 210 ms, so {@link INSTANT_MS} separates "changed their mind" from
 *    "no sheet was ever shown";
 *  - what the device says when it ends — may it make payments (Screen Time),
 *    which storefront it is signed in to, whether the app was in front;
 *  - RevenueCat's underlying error and its last log lines, the only place
 *    StoreKit's own words for a failure reach JavaScript.
 *
 * And there is one attempt at a time, app-wide. Every screen already refused a
 * second tap while it was busy, but a reopened paywall is a fresh screen —
 * which is how seven purchases came to wait on one sheet.
 *
 * THE RULE: diagnostics never cost a purchase. Everything here is
 * best-effort and swallows its own failures.
 */

/** Under this, a "cancelled" StoreKit call means there was no sheet to cancel. */
export const INSTANT_MS = 1000;

/** An attempt older than this stops blocking new ones: StoreKit may never answer it. */
const STALE_MS = 120_000;

/** paywall_events.diagnostics is VARCHAR(1000), and the endpoint refuses anything longer. */
const MAX_DIAGNOSTICS = 1000;

const LOG_RING = 40;
const LOG_LINES_KEPT = 6;
const LOG_LINE_MAX = 140;
const PROBE_TIMEOUT_MS = 500;

type Kind = "subscription" | "pack";

export type PurchaseAttempt = {
    kind: Kind;
    productId: string | null;
    startedAt: number;
    storeAt: number | null;
    storeEndAt: number | null;
    endedAt: number | null;
    appAtStart: string;
    appAtEnd: string | null;
    /** How long the attempt this one replaced had been open, when it was replaced as stale. */
    replacedStaleMs: number | null;
};

/** What an outcome event carries. */
export type PurchaseEvidence = {
    /** StoreKit call to outcome; attempt start to outcome when StoreKit was never reached. */
    durationMs: number | null;
    /** The StoreKit call on its own — the number {@link INSTANT_MS} is compared with. */
    storeMs: number | null;
    /** JSON, at most {@link MAX_DIAGNOSTICS} characters. */
    diagnostics: string | null;
};

let current: PurchaseAttempt | null = null;
let lastSuccess: PurchaseAttempt | null = null;
/** A failed attempt, found again from the error its purchase threw. */
const attemptOfError = new WeakMap<object, PurchaseAttempt>();

type LogLine = { at: number; level: string; msg: string };
const logRing: LogLine[] = [];
let logCaptureInstalled = false;

/**
 * RevenueCat opens its lines with emoji, which the column cannot store — the
 * first TestFlight rows read "I ? Purchasing…" and "E ??? Purchase was
 * cancelled.". Supplementary-plane characters and the symbol blocks emoji
 * live in are dropped; letters of any script stay, because StoreKit's own
 * error text can arrive in the device's language. Plain ES5 on purpose.
 */
const EMOJI = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2100-\u214F\u2190-\u21FF\u2300-\u23FF\u2460-\u24FF\u25A0-\u27BF\u2900-\u297F\u2B00-\u2BFF\u203C\u2049\uFE0F\u200D]/g;

/**
 * Lines worth a place in the 1000 characters: every WARN and ERROR, and the
 * INFO lines about the purchase itself. Housekeeping such as "Marking
 * attributes as synced for App User ID: …" says nothing about why a sheet
 * did not open.
 */
const RELEVANT = /purchas|transaction|storekit|payment|product|receipt|sign|cancel|fail|error|restor/i;

/**
 * Keep RevenueCat's recent log lines. Release builds log at INFO, so this
 * sees INFO, WARN and ERROR — StoreKit's error descriptions among them.
 *
 * <p>Install before {@code Purchases.configure}: configure only puts in its own
 * console handler when none is set, so ours forwards to the console in dev
 * builds to keep that output.
 */
export function installPurchaseLogCapture(): void {
    if (logCaptureInstalled) return;
    try {
        Purchases.setLogHandler((level: LOG_LEVEL, message: string) => {
            // Runs for every line RevenueCat logs, from app start: it must
            // never throw — an exception here is an app crash in release.
            try {
                const msg = String(message).replace(EMOJI, "").replace(/\s+/g, " ").trim().slice(0, 300);
                logRing.push({ at: Date.now(), level: String(level), msg });
                if (logRing.length > LOG_RING) logRing.shift();
                if (__DEV__) console.log(`[RevenueCat] ${message}`);
            } catch {
                // A lost log line is the whole cost.
            }
        });
        logCaptureInstalled = true;
    } catch {
        // No log capture is a smaller loss than a purchase flow that throws.
    }
}

/**
 * Open an attempt, or return null while another one is still open — the
 * caller refuses the purchase instead of queueing it behind the first.
 */
export function beginPurchaseAttempt(kind: Kind, productId: string | null): PurchaseAttempt | null {
    const now = Date.now();
    let replacedStaleMs: number | null = null;
    if (current) {
        const age = now - current.startedAt;
        if (age < STALE_MS) return null;
        replacedStaleMs = age;
    }
    current = {
        kind,
        productId,
        startedAt: now,
        storeAt: null,
        storeEndAt: null,
        endedAt: null,
        appAtStart: AppState.currentState ?? "unknown",
        appAtEnd: null,
        replacedStaleMs,
    };
    return current;
}

/** Milliseconds the open attempt has been waiting, for the "already open" refusal. */
export function openAttemptAgeMs(): number | null {
    return current ? Date.now() - current.startedAt : null;
}

/** Just before the StoreKit call — the purchase sheet is Apple's from here. */
export function markStoreCall(a: PurchaseAttempt): void {
    a.storeAt = Date.now();
}

/** The StoreKit call settled, either way. */
export function markStoreEnd(a: PurchaseAttempt): void {
    a.storeEndAt = Date.now();
}

/**
 * Close an attempt. With an error, the error remembers it, so the outcome is
 * described from the attempt that failed even if another one has started
 * since. Without one, it is the success the next PURCHASED event describes.
 * Safe to call twice: the first call's timing stands.
 */
export function finishPurchaseAttempt(a: PurchaseAttempt, error?: unknown): void {
    if (a.endedAt == null) {
        a.endedAt = Date.now();
        a.appAtEnd = AppState.currentState ?? "unknown";
    }
    if (current === a) current = null;
    if (error !== undefined) {
        if (error !== null && typeof error === "object") attemptOfError.set(error, a);
    } else {
        lastSuccess = a;
    }
}

async function probe<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
        return await Promise.race([
            fn(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), PROBE_TIMEOUT_MS)),
        ]);
    } catch {
        return null;
    }
}

/** RevenueCat's error fields, when the error is one of its PurchasesErrors. */
function rcFields(e: unknown): Record<string, string> | null {
    if (e === null || typeof e !== "object") return null;
    const rc = e as {
        code?: unknown;
        readableErrorCode?: unknown;
        userInfo?: { readableErrorCode?: unknown };
        underlyingErrorMessage?: unknown;
    };
    if (rc.code == null) return null;
    const out: Record<string, string> = { c: String(rc.code) };
    const readable = rc.userInfo?.readableErrorCode ?? rc.readableErrorCode;
    if (readable != null) out.r = String(readable).slice(0, 60);
    if (rc.underlyingErrorMessage) out.u = String(rc.underlyingErrorMessage).slice(0, 160);
    return out;
}

/** RevenueCat's lines from the attempt's start until now — the rejection can arrive before its log line. */
function logsSince(a: PurchaseAttempt): string[] {
    return logRing
        .filter((l) => l.at >= a.startedAt - 50)
        .filter((l) => l.level === "WARN" || l.level === "ERROR" || RELEVANT.test(l.msg))
        .slice(-LOG_LINES_KEPT)
        .map((l) => `${l.level.charAt(0)} ${l.msg.slice(0, LOG_LINE_MAX)}`);
}

/** Serialise within the column: drop the oldest log lines first, then shorten the error text. */
function fit(d: Record<string, unknown>): string {
    let s = JSON.stringify(d);
    const log = Array.isArray(d.log) ? (d.log as string[]) : [];
    while (s.length > MAX_DIAGNOSTICS && log.length > 0) {
        log.shift();
        s = JSON.stringify(d);
    }
    const rc = d.rc as Record<string, string> | undefined;
    if (s.length > MAX_DIAGNOSTICS && rc?.u) {
        rc.u = rc.u.slice(0, 40);
        s = JSON.stringify(d);
    }
    if (s.length > MAX_DIAGNOSTICS) {
        const { k, p, canPay, sf, app, ios } = d;
        s = JSON.stringify({ k, p, canPay, sf, app, ios }).slice(0, MAX_DIAGNOSTICS);
    }
    return s;
}

/**
 * Describe a purchase's outcome for its paywall event.
 *
 * @param e the error the purchase threw; omit it to describe the last success.
 */
export async function describePurchase(e?: unknown): Promise<PurchaseEvidence> {
    try {
        let a: PurchaseAttempt | null = null;
        if (e === undefined) {
            a = lastSuccess;
            lastSuccess = null;
        } else if (e !== null && typeof e === "object") {
            a = attemptOfError.get(e) ?? null;
        }
        const storeMs = a?.storeAt != null && a.storeEndAt != null ? a.storeEndAt - a.storeAt : null;
        const durationMs = storeMs ?? (a?.endedAt != null ? a.endedAt - a.startedAt : null);

        const [canPay, storefront] = await Promise.all([
            probe(() => Purchases.canMakePayments()),
            // null from the SDK is itself the finding: no storefront, usually no App Store account.
            probe(async () => (await Purchases.getStorefront())?.countryCode ?? "none"),
        ]);

        const d: Record<string, unknown> = {
            k: a?.kind ?? null,
            p: a?.productId ?? null,
            canPay,
            sf: storefront,
            app: a ? `${a.appAtStart}>${a.appAtEnd ?? "?"}` : AppState.currentState ?? "unknown",
            ios: String(Platform.Version),
        };
        if (a?.replacedStaleMs != null) d.staleMs = a.replacedStaleMs;
        // Refused before it began: how long the attempt in the way had been open.
        if (e !== undefined && a === null) {
            const openMs = openAttemptAgeMs();
            if (openMs != null) d.openMs = openMs;
        }
        const rc = rcFields(e);
        if (rc) d.rc = rc;
        d.log = a ? logsSince(a) : [];

        return { durationMs, storeMs, diagnostics: fit(d) };
    } catch {
        return { durationMs: null, storeMs: null, diagnostics: null };
    }
}
