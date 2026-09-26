import { create } from "zustand";

/**
 * The first minutes after someone pays (2.0.0).
 *
 * <p>September 2026: three of the four people who bought a weekly plan turned
 * auto-renew off the next day, and one of them had hit the credits wall again
 * minutes after paying. The purchase is the most motivated moment the app
 * gets; if nothing good happens in the next few minutes it becomes the
 * cancellation. So the app remembers WHY the paywall opened, sends the person
 * back to finish that exact thing, and keeps every other ask — rating, push
 * permission, another paywall — away while they do.
 */
const QUIET_MS = 10 * 60 * 1000;
const RESUME_MS = 15 * 60 * 1000;

export interface Resume {
    source: string;
    planCode: string | null;
}

interface PostPurchaseState {
    resume: (Resume & { at: number }) | null;
    quietUntil: number;
    /** When the last purchase went through; 0 = none this session. */
    purchasedAt: number;
    /** Called once, when a purchase has actually gone through. */
    begin: (source: string, planCode: string | null) => void;
    /** Hands the resume to the first screen that can act on it, once. */
    takeResume: (sources: string[]) => Resume | null;
}

export const usePostPurchaseStore = create<PostPurchaseState>((set, get) => ({
    resume: null,
    quietUntil: 0,
    purchasedAt: 0,
    begin: (source, planCode) => set({
        resume: { source, planCode, at: Date.now() },
        quietUntil: Date.now() + QUIET_MS,
        purchasedAt: Date.now(),
    }),
    takeResume: (sources) => {
        const r = get().resume;
        if (!r || !sources.includes(r.source) || Date.now() - r.at > RESUME_MS) return null;
        set({ resume: null });
        return { source: r.source, planCode: r.planCode };
    },
}));

/**
 * True for a while after a purchase: nothing the app starts on its own — no
 * push ask, no offer, no cancel question. The rating is the one ask started
 * by the user's own act (a save, a share); it follows {@link purchasedSince}.
 */
export const isPostPurchaseQuiet = (): boolean =>
    Date.now() < usePostPurchaseStore.getState().quietUntil;

/**
 * Did someone pay AFTER the given moment, recently enough that the visit still
 * belongs to the purchase? The rating reads this: a save made before paying is
 * not a reason to interrupt the minutes right after it, while a save made
 * after paying is exactly the value moment worth asking on.
 */
export const purchasedSince = (t: number): boolean => {
    const at = usePostPurchaseStore.getState().purchasedAt;
    return at > t && Date.now() - at < QUIET_MS;
};
