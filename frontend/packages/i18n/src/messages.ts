// Bilingual user-facing string dictionary. PURE DATA — no React, no DOM, no
// runtime framework code. Each app wires its own i18n runtime to read from
// `messages` here. The shape is locked by `Strings` (the SL table is the
// canonical structure; the EN table must satisfy `Strings`).

import sl from './sl';
import en from './en';

export type Strings = typeof sl;
export type Locale = 'sl' | 'en';
export const LOCALES: readonly Locale[] = ['sl', 'en'];
export const DEFAULT_LOCALE: Locale = 'sl';

const TABLES: Record<Locale, Strings> = { sl, en };

// Returns the strings table for an explicit locale. Falls back to default
// if the locale isn't shipped.
export function getStrings(locale: Locale = DEFAULT_LOCALE): Strings {
  return TABLES[locale] ?? TABLES[DEFAULT_LOCALE];
}

// User-facing display name for a locale (for use inside language togglers).
export const LOCALE_LABEL: Record<Locale, string> = {
  sl: 'Slovenščina',
  en: 'English',
};
