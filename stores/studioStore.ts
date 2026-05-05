import { create } from "zustand";
import type { CatalogItemResponse, DesignMode, QualityTier, SpeedMode } from "@/types/api";

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
    maskData: string | null;
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
    setMaskData: (data: string | null) => void;
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
    preserveLayout: true,
    prompt: "",
    negativePrompt: "",
    colorPalette: DEFAULT_COLOR_PALETTE,
    seed: undefined,
    strength: 0.7,
    guidanceScale: undefined,
    referencePhoto: null,
    maskData: null,
};

export const useStudioStore = create<StudioState>((set) => ({
    ...initialState,
    setStep: (step) => set({ step }),
    setPhoto: (photo) => set({ photo }),
    setRoomType: (roomType) => set({ roomType }),
    setDesignStyle: (designStyle) => set({ designStyle }),
    setMode: (mode) =>
        // preserve_layout is only meaningful for REDESIGN. When switching
        // to EMPTY_ROOM / INPAINT / STYLE_TRANSFER, force it off so the
        // backend never receives a stale `true` that would trigger the
        // wildcard-fallback routing bug + furniture-pin directive.
        set((state) => ({
            mode,
            preserveLayout: mode === "REDESIGN" ? state.preserveLayout : false,
        })),
    setQualityTier: (qualityTier) => set({ qualityTier }),
    setSpeedMode: (speedMode) => set({ speedMode }),
    setNumOutputs: (numOutputs) => set({ numOutputs }),
    setPreserveLayout: (preserveLayout) => set({ preserveLayout }),
    setPrompt: (prompt) => set({ prompt }),
    setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
    setColorPalette: (colorPalette) => set({ colorPalette }),
    setSeed: (seed) => set({ seed }),
    setStrength: (strength) => set({ strength }),
    setGuidanceScale: (guidanceScale) => set({ guidanceScale }),
    setReferencePhoto: (referencePhoto) => set({ referencePhoto }),
    setMaskData: (maskData) => set({ maskData }),
    reset: () => set(initialState),
}));
