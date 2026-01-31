import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from './theme';
import { lightTheme, darkTheme } from './theme';

export interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (themeName: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    set => ({
      theme: lightTheme,
      toggleTheme: () =>
        set(state => ({
          theme: state.theme.name === 'light' ? darkTheme : lightTheme,
        })),
      setTheme: (themeName: 'light' | 'dark') =>
        set({
          theme: themeName === 'light' ? lightTheme : darkTheme,
        }),
    }),
    {
      name: 'charlotte-theme-storage',
      version: 2,
    }
  )
);
