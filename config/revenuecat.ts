/**
 * RevenueCat configuration.
 *
 * <p><b>Activation:</b> When {@link EXPO_PUBLIC_REVENUECAT_API_KEY_IOS} is set
 * to a real {@code appl_*} key, the app uses real RevenueCat SDK + StoreKit.
 * When it's blank, {@link isDummyMode} is {@code true} and the IAP service
 * falls back to a dummy flow (backend accepts {@code provider=DUMMY}).
 *
 * <p><b>Where the key comes from:</b> RevenueCat dashboard → Project Settings
 * → API Keys → "Public iOS SDK Key" (starts with {@code appl_}). This is the
 * <i>public</i> key, safe to ship in client bundle. The Secret REST API key
 * (sk_*) lives in the backend's .env, not here.
 *
 * <p><b>Product ID mapping:</b> Apple product IDs (created in App Store
 * Connect) must match what the backend has in {@code plans.apple_product_id}
 * and {@code credit_packs.apple_product_id} columns. These come from V18
 * (credit packs) + V19 (subscription monthly) + V20 (subscription annual)
 * migrations — they are the SOURCE OF TRUTH.
 */

export const revenueCatConfig = {
    /** Public iOS SDK key — starts with `appl_`. Safe to ship in client. */
    appleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? "",
    /** Public Android SDK key — will be added when Google Play launch happens. */
    googleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? "",
} as const;

/**
 * When keys are blank, run a local dummy IAP flow (backend accepts dummy).
 * Used in dev environments without RC credentials. Set the key in mobile
 * .env to flip to real RC SDK calls.
 */
export const isDummyMode = !revenueCatConfig.appleApiKey;

/**
 * RC offering identifier — matches what was created in RC dashboard (C6).
 * Mobile fetches `offerings.current` which is this offering once "Make
 * Current" was clicked.
 */
export const DEFAULT_OFFERING_ID = "default";

/**
 * RC package identifiers — must match what was created in RC dashboard
 * Offerings → "default" → packages (C6). Mobile maps plan codes from
 * backend (BASIC / BASIC_ANNUAL / etc.) to these RC package identifiers
 * before calling Purchases.purchasePackage().
 */
export const SUBSCRIPTION_PACKAGE_IDS: Record<string, string> = {
    BASIC: "monthly_basic",
    BASIC_ANNUAL: "annual_basic",
    PRO: "monthly_pro",
    PRO_ANNUAL: "annual_pro",
    MAX: "monthly_max",
    MAX_ANNUAL: "annual_max",
};

/**
 * Apple subscription product IDs — must match App Store Connect product
 * IDs AND backend's `plans.apple_product_id` (V19 + V20 migrations).
 *
 * <p>These are kept as an explicit map (rather than derived from plan code)
 * so a backend rename can be tracked without a mobile redeploy: bump only
 * the migration, the mobile mapping stays stable until the next launch.
 */
export const SUBSCRIPTION_PRODUCT_IDS: Record<string, string> = {
    BASIC: "com.roomframeai.subscription.basic",
    BASIC_ANNUAL: "com.roomframeai.subscription.basic.annual",
    PRO: "com.roomframeai.subscription.pro",
    PRO_ANNUAL: "com.roomframeai.subscription.pro.annual",
    MAX: "com.roomframeai.subscription.max",
    MAX_ANNUAL: "com.roomframeai.subscription.max.annual",
};

/**
 * Apple consumable product IDs for credit packs — matches V18 migration.
 *
 * <p>Backend lookup: `credit_packs.apple_product_id` column. Mobile maps
 * the backend pack code (CREDITS_SMALL / MEDIUM / LARGE) → Apple product ID
 * before calling Purchases.purchaseProduct().
 *
 * <p>NOTE: package identifiers do NOT apply here — credit packs are NOT
 * inside an offering. They're standalone consumable IAPs.
 */
export const CREDIT_PACK_PRODUCT_IDS: Record<string, string> = {
    CREDITS_SMALL: "com.roomframeai.credits.small",
    CREDITS_MEDIUM: "com.roomframeai.credits.medium",
    CREDITS_LARGE: "com.roomframeai.credits.large",
};
