import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { isFlagSet, setFlag } from "@/utils/oneShotFlag";

/** "Skip" on any tour ends every tour — the person said they do not want to be walked through. */
const SKIPPED_ALL = "tour.skipped.v1";

/**
 * Whether a first-run coach-mark tour should be on screen.
 *
 * <p>A tour is for someone opening the app for the first time, so it shows
 * only when the SERVER says this account has never completed a render
 * ({@code subscription.hasGenerated === false}). Unknown is not false: until
 * the subscription has loaded, or on a server that does not send the field,
 * nothing shows. Existing users updating to this version have rendered
 * before and never see it.
 *
 * <p>Each tour shows once per device. The flag lives in the Keychain
 * ({@link setFlag}), next to the guest identity, so deleting and reinstalling
 * the app does not replay it — the same lifetime as the account it describes.
 *
 * <p>The tour waits {@code delayMs} after the screen is focused and
 * {@code ready} turns true, so the layout has settled and a paywall that was
 * just dismissed has finished animating away. Leaving the screen hides it
 * without marking it seen.
 */
export function useFirstRunTour(key: string, ready: boolean, delayMs = 650) {
    const subscriptionResolved = useSubscriptionStore((s) => s.subscriptionResolved);
    const hasGenerated = useSubscriptionStore((s) => s.subscription?.hasGenerated);

    const [visible, setVisible] = useState(false);
    const [focused, setFocused] = useState(false);
    const finished = useRef(false);
    const flag = `tour.${key}.v1`;

    useFocusEffect(
        useCallback(() => {
            setFocused(true);
            return () => {
                setFocused(false);
                setVisible(false);
            };
        }, []),
    );

    const eligible = focused && ready && subscriptionResolved && hasGenerated === false;

    useEffect(() => {
        if (!eligible || finished.current) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        (async () => {
            const [seen, skippedAll] = await Promise.all([isFlagSet(flag), isFlagSet(SKIPPED_ALL)]);
            if (cancelled) return;
            if (seen || skippedAll) {
                finished.current = true;
                return;
            }
            timer = setTimeout(() => {
                if (!cancelled) setVisible(true);
            }, delayMs);
        })();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [eligible, flag, delayMs]);

    const finish = useCallback(
        (reason: "done" | "skip") => {
            finished.current = true;
            setVisible(false);
            setFlag(flag).catch(() => {});
            if (reason === "skip") setFlag(SKIPPED_ALL).catch(() => {});
        },
        [flag],
    );

    return { visible, finish };
}
