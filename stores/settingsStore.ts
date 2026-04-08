import { create } from "zustand";

interface SettingsState {
    language: string;
    theme: "dark" | "light";
    notificationsEnabled: boolean;
    setLanguage: (lang: string) => void;
    setTheme: (theme: "dark" | "light") => void;
    setNotificationsEnabled: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    language: "en",
    theme: "dark",
    notificationsEnabled: true,
    setLanguage: (language) => set({ language }),
    setTheme: (theme) => set({ theme }),
    setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
}));
