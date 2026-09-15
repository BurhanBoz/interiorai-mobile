import { PURCHASES_ERROR_CODE, type PurchasesError } from "react-native-purchases";
import { isIapError } from "./iap";
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

/** Decide what an error was. Pure — safe to call from anywhere, never throws. */
export function classifyPurchaseError(e: unknown): PurchaseOutcome {
    const detail = text(e).slice(0, 255);

    // Ours, thrown before StoreKit was ever contacted. These carry the cause.
    if (isIapError(e)) {
        return { cancelled: false, code: e.code, detail };
    }

    const rc = e as Partial<PurchasesError> | null | undefined;
    if (rc && rc.code != null) {
        const known = RC_CODES[rc.code as string];
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
    const outcome = classifyPurchaseError(e);
    try {
        await recordPaywallEvent(outcome.cancelled ? "DISMISSED" : "FAILED", {
            source: opts.source,
            planCode: opts.planCode ?? null,
            failureCode: outcome.code,
            failureDetail: outcome.detail,
        });
    } catch {
        // recordPaywallEvent already swallows; this is the belt to its braces.
    }
    if (!outcome.cancelled) {
        console.warn(`[IAP] purchase failed: ${outcome.code} — ${outcome.detail}`);
    }
    return outcome;
}
