import type { QueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api/products';
import type { ProductResponse } from '@erp/api-types';

// Resolves a scanned SKU to a product via the dedicated backend endpoint
// (GET /products/by-sku — added in product-service when ARCHITECTURE_GAPS.md
// Gap 5 was closed).
//
// `queryClient` is no longer required for the lookup itself, but is kept in
// the signature for backwards compatibility with existing call sites.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function resolveScannedCode(
  _queryClient: QueryClient,
  code: string,
): Promise<ProductResponse | null> {
  const normalized = code.trim();
  if (!normalized) return null;
  return productsApi.getBySku(normalized);
}
