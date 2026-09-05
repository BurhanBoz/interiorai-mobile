import { useCallback, useEffect } from "react";
import { Alert, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerPushToken } from "@/services/telemetry";

/**
 * APNs registration (V63).
 *
 * **Where the permission prompt goes, and why it matters more than the code.**
 * iOS grants one chance: a user who taps "Don't Allow" cannot be asked again
 * from inside the app, ever. So the ask is deferred to
 * {@link usePushPermissionAsk}, which fires after a user has seen real value —
 * not at launch, where a cold prompt gets refused by most people and closes the
 * channel permanently.
 *
 * This hook does the part that needs no permission: if the user has *already*
 * granted it, make sure the backend has a current token. iOS rotates device
 * tokens without warning, so that has to happen on every cold start.
 *
 * **Device token, not Expo token.** `getDevicePushTokenAsync()` returns the raw
 * APNs token our own backend delivers against. `getExpoPushTokenAsync()` would
 * route through Expo's service — a third party in the delivery path we do not
 * need and cannot debug.
 */

/** Which APNs host the token belongs to. Sandbox and production do not mix. */
function apnsEnvironment(): "SANDBOX" | "PRODUCTION" {
    // Debug builds and simulators talk to sandbox APNs; TestFlight and App
    // Store builds talk to production. Sending a token to the wrong host makes
    // Apple drop the notification silently, so this must not be a guess.
    return __DEV__ ? "SANDBOX" : "PRODUCTION";
}

/** Push the current device token to the backend, if permission already exists. */
export async function syncPushTokenIfPermitted(): Promise<void> {
    if (Platform.OS !== "ios") return;
    try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") return;

        const token = await Notifications.getDevicePushTokenAsync();
        if (typeof token?.data !== "string" || !token.data) return;

        await registerPushToken(token.data, apnsEnvironment());
    } catch {
        // No push this launch. Not worth surfacing.
    }
}

/** Cold-start token refresh. Mount once, at the root. */
export function usePushTokenSync(enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;
        syncPushTokenIfPermitted();
    }, [enabled]);
}

/**
 * Ask for notification permission at a moment the user is happy.
 *
 * Called from the result screen once a render has succeeded. Guarded so it is
 * asked at most once per install: a second `requestPermissionsAsync()` after a
 * denial is a no-op on iOS anyway, and re-running it just wastes a call.
 *
 * Deliberately staggered behind the rating prompt (which fires on the 2nd
 * success) — asking for a review and a permission in the same breath gets both
 * refused.
 */
const PUSH_ASKED_KEY = "push_permission_asked";
/**
 * 2nd success, not 3rd (1.4.5). Under the old number 65 users produced one
 * permission: most never reached a third render. The 1st result now carries
 * the offer, so the 2nd is the earliest visit with no other sheet in it.
 */
const ASK_ON_NTH_SUCCESS = 2;
const SUCCESS_COUNT_KEY = "push_prompt_success_count";
const ASK_DELAY_MS = 3000;

export function usePushPermissionAsk(jobSucceeded: boolean) {
    const { t } = useTranslation();
    const ask = useCallback(async () => {
        if (Platform.OS !== "ios") return;
        // Expo Go cannot register for remote notifications; asking there
        // teaches us nothing and burns the user's one prompt on a dev build.
        if (Constants.appOwnership === "expo") return;

        if ((await AsyncStorage.getItem(PUSH_ASKED_KEY)) != null) return;

        const raw = await AsyncStorage.getItem(SUCCESS_COUNT_KEY);
        const count = (parseInt(raw ?? "0", 10) || 0) + 1;
        await AsyncStorage.setItem(SUCCESS_COUNT_KEY, String(count));
        if (count < ASK_ON_NTH_SUCCESS) return;

        const existing = await Notifications.getPermissionsAsync();
        if (existing.status === "granted") {
            await syncPushTokenIfPermitted();
            return;
        }
        // Already denied? iOS will not re-prompt. Mark it and stop trying.
        if (!existing.canAskAgain) {
            await AsyncStorage.setItem(PUSH_ASKED_KEY, "1");
            return;
        }

        // Mark BEFORE prompting: the ask is one-shot on iOS whatever the answer,
        // and re-asking is worse than occasionally missing one.
        await AsyncStorage.setItem(PUSH_ASKED_KEY, "1");

        // Our own question first. iOS grants one chance and a cold system
        // sheet is refused by most people; a sentence saying WHAT we would
        // send (the daily credit, a trial ending) lets the user decline here
        // without spending Apple's prompt, and reach it already decided.
        const proceed = await new Promise<boolean>((resolve) =>
            Alert.alert(t("push.preprompt_title"), t("push.preprompt_body"), [
                { text: t("push.preprompt_later"), style: "cancel", onPress: () => resolve(false) },
                { text: t("push.preprompt_yes"), onPress: () => resolve(true) },
            ]),
        );
        if (!proceed) return;

        const { status } = await Notifications.requestPermissionsAsync();
        if (status === "granted") {
            await syncPushTokenIfPermitted();
        }
    }, [t]);

    useEffect(() => {
        if (!jobSucceeded) return;
        let cancelled = false;
        const timer = setTimeout(() => {
            if (!cancelled) ask().catch(() => {});
        }, ASK_DELAY_MS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [jobSucceeded, ask]);
}
