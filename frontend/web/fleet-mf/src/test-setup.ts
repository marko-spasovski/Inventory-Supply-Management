import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// Component tests assert English copy. The app's default locale is Slovenian
// (DEFAULT_LOCALE in @erp/i18n); that default has its own test in the shell.
// Test files that clear localStorage set the locale again after clearing.
beforeEach(() => {
  localStorage.setItem('erp_locale', 'en');
});
