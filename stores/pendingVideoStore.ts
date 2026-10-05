import { create } from "zustand";

/**
 * Room-video requests still on their way to the server, keyed by the design job they animate.
 *
 * <p>The backend writes the clip with Claude before it answers the create call (10–40 s), and its
 * one-clip-per-output guard only sees a clip once that row exists. A user who left the progress
 * screen in that window and tapped "Bring it to life" again would have started — and paid for — a
 * second clip. While an entry is here the result screen treats the clip as in progress and the
 * button reopens the progress screen instead of creating another. Session-only.
 */
type Entry = { status: "creating" | "failed"; error?: string };

interface PendingVideoState {
    byParent: Record<string, Entry>;
    start: (parentJobId: string) => void;
    fail: (parentJobId: string, error: string) => void;
    clear: (parentJobId: string) => void;
}

export const usePendingVideoStore = create<PendingVideoState>()((set) => ({
    byParent: {},
    start: (id) => set((s) => ({ byParent: { ...s.byParent, [id]: { status: "creating" } } })),
    fail: (id, error) => set((s) => ({ byParent: { ...s.byParent, [id]: { status: "failed", error } } })),
    clear: (id) => set((s) => {
        const next = { ...s.byParent };
        delete next[id];
        return { byParent: next };
    }),
}));
