import { useEffect } from "react";
import { isFlagSet, readCounter, writeCounter } from "@/utils/oneShotFlag";
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
 * <p><b>Why this is no longer one-shot.</b> It used to write "asked" and then
 * call the OS, on the reasoning that iOS reports nothing back and re-asking
 * is worse than missing one. But iOS silently REFUSES to present the sheet
 * while another modal is up — and until 2026-09-16 the ask could land on the
 * first-result visit, where the paywall is already on screen. The refusal
 * costs nothing on Apple's side and everything on ours: the user is marked
 * asked and is never asked again. In the seven days to 2026-09-16 about 25
 * people saved a result and the listing gained zero ratings; France, the only
 * market we advertise in, still shows none at all.
 *
 * <p>So the ask now has a small budget instead of one shot: at most
 * {@link MAX_ATTEMPTS} attempts, on separate visits, at least
 * {@link MIN_GAP_DAYS} days apart. That number is Apple's own — the system
 * sheet is capped at three shows per year and the OS drops the excess without
 * complaint — so spending it across three visits asks no more of the user
 * than the old design intended, and survives an attempt that was never shown.
 *
 * <p>Never blocks or throws: any storage or API failure just skips the ask.
 */

/** The 1.5.0 one-shot flag. Read only to migrate; never written again. */
const LEGACY_ASKED_KEY = "review_prompt_asked";
const ATTEMPTS_KEY = "review_prompt_attempts";
/** Day number (epoch days, UTC) of the last attempt. 0 = never. */
const LAST_DAY_KEY = "review_prompt_last_day";

/** Apple's own ceiling for the system sheet. Asking past it is a no-op anyway. */
const MAX_ATTEMPTS = 3;
/** A second try lands on a later visit, not a later minute. */
const MIN_GAP_DAYS = 3;

const epochDay = () => Math.floor(Date.now() / 86_400_000);

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
export function useReviewPrompt(
  valueSignal: boolean,
  /**
   * Read at FIRE time, not at schedule time.
   *
   * <p>The gate used to be a boolean argument evaluated when the effect ran,
   * which meant it answered "has anything claimed this visit YET" four
   * seconds before the sheet was actually requested. Other prompts decide
   * asynchronously — a Keychain read, a counter, their own delay — so the
   * honest answer only exists later. Passing a ref moves the question to the
   * moment it matters.
   */
  visitClaimed: { current: boolean },
) {
  useEffect(() => {
    if (!valueSignal) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        let attempts = await readCounter(ATTEMPTS_KEY);
        // Anyone carrying the 1.5.0 one-shot flag has spent exactly one
        // attempt — not all three. Seeding it this way is what gives the
        // users the old design stranded another chance.
        if (attempts === 0 && (await isFlagSet(LEGACY_ASKED_KEY))) {
          attempts = 1;
          await writeCounter(ATTEMPTS_KEY, attempts);
        }
        if (attempts >= MAX_ATTEMPTS) return;

        const lastDay = await readCounter(LAST_DAY_KEY);
        if (lastDay > 0 && epochDay() - lastDay < MIN_GAP_DAYS) return;

        if (!(await StoreReview.isAvailableAsync())) return;

        timer = setTimeout(async () => {
          if (cancelled) return;
          // Someone else took the visit while we were waiting. Standing down
          // costs nothing; asking would spend an attempt on a sheet iOS is
          // going to refuse, which is exactly how the budget was burned
          // before anyone could see it happening.
          if (visitClaimed.current) return;
          // Still recorded BEFORE the call, because the OS reports nothing
          // back. The difference is what "recorded" now costs: one of three
          // attempts rather than the only one.
          await writeCounter(ATTEMPTS_KEY, attempts + 1);
          await writeCounter(LAST_DAY_KEY, epochDay());
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
  }, [valueSignal, visitClaimed]);
}
