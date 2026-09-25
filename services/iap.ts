import * as Crypto from "expo-crypto";
import Purchases, {
    PURCHASES_ERROR_CODE,
    type MakePurchaseResult,
    type PurchasesError,
    type PurchasesPackage,
    type PurchasesStoreProduct,
} from "react-native-purchases";
import {
    isDummyMode,
    revenueCatConfig,
    SUBSCRIPTION_PACKAGE_IDS,
    CREDIT_PACK_PRODUCT_IDS,
    DEFAULT_OFFERING_ID,
} from "@/config/revenuecat";
import { purchaseCreditPack } from "./creditPacks";
import { verifySubscriptionReceipt } from "./plans";
import {
    beginPurchaseAttempt,
    finishPurchaseAttempt,
    installPurchaseLogCapture,
    markStoreCall,
    markStoreEnd,
    openAttemptAgeMs,
    type PurchaseAttempt,
} from "./purchaseDiagnostics";
import type {
    CreditPackPurchaseResponse,
    SubscriptionResponse,
} from "@/types/api";
import type { StorePrice, StorePriceMap } from "@/utils/price";

/**
 * In-App Purchase orchestrator.
 *
 * <p>Two modes:
 * <ul>
 *   <li><b>Dummy mode</b> (no RC key): simulates Apple payment with a delay,
 *       then posts a fake transaction to the backend (provider=DUMMY).
 *       Backend rejects this in production but accepts it in dev.</li>
 *   <li><b>RevenueCat mode</b> (RC key set): real Apple StoreKit flow via
 *       react-native-purchases SDK. After successful purchase, transaction
 *       info is posted to backend for immediate credit grant. Backend also
 *       receives RC's webhook as backup verification.</li>
 * </ul>
 *
 * <p>Caller responsibility:
 * <ol>
 *   <li>Call {@link initializeIAP} once at app boot (after user is known).</li>
 *   <li>Use {@link purchaseSubscription} for paid plans.</li>
 *   <li>Use {@link purchasePack} for credit pack purchases.</li>
 *   <li>Optionally {@link restorePurchases} for "Restore Purchases" button.</li>
 * </ol>
 */

/**
 * Configure RevenueCat SDK at app boot.
 *
 * <p>Must be called BEFORE any purchase attempts. Idempotent — safe to call
 * on every auth change (RC handles re-identification internally via
 * {@link Purchases.logIn} when {@code userId} changes).
 *
 * <p>Behavior:
 * <ul>
 *   <li>Dummy mode: no-op, returns immediately.</li>
 *   <li>RC mode: calls {@link Purchases.configure} once, then
 *       {@link Purchases.logIn} with the backend's user ID so RC's customer
 *       record links to our wallet.</li>
 * </ul>
 *
 * @param userId backend's user UUID (null = anonymous, RC creates an
 *               anonymous customer that we'll later alias on login).
 */
/**
 * Why a purchase could not even be attempted.
 *
 * <p>These are OUR failures, thrown before StoreKit is ever contacted, and
 * until 2026-09-15 every one of them was a bare `Error(string)` that reached
 * the user as "purchase failed" and reached us as nothing at all. Two users
 * lost six attempts in 220-280ms each and the reason was unrecoverable
 * afterwards — RevenueCat only records transactions that reached Apple, so a
 * throw on this side leaves no trace anywhere.
 *
 * <p>A code, not a message: messages get reworded, interpolated and
 * translated, and a report that groups on them splits one cause into ten.
 */
export type IapErrorCode =
    /** Purchases.configure() never succeeded — every purchase this session throws instantly. */
    | "SDK_NOT_READY"
    /** The pack code has no product id in our map. A build/config mismatch, not the store. */
    | "UNKNOWN_PACK"
    /** StoreKit returned no product for an id we believe exists. */
    | "PRODUCT_NOT_FOUND"
    /** RevenueCat has no current offering. */
    | "NO_OFFERING"
    /** The offering exists but carries no package for this plan. */
    | "NO_PACKAGE"
    /**
     * Another purchase is still waiting on StoreKit (1.7.1). Refused rather
     * than queued: on 2026-09-25 seven attempts queued behind one sheet that
     * never appeared, one per reopened paywall, and all ended together.
     */
    | "PURCHASE_IN_FLIGHT";

export class IapError extends Error {
    constructor(readonly code: IapErrorCode, message: string) {
        super(message);
        this.name = "IapError";
    }
}

export function isIapError(e: unknown): e is IapError {
    return e instanceof IapError;
}

let isConfigured = false;
let lastUserId: string | null = null;

export async function initializeIAP(userId: string | null): Promise<void> {
    if (isDummyMode) {
        return;
    }
    // Remembered so ensureConfigured() can retry as the same customer; a retry
    // that fell back to anonymous would strand the purchase on a customer the
    // webhook cannot map back to our user.
    lastUserId = userId;

    // Before configure, so RevenueCat's own lines about a failed purchase are
    // kept for its paywall event (services/purchaseDiagnostics.ts).
    installPurchaseLogCapture();

    try {
        if (!isConfigured) {
            await Purchases.configure({
                apiKey: revenueCatConfig.appleApiKey,
                // When userId is null, RC creates an anonymous customer.
                // We'll log in later when the user authenticates.
                appUserID: userId ?? null,
            });
            isConfigured = true;
        } else if (userId) {
            // Already configured (e.g. user logged out and logged back in).
            // logIn aliases the previous anonymous customer to this user.
            await Purchases.logIn(userId);
        }
    } catch (e) {
        // Still must not crash the app at boot. But swallowing it whole is
        // what made this invisible: isConfigured stayed false, initializeIAP
        // was never called again, and every purchase for the rest of that
        // session threw instantly with nobody able to say why.
        //
        // ensureConfigured() below retries on demand, so a boot-time blip is
        // no longer a session-long outage.
        console.warn("[IAP] RevenueCat initialization failed:", e);
    }
}

/**
 * Open the one purchase attempt the app may have at a time, or refuse this
 * one with {@link IapError} PURCHASE_IN_FLIGHT. Every screen already blocked
 * a second tap while it was busy; the attempt is app-wide so a reopened
 * screen cannot start a second purchase behind the first.
 */
function openAttempt(kind: "subscription" | "pack", productId: string | null): PurchaseAttempt {
    const attempt = beginPurchaseAttempt(kind, productId);
    if (!attempt) {
        const seconds = Math.round((openAttemptAgeMs() ?? 0) / 1000);
        throw new IapError("PURCHASE_IN_FLIGHT", `Another purchase has been open for ${seconds} s`);
    }
    return attempt;
}

/**
 * Guarantee the SDK is usable, retrying a failed boot-time configure.
 *
 * <p>Called at the top of every purchase. If configure still fails, this
 * throws {@link IapError} SDK_NOT_READY — a named cause instead of whatever
 * the SDK happens to raise when it was never initialised.
 */
async function ensureConfigured(): Promise<void> {
    if (isConfigured) return;
    installPurchaseLogCapture();
    try {
        await Purchases.configure({
            apiKey: revenueCatConfig.appleApiKey,
            appUserID: lastUserId,
        });
        isConfigured = true;
        console.warn("[IAP] RevenueCat configured on retry (boot attempt had failed)");
    } catch (e) {
        throw new IapError(
            "SDK_NOT_READY",
            `RevenueCat not configured: ${(e as Error)?.message ?? e}`,
        );
    }
}

/**
 * Log out from RevenueCat (called on user sign-out).
 *
 * <p>Switches RC back to an anonymous customer so the next user signing in
 * on the same device doesn't inherit the previous user's entitlements.
 */
export async function logoutIAP(): Promise<void> {
    if (isDummyMode) return;
    try {
        await Purchases.logOut();
    } catch (e) {
        console.warn("[IAP] RevenueCat logOut failed:", e);
    }
}

/**
 * Fetch storefront-localized prices for every purchasable product.
 *
 * <p>Feeds {@code storePricesStore} so the UI can show the price the user
 * will ACTUALLY pay (₺/€/¥... — Apple's own per-storefront price points),
 * instead of our backend's USD reference values. Two sources, merged:
 * <ul>
 *   <li>Subscriptions — packages of the current RC offering.</li>
 *   <li>Credit packs — consumables, NOT in the offering; fetched by product
 *       id (same {@link Purchases.getProducts} call the purchase flow uses).</li>
 * </ul>
 *
 * <p>Failure semantics: dummy mode returns an empty map (screens keep their
 * backend-USD fallback — pre-localization behavior). A pack-lookup failure
 * degrades to subscriptions-only rather than failing the whole map.
 */
export async function fetchStorePrices(): Promise<StorePriceMap> {
    if (isDummyMode) {
        return {};
    }

    const toStorePrice = (p: PurchasesStoreProduct): StorePrice => ({
        priceString: p.priceString,
        price: p.price,
        currencyCode: p.currencyCode,
        pricePerMonthString: p.pricePerMonthString,
        introTrialDays: freeTrialDays(p),
    });

    const map: StorePriceMap = {};

    const offerings = await Purchases.getOfferings();
    const offering = offerings.current ?? offerings.all[DEFAULT_OFFERING_ID];
    for (const pkg of offering?.availablePackages ?? []) {
        map[pkg.product.identifier] = toStorePrice(pkg.product);
    }

    try {
        const packProducts = await Purchases.getProducts(
            Object.values(CREDIT_PACK_PRODUCT_IDS),
        );
        for (const product of packProducts) {
            map[product.identifier] = toStorePrice(product);
        }
    } catch (e) {
        console.warn("[IAP] credit-pack price fetch failed (subscriptions still localized):", e);
    }

    return map;
}

/**
 * The part of a subscription purchase that talks to RevenueCat and StoreKit:
 * find the package, then open Apple's sheet. Kept apart so the attempt around
 * it (one at a time, timed) reads as a single try/catch in the caller.
 */
async function buySubscriptionPackage(
    attempt: PurchaseAttempt,
    planCode: string,
    appleProductId?: string | null,
): Promise<MakePurchaseResult> {
    await ensureConfigured();

    // Fetch the current offering and find the target package.
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current ?? offerings.all[DEFAULT_OFFERING_ID];
    if (!offering) {
        throw new IapError("NO_OFFERING", "No RevenueCat offering available");
    }

    // Server-driven resolution first (V3 improvement): the backend already
    // ships plans.apple_product_id, so matching the offering package by its
    // PRODUCT identifier makes future plan/price changes binary-free — a
    // migration updating the plans table is enough. The static package-id
    // map stays as the fallback for offline-cached plan payloads.
    const packageId = SUBSCRIPTION_PACKAGE_IDS[planCode];
    const targetPackage = offering.availablePackages.find(
        (p: PurchasesPackage) =>
            (appleProductId && p.product.identifier === appleProductId) ||
            (packageId != null && p.identifier === packageId),
    );
    if (!targetPackage) {
        throw new IapError(
            "NO_PACKAGE",
            `No RC package matches plan ${planCode} (product ${appleProductId ?? "?"}, package ${packageId ?? "?"})`,
        );
    }

    // Trigger Apple payment sheet. User sees Apple's native UI, enters
    // sandbox tester credentials in dev, real Apple ID in prod. Timed on its
    // own: a "cancel" that returns faster than a person could close the
    // sheet means the sheet never appeared (purchaseDiagnostics.INSTANT_MS).
    markStoreCall(attempt);
    try {
        return await Purchases.purchasePackage(targetPackage);
    } finally {
        markStoreEnd(attempt);
    }
}

/**
 * Purchase a subscription plan via Apple StoreKit (through RevenueCat).
 *
 * <p>Flow:
 * <ol>
 *   <li>Map backend plan code (e.g. {@code BASIC}, {@code PRO_ANNUAL}) →
 *       RC package identifier (e.g. {@code monthly_basic}).</li>
 *   <li>Fetch {@link Purchases.getOfferings} → find the matching package
 *       inside the {@code default} offering.</li>
 *   <li>Call {@link Purchases.purchasePackage} → triggers iOS payment sheet.</li>
 *   <li>On success, post transaction info to backend for immediate grant.</li>
 *   <li>Backend also receives the same event via RC webhook (idempotent).</li>
 * </ol>
 *
 * @param planCode  backend plan code (BASIC / PRO / MAX / *_ANNUAL)
 * @return          updated SubscriptionResponse from backend after grant
 * @throws Error    on cancellation (`USER_CANCELLED`), network failure, or
 *                  unverified receipt. Caller should distinguish cancelled
 *                  vs failure via services/purchaseOutcome.ts, which
 *                  classifies both in one place.
 */
export async function purchaseSubscription(
    planCode: string,
    appleProductId?: string | null,
): Promise<SubscriptionResponse> {
    if (isDummyMode) {
        // Dev flow — bypass StoreKit, call backend's dummy activation endpoint
        // directly. Backend rejects this when `app.allow-dummy-purchases=false`
        // (production). See SubscriptionServiceImpl.activateDummySubscription.
        const { activateDummySubscription } = await import("./plans");
        return activateDummySubscription(planCode);
    }

    const attempt = openAttempt("subscription", appleProductId ?? planCode);
    let purchased: MakePurchaseResult;
    try {
        purchased = await buySubscriptionPackage(attempt, planCode, appleProductId);
    } catch (e) {
        finishPurchaseAttempt(attempt, e);
        throw e;
    }
    // Apple's part is over; verify-receipt below is ours and never throws.
    finishPurchaseAttempt(attempt);
    const { customerInfo, productIdentifier } = purchased;

    const premium = customerInfo.entitlements.active["premium"];
    const productId = premium?.productIdentifier ?? productIdentifier;

    // SOURCE OF TRUTH = RevenueCat webhook. RC validates the Apple receipt
    // server-side and POSTs INITIAL_PURCHASE to our backend, which
    // activates the subscription + grants credits
    // (RevenueCatWebhookController → AppleIapService.handleRevenueCatSubscriptionEvent).
    //
    // verify-receipt here is BEST-EFFORT for immediate feedback only. The
    // backend can't re-verify a raw StoreKit receipt we don't have (RC
    // abstracts it), so this call may 4xx — that's expected and harmless.
    // We swallow the error; the caller (confirm.tsx) polls
    // fetchSubscription which reconciles once the webhook lands (~1-3s).
    try {
        return await verifySubscriptionReceipt({
            productId,
            transactionId: customerInfo.originalAppUserId,
            receiptData: "",
        });
    } catch (e) {
        console.warn(
            "[IAP] verify-receipt best-effort failed — RC webhook will reconcile:",
            (e as { response?: { status?: number } })?.response?.status ?? e,
        );
        // Return RC's customerInfo-derived view so the caller has SOMETHING
        // to render immediately; the subsequent fetchSubscription() poll
        // replaces it with the authoritative server state.
        return {
            planCode,
            status: "ACTIVE",
            provider: "REVENUECAT",
        } as unknown as SubscriptionResponse;
    }
}

/**
 * The part of a pack purchase that talks to RevenueCat and StoreKit: look the
 * product up, then open Apple's sheet. Kept apart for the same reason as
 * {@link buySubscriptionPackage}.
 */
async function buyPackProduct(attempt: PurchaseAttempt, productId: string): Promise<void> {
    await ensureConfigured();

    // Real RC flow — fetch the product, trigger the StoreKit purchase.
    //
    // 🔴 This is a DIFFERENT call from the subscription path, which reads
    // getOfferings(). Packs are consumables and sit outside the offering, so
    // they are looked up by identifier. The two can fail independently — and
    // on 2026-09-15 that is exactly what the data showed: every recorded
    // failure was a pack, none was a subscription.
    const products = await Purchases.getProducts([productId]);
    const product = products.find((p) => p.identifier === productId);
    if (!product) {
        throw new IapError(
            "PRODUCT_NOT_FOUND",
            `StoreKit returned no product for ${productId}`,
        );
    }

    // StoreKit purchase — throws on user-cancel; purchaseOutcome.ts separates
    // that from a real failure so no screen has to decide for itself. Timed on
    // its own, like the subscription path.
    markStoreCall(attempt);
    try {
        await Purchases.purchaseStoreProduct(product);
    } finally {
        markStoreEnd(attempt);
    }
}

/**
 * Purchase a one-time credit pack via Apple StoreKit (through RevenueCat).
 *
 * <p>Credit packs are <b>Consumable</b> IAPs (not subscriptions, not in an
 * RC offering) — bought via {@link Purchases.purchaseStoreProduct}.
 *
 * <p><b>Grant path (2026-07-15 fix):</b> the credits are granted SERVER-SIDE
 * by the RevenueCat webhook — RC validates the receipt with Apple and POSTs
 * a signed {@code NON_RENEWING_PURCHASE} to our backend, which credits the
 * wallet. The client does NOT grant (the old direct-post path required a
 * raw receipt the RC SDK abstracts away, so it always failed with "receipt
 * required" — matching the founder's "purchase failed" report). Instead we
 * mirror the subscription flow: after StoreKit confirms, poll our balance
 * until the webhook lands (~1-3s), then report the delta. This is also the
 * secure design — a client can never mint credits by forging a call.
 *
 * @param packCode  backend pack code (CREDITS_20 / CREDITS_50 / CREDITS_100)
 * @return          CreditPackPurchaseResponse with new balance + credits granted
 */
export async function purchasePack(packCode: string): Promise<CreditPackPurchaseResponse> {
    const productId = CREDIT_PACK_PRODUCT_IDS[packCode];
    if (!productId) {
        throw new IapError("UNKNOWN_PACK", `Unknown pack code: ${packCode}`);
    }

    if (isDummyMode) {
        // Dev flow — simulate Apple payment with a delay, then call backend
        // directly (backend accepts provider=DUMMY when allow-dummy-purchases).
        await new Promise((r) => setTimeout(r, 800));
        const transactionId = `dummy_${Date.now()}_${Crypto.randomUUID()}`;
        return purchaseCreditPack({
            packCode,
            provider: "DUMMY",
            transactionId,
            productId,
            receiptData: "dummy-receipt",
        });
    }

    const { useCreditStore } = await import("@/stores/creditStore");
    const balanceBefore = useCreditStore.getState().balance ?? 0;
    const attempt = openAttempt("pack", productId);
    try {
        await buyPackProduct(attempt, productId);
    } catch (e) {
        finishPurchaseAttempt(attempt, e);
        throw e;
    }
    // Apple's part is over; the poll below only waits for the webhook, and a
    // second purchase need not wait for it.
    finishPurchaseAttempt(attempt);

    // Poll for the webhook-driven grant. 12 tries × 2s = 24s ceiling — RC
    // usually delivers in 1-3s, but the founder's 50-credit sandbox purchase
    // (2026-07-16) landed after the old 12s window, showing the pending
    // fallback for a purchase that was seconds from reconciling. Each poll
    // refreshes the authoritative balance from the backend.
    //
    // 🔴 Apple has taken the payment by now, so nothing below may throw. On
    // 2026-09-25 20:46 the first read hit a 502 while a deploy restarted the
    // API; fetchBalance threw, the purchase was reported as failed on screen,
    // and the 24 credits landed 2.5 minutes later through the webhook. A read
    // that fails is a read to try again, and at worst the result is "pending".
    for (let attempt = 0; attempt < 12; attempt++) {
        try {
            await useCreditStore.getState().fetchBalance();
        } catch {
            // Transient (deploy, dropped connection): keep waiting.
        }
        const now = useCreditStore.getState().balance ?? 0;
        if (now > balanceBefore) {
            return {
                packCode,
                creditsGranted: now - balanceBefore,
                newBalance: now,
                provider: "REVENUECAT",
            } as CreditPackPurchaseResponse;
        }
        await new Promise((r) => setTimeout(r, 2000));
    }

    // Webhook hasn't landed within the window. The purchase DID go through on
    // Apple's side; the grant will reconcile shortly. Return the current
    // balance so the UI can reassure rather than show a hard failure.
    const finalBalance = useCreditStore.getState().balance ?? balanceBefore;
    return {
        packCode,
        creditsGranted: Math.max(0, finalBalance - balanceBefore),
        newBalance: finalBalance,
        provider: "REVENUECAT",
        pending: finalBalance <= balanceBefore,
    } as CreditPackPurchaseResponse & { pending?: boolean };
}

/**
 * Restore previously-purchased subscriptions/non-consumables.
 *
 * <p>Apple requires every paid app to expose a "Restore Purchases" button
 * (App Store Review Guideline §3.1.1). Triggers RC to check the user's
 * App Store account for any active entitlements they should have.
 *
 * @return        CustomerInfo with restored entitlements
 * @throws Error  on network failure or no purchases to restore
 */
export async function restorePurchases() {
    if (isDummyMode) {
        // Dev mode — no-op, just refresh subscription from backend.
        const { getActiveSubscription } = await import("./plans");
        return getActiveSubscription();
    }
    return Purchases.restorePurchases();
}

// isUserCancelled lived here until 2026-09-15. It answered "was this a
// cancellation?" and three screens called it while a fourth did not, so the
// same error got two names depending on where it was caught. Keeping it next
// to the classifier would have preserved the duplication that caused that
// drift, so the question has one answer now: classifyPurchaseError in
// services/purchaseOutcome.ts, which returns the cancellation flag together
// with the cause.

/**
 * Open Apple's native "Manage Subscriptions" sheet.
 *
 * <p>Apple does NOT permit cancelling a subscription from inside the app —
 * cancellation must happen in Apple's own UI (App Store Guideline 3.1.1).
 * The correct, compliant pattern is to deep-link the user straight to that
 * sheet so they don't have to hunt through Settings.
 * {@link Purchases.showManageSubscriptions} presents the StoreKit-native
 * manage sheet (works for sandbox subscriptions too — which also makes our
 * cancel/downgrade test flow one tap).
 *
 * <p>Falls back to the universal App Store subscriptions URL if the SDK call
 * throws (older iOS, missing entitlement) so the button never dead-ends.
 *
 * @returns true if a management surface was presented, false on hard failure.
 */
export async function openManageSubscriptions(): Promise<boolean> {
    const fallback = async (): Promise<boolean> => {
        try {
            const { Linking } = await import("react-native");
            await Linking.openURL("https://apps.apple.com/account/subscriptions");
            return true;
        } catch {
            return false;
        }
    };

    if (isDummyMode) {
        // Dev build — no StoreKit. Open the App Store subscriptions URL so the
        // button is still demonstrable.
        return fallback();
    }
    try {
        await Purchases.showManageSubscriptions();
        return true;
    } catch (e) {
        console.warn("[IAP] showManageSubscriptions failed, falling back to deep-link:", e);
        return fallback();
    }
}

/**
 * Days of FREE trial StoreKit attaches to a product, or null.
 *
 * <p>Only a zero-priced introductory offer counts — a paid intro ("first week
 * $0.99") is not a trial and must not be described as one. The unit is
 * normalised to days because the paywall copy says "{{days}} days free";
 * Apple's shortest option is 3 days, so anything shorter is impossible and
 * anything longer than a month is not a trial we would ever configure.
 */
function freeTrialDays(p: PurchasesStoreProduct): number | null {
    const intro = p.introPrice;
    if (!intro || intro.price !== 0) return null;
    const n = intro.periodNumberOfUnits;
    if (!Number.isFinite(n) || n <= 0) return null;
    switch (intro.periodUnit) {
        case "DAY": return n;
        case "WEEK": return n * 7;
        case "MONTH": return n * 30;
        case "YEAR": return n * 365;
        default: return null;
    }
}
