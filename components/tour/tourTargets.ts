import type { View } from "react-native";

/**
 * Where the coach marks point.
 *
 * <p>A screen marks an element with {@code ref={tourTarget("studio.photo")}};
 * {@link CoachMarks} later asks that node where it sits on screen
 * ({@code measureInWindow}) when its step comes up. Nothing is measured until
 * then, so marking an element costs nothing for the users who never see a
 * tour.
 *
 * <p>The ref callbacks are cached per id: a fresh function on every render
 * would make React detach and re-attach the node each time.
 */
const nodes = new Map<string, View>();
const refs = new Map<string, (node: View | null) => void>();

export function tourTarget(id: string): (node: View | null) => void {
    let ref = refs.get(id);
    if (!ref) {
        ref = (node: View | null) => {
            if (node) nodes.set(id, node);
            else nodes.delete(id);
        };
        refs.set(id, ref);
    }
    return ref;
}

export type TargetRect = { x: number; y: number; width: number; height: number };

/** The element's frame in window coordinates, or null when it is not on screen. */
export function measureTarget(id: string): Promise<TargetRect | null> {
    const node = nodes.get(id);
    if (!node) return Promise.resolve(null);
    return new Promise((resolve) => {
        try {
            node.measureInWindow((x, y, width, height) => {
                resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
            });
        } catch {
            resolve(null);
        }
    });
}
