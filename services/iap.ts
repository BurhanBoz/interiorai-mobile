import * as Crypto from "expo-crypto";
import Purchases, {
    PURCHASES_ERROR_CODE,
    type PurchasesError,
    type PurchasesPackage,
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
import type {
    CreditPackPurchaseResponse,
    SubscriptionResponse,
} from "@/types/api";

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
let isConfigured = false;

export async function initializeIAP(userId: string | null): Promise<void> {
    if (isDummyMode) {
        return;
    }

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
        // Don't crash the app on RC config failure — purchases will fail
        // gracefully when attempted. Log so devs notice.
        console.warn("[IAP] RevenueCat initialization failed:", e);
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
 *                  vs failure via the error code (see {@link isUserCancelled}).
 */
export async function purchaseSubscription(planCode: string): Promise<SubscriptionResponse> {
    if (isDummyMode) {
        // Dev flow — bypass StoreKit, call backend's dummy activation endpoint
        // directly. Backend rejects this when `app.allow-dummy-purchases=false`
        // (production). See SubscriptionServiceImpl.activateDummySubscription.
        const { activateDummySubscription } = await import("./plans");
        return activateDummySubscription(planCode);
    }

    const packageId = SUBSCRIPTION_PACKAGE_IDS[planCode];
    if (!packageId) {
        throw new Error(`Unknown plan code: ${planCode}`);
    }

    // Fetch the current offering and find the target package.
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current ?? offerings.all[DEFAULT_OFFERING_ID];
    if (!offering) {
        throw new Error("No RevenueCat offering available");
    }

    const targetPackage = offering.availablePackages.find(
        (p: PurchasesPackage) => p.identifier === packageId,
    );
    if (!targetPackage) {
        throw new Error(`Package not found in offering: ${packageId}`);
    }

    // Trigger Apple payment sheet. User sees Apple's native UI, enters
    // sandbox tester credentials in dev, real Apple ID in prod.
    const { customerInfo, productIdentifier } = await Purchases.purchasePackage(targetPackage);

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
 * Purchase a one-time credit pack via Apple StoreKit (through RevenueCat).
 *
 * <p>Different from subscription:
 * <ul>
 *   <li>Credit packs are <b>Consumable</b> IAPs, not subscriptions.</li>
 *   <li>They're NOT inside an RC offering — they're standalone products.</li>
 *   <li>Purchase via {@link Purchases.purchaseStoreProduct} (not purchasePackage).</li>
 * </ul>
 *
 * @param packCode  backend pack code (CREDITS_SMALL / CREDITS_MEDIUM / CREDITS_LARGE)
 * @return          CreditPackPurchaseResponse with new balance + credits granted
 */
export async function purchasePack(packCode: string): Promise<CreditPackPurchaseResponse> {
    const productId = CREDIT_PACK_PRODUCT_IDS[packCode];
    if (!productId) {
        throw new Error(`Unknown pack code: ${packCode}`);
    }

    if (isDummyMode) {
        // Dev flow — simulate Apple payment with a delay, then call backend.
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

    // Real RC flow — fetch the product, trigger purchase.
    const products = await Purchases.getProducts([productId]);
    const product = products.find((p) => p.identifier === productId);
    if (!product) {
        throw new Error(`Product not found in App Store Connect: ${productId}`);
    }

    const { customerInfo, productIdentifier } = await Purchases.purchaseStoreProduct(product);

    // RC keeps consumable transactions in `nonSubscriptionTransactions`.
    // Find the most recent one for this product to grab the transaction ID.
    const tx = customerInfo.nonSubscriptionTransactions
        .filter((t) => t.productIdentifier === productIdentifier)
        .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())[0];

    return purchaseCreditPack({
        packCode,
        provider: "REVENUECAT",
        transactionId: tx?.transactionIdentifier ?? customerInfo.originalAppUserId,
        productId: productIdentifier,
        receiptData: "",
    });
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

/**
 * Distinguish "user cancelled the payment sheet" from "purchase failed".
 *
 * <p>Cancellation should show a quiet UI dismissal; failure should show an
 * error alert. RC packages the underlying StoreKit error in a typed way.
 */
export function isUserCancelled(error: unknown): boolean {
    if (isDummyMode) return false;
    const purchasesError = error as PurchasesError;
    return purchasesError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

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
