import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * One-shot dismissible UI state, persisted across launches.
 *
 * `visible` starts false and only flips to true once AsyncStorage confirms
 * the user has never dismissed this key — so a previously-dismissed element
 * never flashes on screen before hiding. `dismiss()` hides it immediately
 * and persists the choice.
 *
 * Used for the welcome-trial banner and the studio "Professional Tips"
 * section (2026-07 first-review feedback: onboarding chrome must get out
 * of the way once acknowledged).
 */
export function useDismissible(storageKey: string): [boolean, () => void] {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let alive = true;
        AsyncStorage.getItem(storageKey)
            .then((stored) => {
                if (alive && stored == null) setVisible(true);
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
        AsyncStorage.setItem(storageKey, "1").catch(() => {});
    }, [storageKey]);

    return [visible, dismiss];
}
