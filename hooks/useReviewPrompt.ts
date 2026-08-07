import { useEffect } from "react";
import { isFlagSet, setFlag, readCounter, writeCounter } from "@/utils/oneShotFlag";
import * as StoreReview from "expo-store-review";

/**
 * In-app rating request (ASO Stage 0, 2026-07-21). The listing has zero
 * ratings, which suppresses both search ranking and product-page conversion —
 * this is the highest-leverage fix on the ASO checklist.
 *
 * Strategy: ask ONCE, at the moment of demonstrated value — right after the
 * user views their 2nd successful generation (the 1st can be a fluke; by the
 * 2nd they've chosen to come back). Apple caps the system sheet at 3
 * shows/year and silently drops excess calls, but we self-limit anyway so the
 * single ask lands at a high-satisfaction moment instead of being burned by
 * the OS at random ones.
 *
 * Never blocks or throws: any storage/API failure just skips the ask.
 */

const SUCCESS_COUNT_KEY = "review_prompt_success_count";
const ASKED_KEY = "review_prompt_asked";
/** Ask on the Nth successfully viewed result. */
const ASK_ON_NTH_SUCCESS = 2;
/** Let the user enjoy the result before the sheet appears. */
const ASK_DELAY_MS = 2500;

export function useReviewPrompt(jobSucceeded: boolean) {
  useEffect(() => {
    if (!jobSucceeded) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        if (await isFlagSet(ASKED_KEY)) return;

        const count = (await readCounter(SUCCESS_COUNT_KEY)) + 1;
        await writeCounter(SUCCESS_COUNT_KEY, count);
        if (count < ASK_ON_NTH_SUCCESS) return;

        if (!(await StoreReview.isAvailableAsync())) return;

        timer = setTimeout(async () => {
          if (cancelled) return;
          // Mark BEFORE requesting: the OS gives no callback about whether
          // the sheet was actually shown, and re-asking is worse than
          // occasionally missing one.
          await setFlag(ASKED_KEY);
          await StoreReview.requestReview();
        }, ASK_DELAY_MS);
      } catch {
        // Fail-open: a rating ask must never affect the result screen.
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobSucceeded]);
}
