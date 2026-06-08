import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ReportingState {
  reportedIds: string[];
  reportItem: (id: string) => void;
  isReported: (id: string) => boolean;
  load: () => Promise<void>;
}

export const useReportingStore = create<ReportingState>()(
  persist(
    (set, get) => ({
      reportedIds: [],
      reportItem: (id: string) => {
        if (!get().reportedIds.includes(id)) {
          set({ reportedIds: [...get().reportedIds, id] });
        }
      },
      isReported: (id: string) => get().reportedIds.includes(id),
      load: async () => {
        // Hydration happens automatically with persist, but we can add manual logic if needed
      },
    }),
    {
      name: "pixent-reporting-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
