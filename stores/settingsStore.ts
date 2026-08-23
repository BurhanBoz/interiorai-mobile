import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from "react-native";
import i18n, { RTL_LANGUAGES, isSupportedLanguage, resolveInitialLanguage } from "@/i18n";

function applyRTL(language: string) {
    const isRTL = RTL_LANGUAGES.has(language);
    if (I18nManager.isRTL !== isRTL) {
        I18nManager.forceRTL(isRTL);
    }
}

interface SettingsState {
    language: string;
    theme: "dark" | "light";
    notificationsEnabled: boolean;
    setLanguage: (lang: string) => void;
    setTheme: (theme: "dark" | "light") => void;
    setNotificationsEnabled: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // First launch: follow the device language when we ship it,
            // English otherwise — matches what i18n itself booted with
            // (i18n/index.ts lng). A hardcoded "en" here would get persisted
            // by the first unrelated settings write and force English on
            // every later launch for non-English devices.
            language: resolveInitialLanguage(),
            theme: "dark",
            notificationsEnabled: true,
            setLanguage: (language) => {
                set({ language });
                try { i18n.changeLanguage(language); } catch { /* ignore */ }
                applyRTL(language);
            },
            setTheme: (theme) => set({ theme }),
            setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
        }),
        {
            name: "settings-store",
            storage: createJSONStorage(() => AsyncStorage),
            version: 1,
            onRehydrateStorage: () => (state) => {
                // Guard against a stale/corrupt persisted code (e.g. a locale
                // we later drop): fall back to the device-or-English default
                // instead of feeding i18n an unknown language.
                const persisted = state?.language;
                const language =
                    persisted && isSupportedLanguage(persisted)
                        ? persisted
                        : resolveInitialLanguage();
                try { i18n.changeLanguage(language); } catch { /* ignore */ }
                applyRTL(language);
            },
        }
    )
);
