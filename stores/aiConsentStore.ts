import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * AI-processing consent (App Store Guideline 5.1.2(i)).
 *
 * <p>Apple requires that BEFORE any personal data (the user's room photo,
 * mask/reference images, design choices) is sent to a third-party AI
 * service, the app must disclose WHAT is sent and TO WHOM, and obtain the
 * user's permission. This store is that gate.
 *
 * <p>Wiring: {@code useImagePicker.pickImage} awaits {@link request} before
 * opening the camera/gallery — the single choke-point every upload flow
 * (redesign, empty room, Magic Edit, Style Transfer reference) goes
 * through, so nothing can reach the network without consent.
 *
 * <p>Semantics: consent is asked ONCE and persisted with its timestamp
 * (audit trail). Declining does NOT persist a refusal — the feature simply
 * doesn't proceed, and the sheet appears again on the next attempt,
 * because without consent there is nothing else the generation flows can
 * legally do.
 */
interface AiConsentState {
    /** User accepted the AI-processing disclosure. Persisted. */
    granted: boolean;
    /** ISO timestamp of acceptance — audit trail. Persisted. */
    grantedAt: string | null;
    /** Consent sheet visibility (session-only). */
    visible: boolean;
    /** Resolver of the in-flight request() promise (session-only). */
    resolver: ((ok: boolean) => void) | null;
    /**
     * The gate: resolves true immediately when consent was already given,
     * otherwise shows the sheet and resolves with the user's decision.
     */
    request: () => Promise<boolean>;
    accept: () => void;
    decline: () => void;
}

export const useAiConsentStore = create<AiConsentState>()(
    persist(
        (set, get) => ({
            granted: false,
            grantedAt: null,
            visible: false,
            resolver: null,

            request: () => {
                if (get().granted) return Promise.resolve(true);
                // A second caller while the sheet is open piggybacks on a
                // fresh promise; the previous resolver is answered false so
                // no caller is left hanging.
                get().resolver?.(false);
                return new Promise<boolean>((resolve) => {
                    set({ visible: true, resolver: resolve });
                });
            },

            accept: () => {
                const { resolver } = get();
                set({
                    granted: true,
                    grantedAt: new Date().toISOString(),
                    visible: false,
                    resolver: null,
                });
                resolver?.(true);
            },

            decline: () => {
                const { resolver } = get();
                set({ visible: false, resolver: null });
                resolver?.(false);
            },
        }),
        {
            name: "ai-consent-store",
            storage: createJSONStorage(() => AsyncStorage),
            version: 1,
            // Only the durable facts — never the transient UI/promise state.
            partialize: (s) => ({ granted: s.granted, grantedAt: s.grantedAt }),
        },
    ),
);
