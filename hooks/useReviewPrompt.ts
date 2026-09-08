import { useEffect } from "react";
import { isFlagSet, setFlag } from "@/utils/oneShotFlag";
import * as StoreReview from "expo-store-review";

/**
 * In-app rating request. The listing still has zero ratings, which suppresses
 * both search ranking and product-page conversion — so the ask has to land,
 * and it has to land on someone who liked something.
 *
 * <p><b>Why this no longer counts renders.</b> It used to ask on the 4th
 * successful result. The median user makes ONE, so the ask was reaching almost
 * nobody: 84 users had generated and the store still reported "not enough
 * ratings" (2026-09-09). Counting renders also asks the wrong question — a
 * render viewed is not a render liked.
 *
 * <p>It now asks on the first VALUE signal: the user saved, shared or
 * favourited a result. That is the strongest evidence of satisfaction the app
 * can observe, it happens on the user's own tap, and for a one-render user it
 * happens inside their only visit.
 *
 * <p>Asked once per install. Apple caps the system sheet at 3 shows/year and
 * silently drops the excess, so the single ask is spent deliberately rather
 * than burned by the OS at a random moment.
 *
 * <p>Never blocks or throws: any storage or API failure just skips the ask.
 */

const ASKED_KEY = "review_prompt_asked";

/**
 * Long enough for the "Saved to Photos" alert to be read and dismissed.
 * saveToPhotos fires that alert without awaiting it, so the rating sheet would
 * otherwise race a modal that is already on screen — and iOS drops a review
 * request it cannot present.
 */
const ASK_DELAY_MS = 4000;

/**
 * @param valueSignal true once the user has saved, shared or favourited a
 *   result in this visit. Pass false while nothing has happened yet.
 */
export function useReviewPrompt(valueSignal: boolean) {
  useEffect(() => {
    if (!valueSignal) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        if (await isFlagSet(ASKED_KEY)) return;
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
  }, [valueSignal]);
}
