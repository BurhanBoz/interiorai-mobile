import { useCallback, useEffect, useState } from "react";
import { isFlagSet, setFlag } from "@/utils/oneShotFlag";

/**
 * One-shot dismissible UI state, persisted across launches AND reinstalls.
 *
 * `visible` starts false and only flips to true once storage confirms the
 * user has never seen this key — so a previously-seen element never flashes
 * on screen before hiding.
 *
 * Used for the welcome-trial banner, the studio "Professional Tips"
 * section, the Magic Edit intro and the progress-screen style hint
 * (2026-07 first-review feedback: onboarding chrome must get out of the
 * way once acknowledged).
 *
 * Two fixes are baked in, both from founder reports:
 *   - 2026-08-03: mark seen ON FIRST SHOW, not only on an explicit tap.
 *     Shipped 1.0.1 persisted only in `dismiss()`, so scrolling past an
 *     intro without hitting the X replayed it on EVERY entry.
 *   - 2026-08-07: the flag lives in the Keychain (see {@link isFlagSet}),
 *     giving it the same lifetime as the guest `device_key` — a reinstall
 *     that restores the account no longer replays the first-run intros.
 */
export function useDismissible(storageKey: string): [boolean, () => void] {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let alive = true;
        isFlagSet(storageKey)
            .then((seen) => {
                if (!alive || seen) return;
                setVisible(true);
                // One appearance = acknowledged; the X below only hides it
                // sooner within the same session.
                setFlag(storageKey).catch(() => {});
            })
            .catch(() => {
                // Storage unreadable — fail open (show the element).
                if (alive) setVisible(true);
            });
        return () => {
            alive = false;
        };
    }, [storageKey]);

    const dismiss = useCallback(() => {
        setVisible(false);
        setFlag(storageKey).catch(() => {});
    }, [storageKey]);

    return [visible, dismiss];
}
