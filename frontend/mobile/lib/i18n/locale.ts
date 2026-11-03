// Locale store + helpers — reads message tables from @erp/i18n.
//
// Components subscribe via `useStrings()` (React hook) or read directly via
// the live `sl` proxy in @/constants/i18n which dynamically resolves to the
// current locale's table. The root `_layout.tsx` subscribes to the store so
// the entire tree re-renders on language change.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type Locale,
  type Strings,
  DEFAULT_LOCALE,
  getStrings,
} from '@erp/i18n';

export type { Locale, Strings };
export { DEFAULT_LOCALE, getStrings };

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale }),
    }),
    {
      name:    'locale-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// React hook — returns the strings table for the active locale and subscribes
// the component to locale changes.
export function useStrings(): Strings {
  const locale = useLocaleStore((s) => s.locale);
  return getStrings(locale);
}

// Standalone helper — for non-React code (axios formatters, queue workers).
export function getActiveStrings(): Strings {
  return getStrings(useLocaleStore.getState().locale);
}
