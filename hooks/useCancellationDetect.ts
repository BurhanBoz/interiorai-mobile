import { useEffect } from "react";
import { AppState } from "react-native";
import { findLapsingSubscription } from "@/services/iap";
import { useCancelSurveyStore } from "@/stores/cancelSurveyStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { isPostPurchaseQuiet } from "@/stores/postPurchaseStore";
import { isFlagSet, setFlag } from "@/utils/oneShotFlag";

/** Let the screen settle before a sheet slides over it. */
const DELAY_MS = 1500;

/**
 * Asks, once, why someone turned auto-renew off (2.0.0, V189).
 *
 * <p>Most cancellations never pass through the app — iOS Settings is where
 * people go, and Apple tells us nothing. The receipt does: on launch and on
 * every return to the foreground this looks for an active subscription whose
 * renewal was switched off, and asks once per subscription period. Keyed by
 * product and expiry, so someone who re-subscribes and cancels again is asked
 * again, and nobody is asked twice about the same decision.
 */
export function useCancellationDetect(enabled: boolean): void {
    useEffect(() => {
        if (!enabled) return;
        let busy = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const check = async () => {
            if (busy || isPostPurchaseQuiet()) return;
            busy = true;
            try {
                const lapsing = await findLapsingSubscription();
                if (!lapsing) return;
                const key = `cancel_survey:${lapsing.productId}:${lapsing.expires ?? ""}`;
                if (await isFlagSet(key)) return;
                // Marked before it opens: one ask per decision, whatever
                // happens next.
                await setFlag(key);
                const planCode = useSubscriptionStore.getState().subscription?.planCode ?? null;
                timer = setTimeout(() => {
                    useCancelSurveyStore.getState().open("DETECTED", planCode);
                }, DELAY_MS);
            } catch {
                // A survey must never cost the user anything.
            } finally {
                busy = false;
            }
        };

        check();
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") check();
        });
        return () => {
            sub.remove();
            if (timer) clearTimeout(timer);
        };
    }, [enabled]);
}
