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

/**
 * The channels we offer on the "how did you hear about us" sheet.
 *
 * Closed set, mirrored server-side in {@code AcquisitionSurveyServiceImpl}.
 * Free text would fill with spellings of the same four sources and stop being
 * groupable, which is the only thing the answer is for.
 */
export type AcquisitionSource =
    | "APP_STORE_SEARCH"
    | "INSTAGRAM"
    | "TIKTOK"
    | "PINTEREST"
    | "FRIEND"
    | "WEB_SEARCH"
    | "OTHER";

/**
 * Record where the user says they came from.
 *
 * <p>The only per-user channel signal available to us for anything that is not
 * Apple Search Ads: Apple resolves the ad case through the AdServices token and
 * reports every other source as an aggregate count with no users attached — so
 * a channel can look like it delivered installs while we remain unable to say
 * whether those people generated, stayed or paid.
 *
 * <p>Self-reported rather than fingerprinted on purpose. Probabilistic device
 * matching would answer the same question covertly, and the market is largely
 * the EU; a declaration the user can see and skip is the version we can defend.
 *
 * <p>Fire-and-forget, like every other call in this file — a survey must never
 * cost a user their result screen.
 */
export async function recordAcquisitionSource(
    answer: AcquisitionSource,
    detail?: string,
): Promise<void> {
    try {
        await api.post("/api/telemetry/source", {
            answer,
            detail: detail?.trim() || null,
            appVersion: APP_VERSION,
            locale: Localization.getLocales()[0]?.languageTag?.slice(0, 16) ?? null,
        });
    } catch {
        // Analytics must never surface to the user.
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

/** Paywall interaction kinds the backend accepts (V65). */
export type PaywallEvent =
    | "SHOWN"
    | "DISMISSED"
    | "PLAN_SELECTED"
    | "PURCHASE_STARTED"
    | "PURCHASED"
    | "FAILED";

/**
 * Report one paywall interaction.
 *
 * Fire-and-forget by design: this runs on the app's first screen, and the
 * whole point of the 2026-08-31 change is to measure that moment — an
 * analytics call that can block or throw would break the thing it exists to
 * watch. Every failure is swallowed, exactly like the other calls here.
 *
 * DISMISSED is as important as PURCHASED: without it the report has a
 * numerator and no denominator, and "how many of the people who saw it
 * bought?" stays unanswerable.
 */
export async function recordPaywallEvent(
    event: PaywallEvent,
    opts?: {
        source?: string;
        planCode?: string | null;
        /**
         * Why the purchase ended this way (V179). Set on FAILED, and on the
         * DISMISSED that means "cancelled at Apple's sheet" rather than
         * "closed the screen" — the two were indistinguishable until now.
         *
         * Produced in exactly one place: services/purchaseOutcome.ts. Do not
         * hand-write a code at a call site; that is how four screens ended up
         * with four vocabularies.
         */
        failureCode?: string | null;
        failureDetail?: string | null;
        /**
         * How long the purchase took to end, and what the device looked like
         * when it did (V188). Produced by services/purchaseDiagnostics.ts via
         * purchaseOutcome.ts — never at a call site.
         */
        durationMs?: number | null;
        diagnostics?: string | null;
    },
): Promise<void> {
    const body = {
        eventType: event,
        source: opts?.source ?? "ONBOARDING",
        planCode: opts?.planCode ?? null,
        failureCode: opts?.failureCode ?? null,
        failureDetail: opts?.failureDetail?.slice(0, 255) ?? null,
        durationMs: opts?.durationMs ?? null,
        // Already fitted to the column; the slice only guards the endpoint,
        // which refuses a longer value and would lose the whole event.
        diagnostics: opts?.diagnostics?.slice(0, 1000) ?? null,
        appVersion: APP_VERSION,
        locale: Localization.getLocales()[0]?.languageTag?.slice(0, 16) ?? null,
    };
    try {
        await api.post("/api/telemetry/paywall", body);
    } catch (e) {
        // Analytics must never surface to the user — but a deploy restarts the
        // API for ~20 s, and on 2026-09-25 20:46 the outcome of a paid pack was
        // lost to exactly that 502. When nothing answered (no response, or the
        // proxy's 502/503/504), send it once more a few seconds later, in the
        // background, so no caller waits on it. A refusal (4xx) is final.
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === undefined || status === 502 || status === 503 || status === 504) {
            setTimeout(() => {
                api.post("/api/telemetry/paywall", body).catch(() => {});
            }, 5000);
        }
    }
}
