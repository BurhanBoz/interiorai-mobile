/**
 * The FREE plan's daily ceiling — mirrors the backend's app.daily-drip.ceiling:
 * one free design a day, and it does not stack (1 from the 2.0.0 release; it
 * was 3). The balance endpoint does not send it, so the app keeps this one
 * copy; change it together with the server value.
 *
 * At or above the ceiling the drip does not fire, so the Studio pill must not
 * promise "+1 in Xh", and the Settings bar is measured against it.
 */
export const FREE_DAILY_CEILING = 1;
