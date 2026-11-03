import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_LOCALE } from '@erp/i18n';
import { getCurrentLocale, setLocale } from '../i18n';

describe('shell locale', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to Slovenian when nothing is stored', () => {
    expect(DEFAULT_LOCALE).toBe('sl');
    expect(getCurrentLocale()).toBe('sl');
  });

  it('uses the stored locale', () => {
    setLocale('en');
    expect(getCurrentLocale()).toBe('en');
  });

  it('ignores an unknown stored value', () => {
    localStorage.setItem('erp_locale', 'de');
    expect(getCurrentLocale()).toBe('sl');
  });
});
