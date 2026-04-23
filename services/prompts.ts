import api from "./api";

export interface PromptSuggestion {
    id: string;
    text: string;
    category: string;
    /** STATIC | LLM | USER_SUBMITTED — future-proofed for Level 2 dynamic chips. */
    source: string;
}

export interface PromptSuggestParams {
    style?: string | null;
    room?: string | null;
    mode?: string | null;
    tier?: string | null;
    locale: string;
    limit?: number;
}

/**
 * Fetch curated prompt chips for the current wizard state. Backend returns
 * up to 8 by default, ranked by specificity (style+room > style > room >
 * wildcard). Gracefully falls back to [] on any network error — the custom
 * prompt field still works without chips.
 */
export async function fetchPromptSuggestions(
    params: PromptSuggestParams,
): Promise<PromptSuggestion[]> {
    try {
        const { data } = await api.get<PromptSuggestion[]>("/api/prompts/suggest", {
            params: {
                style: params.style ?? undefined,
                room: params.room ?? undefined,
                mode: params.mode ?? undefined,
                tier: params.tier ?? undefined,
                locale: params.locale,
                limit: params.limit ?? 8,
            },
        });
        return data;
    } catch {
        return [];
    }
}
