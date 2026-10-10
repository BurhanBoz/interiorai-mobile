/**
 * One-shot "open the furniture catalogue when the composer shows" request.
 *
 * <p>🔴 Replaces the composer's `?sheet=catalogue` route param (TestFlight
 * 2.4.0, 11 Oct). A param lives as long as the route: whenever that composer
 * route was mounted again (another tab navigator copy, a remount after
 * returning to Studio) it opened the catalogue again, unasked. A module flag
 * is read and cleared in one call, so it can fire exactly once.
 */
let pending = false;

export function requestCatalogueOnArrive() {
    pending = true;
}

/** True once per request; clears it. */
export function consumeCatalogueOnArrive(): boolean {
    const was = pending;
    pending = false;
    return was;
}
