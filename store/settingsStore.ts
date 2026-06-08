import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "pixent_settings";

export type AppLanguage = "en" | "ar";
export type AppTheme = "system" | "dark" | "light";

interface SettingsState {
  theme: AppTheme;
  language: AppLanguage;
  loaded: boolean;
  load: () => Promise<void>;
  setTheme: (theme: AppTheme) => Promise<void>;
  setLanguage: (lang: AppLanguage) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: "system",
  language: "en",
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({ ...data, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setTheme: async (theme: AppTheme) => {
    set({ theme });
    const current = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, language: current.language }));
  },

  setLanguage: async (language: AppLanguage) => {
    set({ language });
    const current = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: current.theme, language }));
  },
}));
