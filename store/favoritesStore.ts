import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { MediaItem, FavoriteItem } from "@/types/media";

const STORAGE_KEY = "pixent_favorites";

interface FavoritesState {
  favorites: FavoriteItem[];
  loaded: boolean;
  load: () => Promise<void>;
  addFavorite: (item: MediaItem) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  clearAll: () => Promise<void>;
}

async function persist(favorites: FavoriteItem[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const favorites: FavoriteItem[] = raw ? JSON.parse(raw) : [];
      set({ favorites, loaded: true });
    } catch {
      set({ favorites: [], loaded: true });
    }
  },

  addFavorite: async (item: MediaItem) => {
    const existing = get().favorites;
    if (existing.find((f) => f.id === item.id)) return;
    const newFav: FavoriteItem = { id: item.id, type: item.type, savedAt: Date.now(), data: item };
    const updated = [newFav, ...existing];
    set({ favorites: updated });
    await persist(updated);
  },

  removeFavorite: async (id: string) => {
    const updated = get().favorites.filter((f) => f.id !== id);
    set({ favorites: updated });
    await persist(updated);
  },

  isFavorite: (id: string) => {
    return get().favorites.some((f) => f.id === id);
  },

  clearAll: async () => {
    set({ favorites: [] });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
}));
