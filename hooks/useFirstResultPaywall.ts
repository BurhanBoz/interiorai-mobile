import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { tierAtLeast } from "@/utils/planTier";
import { isFlagSet, setFlag } from "@/utils/oneShotFlag";
import type { JobResponse } from "@/types/api";

/** Let the reveal land before asking for anything. */
const DELAY_MS = 2500;

const flagFor = (userId: string) => `first_result_paywall:${userId}`;

/**
 * The offer, at the moment it has something to point at.
 *
 * <p>Opens the paywall once per user, after their FIRST completed result, with
 * that result as the hero. Everything the first-open placement lacked is
 * present here: the user has seen what the product does, has a render of their
 * own room in front of them, and the watermark on it is the thing being sold.
 *
 * <p>Paying tiers never see it. Keyed per user, not per device, for the same
 * reason the channel sheet is: a guest logout mints a new identity, and the
 * next person on the phone deserves their own first result.
 *
 * @return true when the paywall was scheduled by THIS visit — the other
 *         post-result prompts yield to it.
 */
export function useFirstResultPaywall(
    job: JobResponse | null,
    afterUrl: string | undefined,
    beforeUrl: string,
): boolean {
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const planCode = useSubscriptionStore((s) => s.subscription?.planCode);
    const [firedThisVisit, setFiredThisVisit] = useState(false);

    useEffect(() => {
        if (!job || job.status !== "COMPLETED" || !afterUrl || !userId) return;
        if (tierAtLeast(planCode, "BASE")) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        (async () => {
            const flag = flagFor(userId);
            if (await isFlagSet(flag)) return;
            if (cancelled) return;
            // Marked before it opens: one offer per person, whatever happens
            // next — a crash, a kill, a cancelled sheet — never a second one.
            await setFlag(flag);
            setFiredThisVisit(true);
            timer = setTimeout(() => {
                if (cancelled) return;
                router.push({
                    pathname: "/paywall",
                    params: { source: "FIRST_RESULT", beforeUrl, afterUrl },
                });
            }, DELAY_MS);
        })();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job?.id, job?.status, afterUrl, userId, planCode]);

    return firedThisVisit;
}
