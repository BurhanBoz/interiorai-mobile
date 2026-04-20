import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "./en.json";
import tr from "./tr.json";
import es from "./es.json";
import it from "./it.json";
import de from "./de.json";
import ja from "./ja.json";
import ko from "./ko.json";
import ar from "./ar.json";

/**
 * Registry of every bundled language pack.
 *
 * To add a new language:
 *   1. Create `./xx.json` with the same key structure as `en.json`.
 *   2. Import it above.
 *   3. Append a new entry here with its code, nativeName, and resource.
 *
 * The Settings → Language screen builds its list from `SUPPORTED_LANGUAGES`,
 * so the UI updates automatically when you add a new entry here.
 */
export interface SupportedLanguage {
    code: string;
    /** Native-script name shown in the language picker (e.g. "Türkçe", "Español"). */
    nativeName: string;
    /** English-friendly label shown as a secondary line in the picker. */
    englishName: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
    { code: "en", nativeName: "English",  englishName: "English" },
    { code: "tr", nativeName: "Türkçe",   englishName: "Turkish" },
    { code: "es", nativeName: "Español",  englishName: "Spanish" },
    { code: "it", nativeName: "Italiano", englishName: "Italian" },
    { code: "de", nativeName: "Deutsch",  englishName: "German" },
    { code: "ja", nativeName: "日本語",    englishName: "Japanese" },
    { code: "ko", nativeName: "한국어",    englishName: "Korean" },
    { code: "ar", nativeName: "العربية",  englishName: "Arabic" },
];

/** Languages that use right-to-left script. */
export const RTL_LANGUAGES = new Set(["ar"]);

export const DEFAULT_LANGUAGE = "en";

const resources: Record<string, { translation: Record<string, unknown> }> = {
    en: { translation: en },
    tr: { translation: tr },
    es: { translation: es },
    it: { translation: it },
    de: { translation: de },
    ja: { translation: ja },
    ko: { translation: ko },
    ar: { translation: ar },
};

/** Device locale → supported code (falls back to DEFAULT_LANGUAGE). */
function resolveInitialLanguage(): string {
    const deviceCode = Localization.getLocales()[0]?.languageCode ?? DEFAULT_LANGUAGE;
    const supported = SUPPORTED_LANGUAGES.some((l) => l.code === deviceCode);
    return supported ? deviceCode : DEFAULT_LANGUAGE;
}

i18n.use(initReactI18next).init({
    resources,
    lng: resolveInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
        escapeValue: false,
    },
});

export function isSupportedLanguage(code: string): boolean {
    return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

export default i18n;
