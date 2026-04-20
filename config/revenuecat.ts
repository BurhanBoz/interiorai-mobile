/**
 * RevenueCat configuration.
 *
 * Until the RevenueCat project is created and credentials are issued, the
 * app runs in DUMMY mode: the `iap.ts` service simulates purchases and the
 * backend accepts provider=DUMMY transactions. Once RC is wired up:
 *
 *  1. Set EXPO_PUBLIC_REVENUECAT_APPLE_KEY in .env
 *  2. `npm install react-native-purchases`
 *  3. Replace the body of `iap.purchasePack()` with `Purchases.purchasePackage(...)`
 *  4. Flip `isDummyMode` to false by leaving the key set in production builds
 */

export const revenueCatConfig = {
    appleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ?? "",
    googleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY ?? "",
} as const;

/** When keys are blank, we run a local dummy IAP flow (backend accepts too). */
export const isDummyMode = !revenueCatConfig.appleApiKey && !revenueCatConfig.googleApiKey;

/** Apple product IDs mapped to our internal pack codes. */
export const CREDIT_PACK_PRODUCT_IDS: Record<string, string> = {
    CREDITS_SMALL: "com.interiorai.credits.small",
    CREDITS_MEDIUM: "com.interiorai.credits.medium",
    CREDITS_LARGE: "com.interiorai.credits.large",
};
