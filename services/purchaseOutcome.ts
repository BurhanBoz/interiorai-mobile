import { PURCHASES_ERROR_CODE, type PurchasesError } from "react-native-purchases";
import { isIapError } from "./iap";
import { describePurchase, INSTANT_MS } from "./purchaseDiagnostics";
import { recordPaywallEvent } from "./telemetry";

/**
 * The one place that decides what a failed purchase was, and says so.
 *
 * WHY THIS FILE EXISTS
 * Four screens can start a purchase — the onboarding paywall (twice: plan and
 * pack), the plan confirmation screen, and the credit-packs screen. Each had
 * written its own catch block. Three of them separated "the user cancelled
 * Apple's sheet" from "the purchase failed"; the fourth did not, so every
 * cancellation on the packs screen was recorded as a failure and shown to the
 * user as one.
 *
 * That is not a bug you fix in the fourth copy. Copies drift — this one drifted
 * in nine days — so the decision moves here and the screens stop making it.
 *
 * WHAT WE LOST BY NOT HAVING IT
 * On 2026-09-15 two users lost six purchase attempts, each dying in 220-280ms,
 * and the reason was gone forever: the code threw a bare Error, the screen
 * showed a generic alert, and nothing recorded a cause. RevenueCat could not
 * help either — it records transactions that reached Apple, and these never
 * did. Six failures, zero evidence.
 *
 * THE RULE: never collapse an unrecognised cause into "UNKNOWN". A code we do
 * not have a name for is the most valuable row in the table; it gets a prefix
 * and keeps its identity.
 *
 * A CANCEL IS NOT ALWAYS A PERSON (1.7.1)
 * On 2026-09-25 TestFlight purchases came back "cancelled" ~210 ms after the
 * tap, five times in a row, from someone who never saw Apple's sheet. The app
 * showed nothing — cancelling is a choice, and a choice needs no alert — so
 * they tapped again. A cancel faster than {@link INSTANT_MS} is now a failure
 * of its own (CANCELLED_INSTANTLY) with a message that says what to check, and
 * every outcome carries its timing and the device's state (purchaseDiagnostics).
 */

/** What actually happened, for the caller's UI decision. */
export type PurchaseOutcome = {
    /** True when the user closed Apple's sheet. Not a failure — show nothing. */
    cancelled: boolean;
    /** Stable, groupable cause. */
    code: string;
    /** Raw message, for the cases the code cannot explain on its own. */
    detail: string;
};

/** RevenueCat's numeric codes → names we can group a report by. */
const RC_CODES: Record<string, string> = {
    [PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR]: "USER_CANCELLED",
    [PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR]: "STORE_PROBLEM",
    [PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR]: "PURCHASE_NOT_ALLOWED",
    [PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR]: "PURCHASE_INVALID",
    [PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR]: "PRODUCT_NOT_AVAILABLE",
    [PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR]: "ALREADY_PURCHASED",
    [PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR]: "RECEIPT_IN_USE",
    [PURCHASES_ERROR_CODE.INVALID_RECEIPT_ERROR]: "INVALID_RECEIPT",
    [PURCHASES_ERROR_CODE.NETWORK_ERROR]: "NETWORK",
    [PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR]: "NETWORK",
    [PURCHASES_ERROR_CODE.INVALID_CREDENTIALS_ERROR]: "INVALID_CREDENTIALS",
    [PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR]: "ALREADY_IN_PROGRESS",
    [PURCHASES_ERROR_CODE.INVALID_APP_USER_ID_ERROR]: "INVALID_APP_USER_ID",
    // Not a failure and not a success: "Ask to Buy" or a bank confirmation is
    // outstanding. Named so we can find out whether it ever happens before
    // deciding what the screen should say — today it falls into the failure
    // alert like everything else, which is wrong but is not yet evidenced.
    [PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR]: "PAYMENT_PENDING",
    [PURCHASES_ERROR_CODE.CONFIGURATION_ERROR]: "SDK_CONFIGURATION",
    [PURCHASES_ERROR_CODE.PRODUCT_REQUEST_TIMED_OUT_ERROR]: "PRODUCT_REQUEST_TIMEOUT",
    [PURCHASES_ERROR_CODE.UNSUPPORTED_ERROR]: "UNSUPPORTED",
    [PURCHASES_ERROR_CODE.API_ENDPOINT_BLOCKED]: "API_BLOCKED",
};

function text(e: unknown): string {
    if (e instanceof Error && e.message) return e.message;
    if (typeof e === "string") return e;
    try {
        return JSON.stringify(e) ?? "";
    } catch {
        return String(e);
    }
}

/**
 * Decide what an error was. Pure — safe to call from anywhere, never throws.
 *
 * @param storeMs how long the StoreKit call took, when known. A cancel faster
 *                than {@link INSTANT_MS} was not a person closing a sheet.
 */
export function classifyPurchaseError(e: unknown, storeMs: number | null = null): PurchaseOutcome {
    const detail = text(e).slice(0, 255);

    // Ours, thrown before StoreKit was ever contacted. These carry the cause.
    if (isIapError(e)) {
        return { cancelled: false, code: e.code, detail };
    }

    const rc = e as Partial<PurchasesError> | null | undefined;
    if (rc && rc.code != null) {
        const known = RC_CODES[rc.code as string];
        if (known === "USER_CANCELLED" && storeMs != null && storeMs < INSTANT_MS) {
            return { cancelled: false, code: "CANCELLED_INSTANTLY", detail };
        }
        if (known) {
            return { cancelled: known === "USER_CANCELLED", code: known, detail };
        }
        // Unrecognised RC code: keep its identity rather than flattening it.
        // readableErrorCode is the SDK's own name and survives version bumps
        // better than the number does.
        const readable = rc.userInfo?.readableErrorCode ?? String(rc.code);
        return { cancelled: false, code: `RC_${readable}`.slice(0, 48), detail };
    }

    // Our backend answered, and badly — the purchase itself may have gone
    // through on Apple's side. Worth its own bucket.
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (typeof status === "number") {
        return { cancelled: false, code: `HTTP_${status}`, detail };
    }

    return { cancelled: false, code: "UNCLASSIFIED", detail };
}

/**
 * Classify a failed purchase and record it, in the shape the funnel expects.
 *
 * <p>A cancellation is a DISMISSED carrying USER_CANCELLED — the same event
 * type the funnel already counts, so no report breaks, plus the one fact that
 * separates someone who backed out at Apple's sheet from someone who closed
 * the screen without trying. Anything else is a FAILED carrying its cause.
 *
 * <p>Returns the outcome so the caller can decide whether to show an alert.
 * Never throws: telemetry must not be able to fail a purchase screen.
 */
export async function reportPurchaseOutcome(
    e: unknown,
    opts: { source: string; planCode?: string | null },
): Promise<PurchaseOutcome> {
    const evidence = await describePurchase(e);
    const outcome = classifyPurchaseError(e, evidence.storeMs);
    try {
        await recordPaywallEvent(outcome.cancelled ? "DISMISSED" : "FAILED", {
            source: opts.source,
            planCode: opts.planCode ?? null,
            failureCode: outcome.code,
            failureDetail: outcome.detail,
            durationMs: evidence.durationMs,
            diagnostics: evidence.diagnostics,
        });
    } catch {
        // recordPaywallEvent already swallows; this is the belt to its braces.
    }
    if (!outcome.cancelled) {
        console.warn(`[IAP] purchase failed: ${outcome.code} — ${outcome.detail}`);
    }
    return outcome;
}

/**
 * Record a completed purchase with its evidence — how long Apple's side took
 * and the device as it was — so a failure can be read against what success
 * looks like. Never throws.
 */
export async function reportPurchaseSuccess(opts: {
    source: string;
    planCode?: string | null;
}): Promise<void> {
    try {
        const evidence = await describePurchase();
        await recordPaywallEvent("PURCHASED", {
            source: opts.source,
            planCode: opts.planCode ?? null,
            durationMs: evidence.durationMs,
            diagnostics: evidence.diagnostics,
        });
    } catch {
        // recordPaywallEvent already swallows; this is the belt to its braces.
    }
}

/**
 * What to tell the user about a failed purchase, as i18n keys — or null when
 * the screen's own generic failure message is right. One table, so four
 * screens say the same thing about the same cause.
 *
 * <p>Only causes the user can act on are named: the sheet that never opened
 * (sign-in or payment method), purchases switched off on the device, a
 * purchase waiting for approval, one already open, no connection.
 */
export function purchaseAlertKeys(outcome: PurchaseOutcome): { title: string; body: string } | null {
    if (outcome.cancelled) return null;
    switch (outcome.code) {
        case "CANCELLED_INSTANTLY":
            return { title: "purchase_errors.sheet_title", body: "purchase_errors.sheet_body" };
        case "PURCHASE_NOT_ALLOWED":
            return { title: "purchase_errors.not_allowed_title", body: "purchase_errors.not_allowed_body" };
        case "PAYMENT_PENDING":
            return { title: "purchase_errors.pending_title", body: "purchase_errors.pending_body" };
        case "PURCHASE_IN_FLIGHT":
        case "ALREADY_IN_PROGRESS":
            return { title: "purchase_errors.in_flight_title", body: "purchase_errors.in_flight_body" };
        case "NETWORK":
            return { title: "purchase_errors.network_title", body: "purchase_errors.network_body" };
        default:
            return null;
    }
}
