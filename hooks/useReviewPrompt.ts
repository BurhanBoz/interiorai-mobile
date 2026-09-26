import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { isFlagSet, readCounter, writeCounter } from "@/utils/oneShotFlag";
import { isScreenBusy } from "@/utils/screenBusy";
import { purchasedSince } from "@/stores/postPurchaseStore";
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
 * <p><b>2.0.0 — the rating waits instead of standing down.</b> Until 1.7.1
 * the ask gave up whenever another prompt had "claimed" the visit, and the
 * claims were far wider than the prompts: the where-did-you-hear sheet was
 * taken off the result screen in the 19 September redesign (0243ec2) but its
 * claim stayed, so from the third result on the visit was claimed forever and
 * the most engaged users were never asked. The first-result paywall claimed
 * the whole first visit too, even after it had closed. The owner's call for
 * 2.0.0 is that the rating must reach people, so the question is now narrow
 * and asked at the last moment: is something ON SCREEN right now that iOS
 * would refuse to present over? If so, wait for it to go — a closed paywall,
 * an answered alert — and then ask. Only leaving the screen gives up, and it
 * spends nothing.
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

/** While something is on screen, look again this often… */
const RECHECK_MS = 1500;
/** …for this long, then leave it for the next value moment. */
const MAX_WAIT_MS = 3 * 60 * 1000;

/**
 * @param valueSignal true once the user has saved, shared or favourited a
 *   result — or watched / saved a room video — in this visit.
 * @param isBlocked asked at FIRE time, and again while it says yes: is there
 *   anything on screen right now (another screen on top, an alert, a sheet)
 *   that the system rating sheet would be refused over?
 */
export function useReviewPrompt(valueSignal: boolean, isBlocked: () => boolean) {
  // Latest-callback ref: the caller's closure changes every render, the
  // schedule must not restart because of it.
  const blocked = useRef(isBlocked);
  blocked.current = isBlocked;

  useEffect(() => {
    if (!valueSignal) return;
    const signalAt = Date.now();
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

        const fire = async () => {
          if (cancelled) return;
          // A purchase made after this save owns the next few minutes:
          // the welcome screen and the task it resumes come first. A save
          // made after paying starts its own, later, ask.
          if (purchasedSince(signalAt)) return;
          // Three ways the screen can be taken: the caller's own prompts
          // and screens, our alerts and sheets (a save's "Saved" alert, the
          // share sheet), and a system dialog — the Photos permission
          // prompt puts the whole app into "inactive".
          if (blocked.current() || isScreenBusy() || AppState.currentState !== "active") {
            // Something is up — a paywall, an alert, the fullscreen viewer.
            // iOS would drop the request and we would have spent an attempt
            // on nothing. Look again shortly; the moment it closes, ask.
            if (Date.now() - signalAt < MAX_WAIT_MS) timer = setTimeout(fire, RECHECK_MS);
            return;
          }
          // Still recorded BEFORE the call, because the OS reports nothing
          // back. The difference is what "recorded" now costs: one of three
          // attempts rather than the only one.
          await writeCounter(ATTEMPTS_KEY, attempts + 1);
          await writeCounter(LAST_DAY_KEY, epochDay());
          await StoreReview.requestReview();
        };
        timer = setTimeout(fire, ASK_DELAY_MS);
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
