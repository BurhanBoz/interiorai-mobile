import * as Crypto from "expo-crypto";
import { purchaseCreditPack } from "./creditPacks";
import { isDummyMode, CREDIT_PACK_PRODUCT_IDS } from "@/config/revenuecat";
import type { CreditPackPurchaseResponse } from "@/types/api";

/**
 * IAP orchestrator. Today this runs in DUMMY mode — it generates a fake
 * StoreKit-style transaction ID and posts it to the backend, which accepts
 * provider=DUMMY payloads. Once RevenueCat credentials are configured,
 * swap the body of `purchasePack` for:
 *
 *   import Purchases from "react-native-purchases";
 *   const { customerInfo, productIdentifier, transaction } =
 *       await Purchases.purchasePackage(offerings.current.packages.find(...));
 *   await purchaseCreditPack({
 *     packCode, provider: "REVENUECAT",
 *     transactionId: transaction.transactionIdentifier,
 *     productId: productIdentifier,
 *     receiptData: customerInfo.originalAppUserId,
 *   });
 */
export async function purchasePack(packCode: string): Promise<CreditPackPurchaseResponse> {
    const productId = CREDIT_PACK_PRODUCT_IDS[packCode];

    if (isDummyMode) {
        // Dev flow — simulate the Apple payment sheet with a delay so the UI
        // has time to show a loading state, then post a DUMMY transaction.
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

    // Production path — TODO: wire react-native-purchases here.
    throw new Error(
        "RevenueCat SDK not yet wired. See services/iap.ts for the integration stub.",
    );
}

/**
 * Initialize RevenueCat at app start. Currently a no-op while in dummy mode.
 * Call once from the root layout after auth hydration resolves.
 */
export async function initializeIAP(_userId: string | null): Promise<void> {
    if (isDummyMode) return;
    // TODO: Purchases.configure({ apiKey: revenueCatConfig.appleApiKey, appUserID: userId });
}
