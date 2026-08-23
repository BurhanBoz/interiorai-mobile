import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * Apple Search Ads attribution (V63).
 *
 * `requireOptionalNativeModule` rather than `requireNativeModule`: the module
 * is iOS-only and absent in Expo Go and on any JS-only bundle, and attribution
 * must never be the reason the app fails to boot.
 */
type AdAttributionNativeModule = {
    getAttributionToken(): Promise<string | null>;
    isSupported(): boolean;
};

const native = requireOptionalNativeModule<AdAttributionNativeModule>("AdAttribution");

/** True when a native AdServices implementation is actually present. */
export function isAttributionSupported(): boolean {
    try {
        return !!native && native.isSupported();
    } catch {
        return false;
    }
}

/**
 * Fetch this install's attribution token.
 *
 * Returns null for every "no attribution" case — Simulator, iOS < 14.3, an
 * organic install that never saw an ad. That is the expected answer for most
 * users and is not an error.
 */
export async function getAttributionToken(): Promise<string | null> {
    if (!native) return null;
    try {
        return (await native.getAttributionToken()) ?? null;
    } catch {
        return null;
    }
}
