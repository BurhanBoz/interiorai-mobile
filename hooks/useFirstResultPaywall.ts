import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { tierAtLeast } from "@/utils/planTier";
import { isFlagSet, setFlag, readCounter, writeCounter } from "@/utils/oneShotFlag";
import type { JobResponse } from "@/types/api";
import { isPostPurchaseQuiet } from "@/stores/postPurchaseStore";

/** Let the reveal land before asking for anything. */
const DELAY_MS = 2500;

/**
 * Exported because the root gate reads the SAME flag to decide the
 * return-visit offer: "has this person already met the first-result offer"
 * is one question, and two hand-written copies of the key is how the two
 * askers drift apart.
 */
export const firstResultOfferFlag = (userId: string) => `first_result_paywall:${userId}`;
const flagFor = firstResultOfferFlag;
/** Distinct completed results this identity has opened (2.6.0). */
export const resultCountKey = (userId: string) => `result_count:${userId}`;
const RESULTS_BEFORE_OFFER = 2;

/**
 * The offer, at the moment it has something to point at.
 *
 * <p>Opens the paywall once per user, after their FIRST completed result, with
 * that result as the hero. Everything the first-open placement lacked is
 * present here: the user has seen what the product does, has a render of their
 * own room in front of them, and the watermark on it is the thing being sold.
 *
 * <p>2.6.0 (owner, 17 Oct): it now waits for the SECOND completed result. On the first one
 * it was shown 112 times in the 30 days to 16 Oct and three people picked a plan: the
 * moment belongs to the result (save, share, a second look), not to a price. Someone who
 * makes a second design has shown they want more — that is the one to ask. Each result is
 * counted once (a per-job flag), so reopening the same result does not advance the count.
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
        // Someone who just bought a pack is finishing their room, not
        // shopping; the offer keeps its once-per-person flag for later.
        if (isPostPurchaseQuiet()) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        (async () => {
            const flag = flagFor(userId);
            if (await isFlagSet(flag)) return;
            // Count distinct completed results; ask on the second.
            const seen = `result_seen:${userId}:${job.id}`;
            let count = await readCounter(resultCountKey(userId));
            if (!(await isFlagSet(seen))) {
                await setFlag(seen);
                count += 1;
                await writeCounter(resultCountKey(userId), count);
            }
            if (count < RESULTS_BEFORE_OFFER || cancelled) return;
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
