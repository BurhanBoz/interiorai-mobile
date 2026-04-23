import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    fetchPromptSuggestions,
    type PromptSuggestion,
    type PromptSuggestParams,
} from "@/services/prompts";

/**
 * Contextual prompt chips for the custom-prompt field.
 *
 * <p>Debounced by dependency change — re-fetches only when the user lands
 * on a new (style, room, mode) combination. Keys are cached in-memory for
 * the session so backward navigation in the wizard is instant.
 *
 * <p>Empty array is always a valid state (network failure / no matches).
 * Callers render nothing above the prompt field in that case.
 */
const sessionCache = new Map<string, PromptSuggestion[]>();

export function usePromptSuggestions(
    params: Omit<PromptSuggestParams, "locale">,
): { suggestions: PromptSuggestion[]; loading: boolean } {
    const { i18n } = useTranslation();
    const locale = (i18n.language || "en").split("-")[0];
    const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
    const [loading, setLoading] = useState(false);

    const key = [
        params.style ?? "",
        params.room ?? "",
        params.mode ?? "",
        params.tier ?? "",
        locale,
    ].join("|");

    useEffect(() => {
        const cached = sessionCache.get(key);
        if (cached) {
            setSuggestions(cached);
            return;
        }
        let cancelled = false;
        setLoading(true);
        fetchPromptSuggestions({ ...params, locale }).then((data) => {
            if (cancelled) return;
            sessionCache.set(key, data);
            setSuggestions(data);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return { suggestions, loading };
}
