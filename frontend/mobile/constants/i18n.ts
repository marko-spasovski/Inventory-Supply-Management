// `sl` is a LIVE proxy that resolves each property access against the
// currently-active locale's strings table (from @erp/i18n). The historical
// name `sl` is preserved so existing call sites continue to work without a
// refactor — they become automatically locale-reactive once the root layout
// subscribes to the locale store (forcing a re-render on change).
//
// New code should prefer the `useStrings()` hook from '@/lib/i18n/locale'
// for clarity. The proxy is a back-compat shim, not the canonical API.
import { type Strings, getStrings } from '@erp/i18n';
import { useLocaleStore } from '@/lib/i18n/locale';

function currentTable(): Strings {
  return getStrings(useLocaleStore.getState().locale);
}

function pathProxy(path: readonly string[]): unknown {
  return new Proxy({} as object, {
    get(_target, prop) {
      if (typeof prop === 'symbol') return undefined;
      let node: unknown = currentTable();
      for (const segment of path) {
        if (node && typeof node === 'object') {
          node = (node as Record<string, unknown>)[segment];
        }
      }
      if (!node || typeof node !== 'object') return undefined;
      const value = (node as Record<string, unknown>)[prop];
      if (value && typeof value === 'object') {
        return pathProxy([...path, prop]);
      }
      return value;
    },
    has(_target, prop) {
      if (typeof prop === 'symbol') return false;
      let node: unknown = currentTable();
      for (const segment of path) {
        if (node && typeof node === 'object') {
          node = (node as Record<string, unknown>)[segment];
        }
      }
      return !!node && typeof node === 'object' && prop in (node as object);
    },
  });
}

export const sl: Strings = pathProxy([]) as Strings;
