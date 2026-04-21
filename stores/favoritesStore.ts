import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
        set({
          ids: current.includes(outputId)
            ? current.filter((id) => id !== outputId)
            : [outputId, ...current],
        });
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
