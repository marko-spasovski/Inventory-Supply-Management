// Runtime option arrays for warehouse country/city pickers.
// These are runtime values, so they live in the app (not in the types-only
// @erp/api-types). The matching Country/City types come from @erp/api-types.
import type { Country, City } from '@erp/api-types';

export const COUNTRIES: readonly Country[] = ['MACEDONIA', 'SLOVENIA'];
export const CITIES: readonly City[] = ['MARIBOR', 'LJUBLJANA', 'KUMANOVO', 'SKOPJE'];
