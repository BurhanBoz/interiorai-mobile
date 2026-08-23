import Constants from "expo-constants";
import * as Localization from "expo-localization";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";
import { getAttributionToken } from "@/modules/ad-attribution";

/**
 * Retention + attribution plumbing (V63).
 *
 * Every call here is **fire-and-forget and silent on failure**. None of it is
 * worth a visible error, a retry storm, or a millisecond of the user's
 * attention — if the backend is down, we lose a data point, not a session.
 */

const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";

/**
 * Set once the attribution token has been handed over successfully.
 *
 * Deliberately in AsyncStorage and NOT in `utils/oneShotFlag` — that helper
 * stores flags in the Keychain so they survive app deletion, which is exactly
 * wrong here. A user who deletes the app and reinstalls from a *new* Search Ads
 * click is a new attribution (Apple even labels it `conversionType:
 * Redownload`), and a Keychain flag would make us skip it. AsyncStorage dies
 * with the app container, which is precisely the lifetime this flag wants.
 */
const ATTRIBUTION_SENT_KEY = "asa_attribution_sent";

/**
 * "I'm using the app."
 *
 * Called on cold start and on every return to foreground. The server decides
 * whether this extends the current session or opens a new one — the client
 * deliberately has no say, so a noisy foreground listener cannot inflate the
 * session count.
 */
export async function sendHeartbeat(): Promise<void> {
    try {
        await api.post("/api/sessions/heartbeat", {
            appVersion: APP_VERSION,
            platform: Platform.OS,
            locale: Localization.getLocales()[0]?.languageTag?.slice(0, 16) ?? null,
        });
    } catch {
        // Analytics must never surface to the user.
    }
}

/**
 * Hand Apple's attribution token to the backend, once per install.
 *
 * The one-shot flag matters for more than tidiness: the token is only mintable
 * for a while after install, and each submission costs the backend an outbound
 * call to Apple. Once it is delivered, the question is answered forever.
 *
 * Returns silently on every "no attribution" path — Simulator, iOS < 14.3, and
 * organic installs all legitimately have no token.
 */
export async function submitAttributionToken(): Promise<void> {
    try {
        if ((await AsyncStorage.getItem(ATTRIBUTION_SENT_KEY)) != null) return;

        const token = await getAttributionToken();
        if (!token) return;

        await api.post("/api/attribution/apple", { attributionToken: token });
        await AsyncStorage.setItem(ATTRIBUTION_SENT_KEY, "1");
    } catch {
        // Leave the flag unset so the next cold start tries again — the token
        // stays valid for 24h and a transient network failure should not cost
        // us the attribution.
    }
}

/** Register this device for push. `environment` must match the build. */
export async function registerPushToken(
    token: string,
    environment: "SANDBOX" | "PRODUCTION",
): Promise<void> {
    try {
        await api.post("/api/push/tokens", {
            token,
            environment,
            appVersion: APP_VERSION,
            timezone: Localization.getCalendars()[0]?.timeZone ?? undefined,
        });
    } catch {
        // Silent: a failed registration just means no push until next launch.
    }
}

/** Retire this device's token — user turned notifications off, or logged out. */
export async function unregisterPushToken(token: string): Promise<void> {
    try {
        await api.delete(`/api/push/tokens/${encodeURIComponent(token)}`);
    } catch {
        // Silent.
    }
}
