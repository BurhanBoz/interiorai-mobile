import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { usePostPurchaseStore } from "@/stores/postPurchaseStore";

/**
 * "You're all set — pick up where you left off", once, on the screen the
 * purchase was made from (2.0.0).
 *
 * <p>The paywall remembers why it opened (postPurchaseStore); the first screen
 * that can act on that reason takes it on focus and says so beside the button
 * that continues the task. It never presses the button itself: credits are
 * spent on the user's tap, not on ours.
 *
 * @param sources the resume keys this screen can act on
 * @return whether to show the note, and a way to put it away
 */
export function useResumeNote(sources: string[]): [boolean, () => void] {
    const [shown, setShown] = useState(false);
    const key = sources.join("|");
    useFocusEffect(
        useCallback(() => {
            if (usePostPurchaseStore.getState().takeResume(key.split("|"))) setShown(true);
        }, [key]),
    );
    const hide = useCallback(() => setShown(false), []);
    return [shown, hide];
}
