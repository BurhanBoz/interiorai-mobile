import { create } from "zustand";
import type { CatalogItemResponse, DesignMode, MaskMode, MaskStroke, QualityTier, SpeedMode } from "@/types/api";

interface StudioState {
    step: 1 | 2 | 3 | 4;
    photo: { uri: string; fileId: string; width?: number | null; height?: number | null } | null;
    roomType: CatalogItemResponse | null;
    designStyle: CatalogItemResponse | null;
    mode: DesignMode;
    qualityTier: QualityTier;
    speedMode: SpeedMode;
    numOutputs: number;
    preserveLayout: boolean;
    prompt: string;
    negativePrompt: string;
    colorPalette: string;
    seed: number | undefined;
    strength: number;
    /**
     * Undefined when the user hasn't touched the guidance slider — this
     * lets the backend pick the style-specific override (design_style_guidance
     * table: Modern/SDXL=8.5, Scandinavian/FLUX=3.5 …). Sending a numeric
     * default here would short-circuit that and force 7.5 for everything.
     */
    guidanceScale: number | undefined;
    referencePhoto: { uri: string; fileId: string; width?: number | null; height?: number | null } | null;
    /**
     * Backend MASK file id produced by the Smart Edit drawing screen
     * (POST /api/files/{inputFileId}/mask). Belongs to the CURRENT photo —
     * setPhoto() clears it so a stale mask can never ride along with a
     * freshly uploaded image.
     */
    maskFileId: string | null;
    /**
     * The normalized strokes behind maskFileId — kept so the Review screen
     * can re-render the painted overlay on the photo preview without
     * fetching the server-rendered mask PNG. Lifecycle mirrors maskFileId.
     */
    maskStrokes: MaskStroke[] | null;
    /** CHANGE = painted area changes; PROTECT = painted area is preserved. */
    maskMode: MaskMode | null;
    /**
     * IO-2 "+" tiles. Extra STYLE references (Style Transfer only) and
     * OBJECT insertions (free-form modes, preserve off). Kept as separate
     * arrays because they live on different screens and carry different
     * backend roles; each entry bills +1 credit.
     */
    extraStyleRefs: { uri: string; fileId: string }[];
    objectRefs: { uri: string; fileId: string }[];
    setStep: (step: 1 | 2 | 3 | 4) => void;
    setPhoto: (photo: { uri: string; fileId: string; width?: number | null; height?: number | null } | null) => void;
    setRoomType: (roomType: CatalogItemResponse | null) => void;
    setDesignStyle: (style: CatalogItemResponse | null) => void;
    setMode: (mode: DesignMode) => void;
    setQualityTier: (tier: QualityTier) => void;
    setSpeedMode: (mode: SpeedMode) => void;
    setNumOutputs: (n: number) => void;
    setPreserveLayout: (v: boolean) => void;
    setPrompt: (v: string) => void;
    setNegativePrompt: (v: string) => void;
    setColorPalette: (v: string) => void;
    setSeed: (v: number | undefined) => void;
    setStrength: (v: number) => void;
    setGuidanceScale: (v: number | undefined) => void;
    setReferencePhoto: (photo: { uri: string; fileId: string; width?: number | null; height?: number | null } | null) => void;
    /** Atomically set (or clear with nulls) the mask file id + its strokes. */
    setMask: (fileId: string | null, strokes: MaskStroke[] | null, mode: MaskMode | null) => void;
    addExtraStyleRef: (ref: { uri: string; fileId: string }) => void;
    removeExtraStyleRef: (fileId: string) => void;
    addObjectRef: (ref: { uri: string; fileId: string }) => void;
    removeObjectRef: (fileId: string) => void;
    reset: () => void;
}

/**
 * Default color palette — Pantone 2025 "Mocha Mousse" warm-neutral set.
 *
 * Hex order matches PALETTE_THEMES[0] in studio/options.tsx ("warm-mocha")
 * and the encoding convention `colors.join(";")` from encodePalette().
 *
 * Rationale: an empty palette ("") had been the default, which surfaced
 * "No palette selected" to first-time users — the studio felt unfinished
 * and the prompt pipeline lost the warm-neutral anchor that lifts most
 * generations. A safe, designer-approved baseline is a better starting
 * point; users who want neutral output can still tap "None" inside the
 * palette sheet to go back to the empty-string state.
 */
const DEFAULT_COLOR_PALETTE = "#A48359;#EADEC8;#F5F1E8";

const initialState = {
    step: 1 as const,
    photo: null,
    roomType: null,
    designStyle: null,
    mode: "REDESIGN" as DesignMode,
    qualityTier: "STANDARD" as QualityTier,
    speedMode: "BALANCED" as SpeedMode,
    numOutputs: 1,
    // Free-form by default (2026-08-11). Preserve pins every piece of
    // furniture in place, so the default run only ever restyled surfaces —
    // a weaker first impression than the redesign people came for. It stays
    // one tap away in Advanced for the "same layout, new materials" job.
    preserveLayout: false,
    prompt: "",
    negativePrompt: "",
    colorPalette: DEFAULT_COLOR_PALETTE,
    seed: undefined,
    strength: 0.7,
    guidanceScale: undefined,
    referencePhoto: null,
    maskFileId: null,
    maskStrokes: null,
    maskMode: null,
    extraStyleRefs: [] as { uri: string; fileId: string }[],
    objectRefs: [] as { uri: string; fileId: string }[],
};

export const useStudioStore = create<StudioState>((set) => ({
    ...initialState,
    setStep: (step) => set({ step }),
    // A mask is drawn against ONE specific photo — changing (or clearing)
    // the photo invalidates it.
    setPhoto: (photo) => set({ photo, maskFileId: null, maskStrokes: null, maskMode: null }),
    setRoomType: (roomType) => set({ roomType }),
    setDesignStyle: (designStyle) => set({ designStyle }),
    setMode: (mode) =>
        // preserve_layout is only meaningful for REDESIGN. When switching
        // to EMPTY_ROOM / INPAINT / STYLE_TRANSFER, force it off so the
        // backend never receives a stale `true` that would trigger the
        // wildcard-fallback routing bug + furniture-pin directive.
        // IO-2: extras are mode-scoped (STYLE↔ST, OBJECT↔free-form) — a
        // stale array from the previous mode would be rejected server-side,
        // so a mode switch clears both.
        set((state) => ({
            mode,
            preserveLayout: mode === "REDESIGN" ? state.preserveLayout : false,
            extraStyleRefs: [],
            objectRefs: [],
        })),
    setQualityTier: (qualityTier) => set({ qualityTier }),
    setSpeedMode: (speedMode) => set({ speedMode }),
    setNumOutputs: (numOutputs) => set({ numOutputs }),
    // IO-2: object insertion rides the flux-2 input_images channel, which
    // the preserve (depth) route doesn't have — turning preserve ON drops
    // the attached objects (the options screen hides the row in that state).
    setPreserveLayout: (preserveLayout) =>
        set((state) => ({
            preserveLayout,
            objectRefs: preserveLayout ? [] : state.objectRefs,
        })),
    setPrompt: (prompt) => set({ prompt }),
    setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
    setColorPalette: (colorPalette) => set({ colorPalette }),
    setSeed: (seed) => set({ seed }),
    setStrength: (strength) => set({ strength }),
    setGuidanceScale: (guidanceScale) => set({ guidanceScale }),
    setReferencePhoto: (referencePhoto) => set({ referencePhoto }),
    setMask: (maskFileId, maskStrokes, maskMode) => set({ maskFileId, maskStrokes, maskMode }),
    addExtraStyleRef: (ref) =>
        set((state) =>
            state.extraStyleRefs.length >= 2
                || state.extraStyleRefs.some((r) => r.fileId === ref.fileId)
                ? state
                : { extraStyleRefs: [...state.extraStyleRefs, ref] }),
    removeExtraStyleRef: (fileId) =>
        set((state) => ({ extraStyleRefs: state.extraStyleRefs.filter((r) => r.fileId !== fileId) })),
    addObjectRef: (ref) =>
        set((state) =>
            state.objectRefs.length >= 2
                || state.objectRefs.some((r) => r.fileId === ref.fileId)
                ? state
                : { objectRefs: [...state.objectRefs, ref] }),
    removeObjectRef: (fileId) =>
        set((state) => ({ objectRefs: state.objectRefs.filter((r) => r.fileId !== fileId) })),
    reset: () => set(initialState),
}));
