import { create } from "zustand";

/**
 * The job request that is still on its way to the server.
 *
 * <p>Since 2026-10-05 the backend writes the design plan with Claude Sonnet before it answers the create call —
 * 40-75 s on the owner's first tests. Waiting on the composer with only a spinning button left the user staring at
 * a frozen screen, so Generate now opens the progress screen at once and the request finishes there: this store
 * hands the screen the job id (or the error) when it arrives. Session-only; one request at a time, keyed by an id
 * the screen receives as its `pending` param so a stale answer never lands on a newer screen.
 */
interface PendingGenerationState {
    current: { id: string; jobId: string | null; error: string | null } | null;
    start: (id: string) => void;
    resolve: (id: string, jobId: string) => void;
    fail: (id: string, error: string) => void;
}

export const usePendingGenerationStore = create<PendingGenerationState>()((set, get) => ({
    current: null,
    start: (id) => set({ current: { id, jobId: null, error: null } }),
    resolve: (id, jobId) => {
        if (get().current?.id === id) set({ current: { id, jobId, error: null } });
    },
    fail: (id, error) => {
        if (get().current?.id === id) set({ current: { id, jobId: null, error } });
    },
}));
