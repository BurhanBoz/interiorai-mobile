import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from "react-native";
import i18n, { RTL_LANGUAGES } from "@/i18n";

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
            language: "en",
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
                if (state?.language) {
                    try { i18n.changeLanguage(state.language); } catch { /* ignore */ }
                    applyRTL(state.language);
                }
            },
        }
    )
);
