/**
 * Price display — single source of truth for every money string in the UI.
 *
 * <p>Two-tier resolution, StoreKit-first:
 * <ol>
 *   <li><b>StoreKit/RevenueCat</b> — the price the user will ACTUALLY be
 *       charged, pre-formatted by Apple for the device's storefront
 *       ("₺2.499,99", "¥3,800", "AED 189.99"). Currency, VAT inclusion,
 *       symbol position and digit grouping are all Apple's — we never do
 *       currency math or symbol lookup ourselves.</li>
 *   <li><b>Backend fallback</b> — `plans`/`credit_packs` price in USD cents,
 *       shown only while store prices haven't loaded yet (first render,
 *       offline, dummy mode). Matches the pre-localization behavior, so the
 *       app never renders an empty price.</li>
 * </ol>
 *
 * <p>Why not convert currencies ourselves: the App Store price in each
 * storefront is NOT a live FX conversion — Apple assigns per-country price
 * points (and we may later customize them per region). Any local conversion
 * would show a number different from Apple's payment sheet, which is both
 * confusing and a review risk. StoreKit's string is the contract.
 */

/** Localized price snapshot for one App Store product. */
export interface StorePrice {
    /** Fully formatted price incl. currency symbol — e.g. "₺2.499,99". */
    priceString: string;
    /** Numeric price in the storefront currency — for math (discount %). */
    price: number;
    /** ISO 4217 code — e.g. "TRY", "AED", "JPY". */
    currencyCode: string;
    /**
     * Localized per-month price for subscriptions (annual ÷ 12), formatted
     * by the SDK for the device locale. Null for consumables/monthly.
     */
    pricePerMonthString: string | null;
    /**
     * Length in days of a FREE introductory offer attached to the product,
     * null when the store reports none (or a paid intro). Read from StoreKit
     * via RevenueCat, never assumed: the paywall promises a trial only when
     * the store will actually deliver one at the payment sheet.
     */
    introTrialDays?: number | null;
}

/** productId → StorePrice map, as held by storePricesStore. */
export type StorePriceMap = Record<string, StorePrice>;

/**
 * Legacy/fallback formatter for backend cents — the exact behavior all
 * screens had before StoreKit localization (three copies, now one).
 */
export function formatBackendPrice(cents: number, currency: string): string {
    const amount = (cents / 100).toFixed(2);
    return currency === "USD" ? `$${amount}` : `${amount} ${currency}`;
}

/**
 * The price string to render for a product: StoreKit-localized when the
 * store map has it, backend-USD fallback otherwise.
 *
 * <p>Pure function (not a hook) so it can be called inside list `.map()`
 * renders; pass the map from `useStorePricesStore((s) => s.prices)`.
 *
 * @param prices          live map from storePricesStore
 * @param appleProductId  product to look up (null/undefined → fallback,
 *                        e.g. the FREE plan which has no store product)
 * @param fallbackCents   backend price in cents
 * @param fallbackCurrency backend currency code ("USD")
 */
export function formatProductPrice(
    prices: StorePriceMap,
    appleProductId: string | null | undefined,
    fallbackCents: number,
    fallbackCurrency: string,
): string {
    const store = appleProductId ? prices[appleProductId] : undefined;
    return store?.priceString ?? formatBackendPrice(fallbackCents, fallbackCurrency);
}
