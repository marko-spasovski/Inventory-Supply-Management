// Per-app i18n runtime for web. Identical content lives in shell + every MF
// (Module Federation can't share React runtime singletons, so each app needs
// its own hook). Source of truth for the strings is @erp/i18n; cross-app
// locale sync uses localStorage + a custom window event.
import { useEffect, useState } from 'react';
import {
  type Locale,
  type Strings,
  DEFAULT_LOCALE,
  getStrings,
} from '@erp/i18n';

const STORAGE_KEY = 'erp_locale';
const EVENT_NAME  = 'erp:locale-changed';

export function getCurrentLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'sl' || v === 'en' ? v : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function setLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: locale }));
  } catch {
    /* noop */
  }
}

export function useStrings(): Strings {
  const [locale, setL] = useState<Locale>(() => getCurrentLocale());
  useEffect(() => {
    const onChange = () => setL(getCurrentLocale());
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return getStrings(locale);
}

export function useLocale(): Locale {
  const [locale, setL] = useState<Locale>(() => getCurrentLocale());
  useEffect(() => {
    const onChange = () => setL(getCurrentLocale());
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return locale;
}
