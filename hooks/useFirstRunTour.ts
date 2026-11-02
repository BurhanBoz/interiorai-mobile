import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useAuthStore } from "@/stores/authStore";
import { clearFlag, isFlagSet, setFlag } from "@/utils/oneShotFlag";

/** Every tour the app has. resetTours() forgets all of them. */
const TOUR_KEYS = ["studio", "composer"] as const;
type TourKey = (typeof TOUR_KEYS)[number];

/**
 * 3.0.0 (21 Oct): the flag is PER IDENTITY, like first_open and result_count. It used to be one
 * per device, so the first guest to finish the tour finished it for every guest the device would
 * ever create — a "full reset (new guest)" on the owner's phone, or a reinstall, never replayed it.
 * (The old device-wide key is left alone; an identity that has rendered is ineligible anyway.)
 */
const flagOf = (key: TourKey, uid: string | null) => (uid ? `tour.${key}.v1:${uid}` : `tour.${key}.v1`);

/**
 * Build 92 (TestFlight only) had a "Skip" that ended every tour through this flag.
 * Nothing reads it any more; it is only cleared by resetTours().
 */
const LEGACY_SKIPPED_ALL = "tour.skipped.v1";

/**
 * Tours finished in this session. Kept outside the screens because the tab
 * screens stay mounted — a reset has to reach a screen that is already open.
 */
const finishedThisSession = new Set<TourKey>();

/**
 * Forget that the tours were seen, so they play again on this device.
 *
 * <p>For the owner's own testing (a long press on the version line in
 * Help). A tour still only shows to an account that has never rendered —
 * this does not change that.
 */
export async function resetTours(): Promise<void> {
    finishedThisSession.clear();
    const uid = useAuthStore.getState().user?.id ?? null;
    await Promise.all([
        ...TOUR_KEYS.map((k) => clearFlag(flagOf(k, uid))),
        ...TOUR_KEYS.map((k) => clearFlag(flagOf(k, null))),
        clearFlag(LEGACY_SKIPPED_ALL),
    ]);
}

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
export function useFirstRunTour(key: TourKey, ready: boolean, delayMs = 650) {
    const subscriptionResolved = useSubscriptionStore((s) => s.subscriptionResolved);
    const hasGenerated = useSubscriptionStore((s) => s.subscription?.hasGenerated);

    const uid = useAuthStore((s) => s.user?.id ?? null);

    const [visible, setVisible] = useState(false);
    const [focused, setFocused] = useState(false);
    const flag = flagOf(key, uid);

    useFocusEffect(
        useCallback(() => {
            setFocused(true);
            return () => {
                setFocused(false);
                setVisible(false);
            };
        }, []),
    );

    // No identity yet (the /me call still in flight) → wait; the flag must be read under the right name.
    const eligible = focused && ready && subscriptionResolved && hasGenerated === false && uid !== null;

    useEffect(() => {
        if (!eligible || finishedThisSession.has(key)) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        (async () => {
            const seen = await isFlagSet(flag);
            if (cancelled) return;
            if (seen) {
                finishedThisSession.add(key);
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
    }, [eligible, key, flag, delayMs]);

    const finish = useCallback(
        () => {
            finishedThisSession.add(key);
            setVisible(false);
            setFlag(flag).catch(() => {});
        },
        [key, flag],
    );

    return { visible, finish };
}
