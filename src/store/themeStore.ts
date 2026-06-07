import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

const applyDark = (dark: boolean) =>
  document.documentElement.classList.toggle('dark', dark);

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      dark: false,
      toggle: () => {
        const next = !get().dark;
        set({ dark: next });
        applyDark(next);
      },
    }),
    {
      name: 'preproute-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyDark(state.dark);
      },
    }
  )
);
