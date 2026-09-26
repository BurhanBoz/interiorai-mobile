import { openManageSubscriptions } from "@/services/iap";
import { useCancelSurveyStore } from "@/stores/cancelSurveyStore";
import { isFlagSet, setFlag } from "@/utils/oneShotFlag";

/**
 * The way into Apple's subscription page, with the one question first (2.0.0).
 *
 * <p>Asked once per billing period: someone who opens the page twice in a week
 * — to check a date, to switch plans — meets the question the first time and
 * goes straight through after that. Answered or skipped, Apple's page opens
 * the moment the sheet closes; nothing here can delay a cancellation.
 */
export async function manageSubscription(planCode: string | null, periodEnd: string | null): Promise<void> {
    const key = `cancel_survey_manage:${planCode ?? "none"}:${periodEnd ?? "none"}`;
    let asked = false;
    try {
        asked = await isFlagSet(key);
    } catch {
        // Unreadable: ask. One extra question beats a silent skip.
    }
    if (asked) {
        await openManageSubscriptions();
        return;
    }
    try {
        await setFlag(key);
    } catch {
        // Unwritable: the question may repeat next time — harmless.
    }
    useCancelSurveyStore.getState().open("MANAGE", planCode, () => {
        openManageSubscriptions().catch(() => {});
    });
}
