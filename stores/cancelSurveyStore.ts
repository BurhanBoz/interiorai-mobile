import { create } from "zustand";

export type CancelTrigger = "MANAGE" | "DETECTED";

/**
 * The one-question "why are you leaving" sheet (2.0.0, V189). Mounted once at
 * the root; opened from two places — the way into Apple's subscription page
 * (MANAGE), and the moment the app notices auto-renew is already off
 * (DETECTED). {@code then} runs after the sheet closes, answered or skipped:
 * for MANAGE it opens Apple's page, so the question can never stand between a
 * person and their cancellation.
 */
interface CancelSurveyState {
    visible: boolean;
    trigger: CancelTrigger;
    planCode: string | null;
    then: (() => void) | null;
    open: (trigger: CancelTrigger, planCode: string | null, then?: () => void) => void;
    close: () => void;
}

export const useCancelSurveyStore = create<CancelSurveyState>((set, get) => ({
    visible: false,
    trigger: "MANAGE",
    planCode: null,
    then: null,
    open: (trigger, planCode, then) => {
        if (get().visible) return;
        set({ visible: true, trigger, planCode, then: then ?? null });
    },
    close: () => {
        const next = get().then;
        set({ visible: false, then: null });
        next?.();
    },
}));
