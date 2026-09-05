import { useEffect, useState } from "react";
import { readCounter, writeCounter } from "@/utils/oneShotFlag";

const KEY = "result_success_count";

/**
 * How many successful results this install has viewed, counted once per
 * result-screen visit — the number the post-result prompts sequence on.
 *
 * <p>The prompts that follow a render are rationed: the offer on the 1st,
 * the notification ask on the 2nd, the channel question on the 3rd, the
 * rating on the 4th. Two system sheets in one visit get both dismissed, and
 * the push prompt on iOS is one-shot forever. Returns 0 until the count for
 * THIS visit is known, so a consumer never acts on a stale number.
 */
export function useSuccessCount(jobSucceeded: boolean): number {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!jobSucceeded) return;
        let cancelled = false;
        (async () => {
            const n = (await readCounter(KEY)) + 1;
            await writeCounter(KEY, n);
            if (!cancelled) setCount(n);
        })();
        return () => {
            cancelled = true;
        };
    }, [jobSucceeded]);
    return count;
}
