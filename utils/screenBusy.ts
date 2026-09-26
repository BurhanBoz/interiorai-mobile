/**
 * Is one of our alerts, a share sheet or a save in flight on screen right now?
 *
 * <p>The rating reads this before it asks (2.0.0). iOS silently drops a review
 * request it cannot present over another modal, and the app has already
 * recorded the attempt by then — one of three a year, gone. Saving and
 * sharing are exactly the moments the rating is asked on, and both put
 * something on screen: the Photos permission prompt, the "Saved" alert, the
 * share sheet. They mark themselves here; the rating waits until all are gone.
 *
 * <p>System dialogs (a permission prompt) also move the app to "inactive",
 * which the rating checks separately — this covers what AppState cannot see:
 * our own alerts and sheets inside an active app.
 */
const busy = new Set<string>();

export const markBusy = (tag: string): void => {
    busy.add(tag);
};

export const markFree = (tag: string): void => {
    busy.delete(tag);
};

export const isScreenBusy = (): boolean => busy.size > 0;
