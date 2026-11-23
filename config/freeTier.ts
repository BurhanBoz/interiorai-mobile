/**
 * The FREE plan's bucket — mirrors the backend's app.daily-drip (2026-11-23: one
 * credit, the bucket holds one, the next lands seven days after it is spent).
 *
 * Since 3.0.3 the balance endpoint sends both the ceiling (freeCreditCeiling) and
 * the date of the next credit (nextFreeCreditAt); these are only the fallback for a
 * server that does not send them yet. Change them together with the server value.
 *
 * At or above the ceiling the drip does not fire, so the Studio pill must not
 * promise "+1 in …", and the Settings bar is measured against it.
 */
export const FREE_CREDIT_CEILING = 1;

/** Days between FREE credits (app.daily-drip.interval-days). Copy only; the date comes from the server. */
export const FREE_CREDIT_INTERVAL_DAYS = 7;
