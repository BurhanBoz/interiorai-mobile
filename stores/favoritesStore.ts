import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendOutputSignal } from "@/services/jobs";

interface FavoritesState {
  ids: string[];
  toggle: (outputId: string) => void;
  isFavorite: (outputId: string) => boolean;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (outputId) => {
        const current = get().ids;
        const adding = !current.includes(outputId);
        set({
          ids: adding
            ? [outputId, ...current]
            : current.filter((id) => id !== outputId),
        });
        // C1: only the ADD is a quality signal — "this was ever worth
        // keeping". Unfavorite stays local; the backend record is a fact
        // about the render's quality, not the user's current shortlist.
        if (adding) sendOutputSignal(outputId, "FAVORITE");
      },
      isFavorite: (outputId) => get().ids.includes(outputId),
      clear: () => set({ ids: [] }),
    }),
    {
      name: "favorites-store",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
