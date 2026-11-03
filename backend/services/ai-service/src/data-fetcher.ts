import { config } from './config';
import type { InventoryItem, ProductInfo, WarehouseInfo } from './types';

// Forwards the caller's X-User-* headers so downstream services trust the
// gateway-issued context. The AI service itself never holds the user JWT.
async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Upstream ${url} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface FetchedSnapshot {
  inventory:  InventoryItem[];
  products:   ProductInfo[];
  warehouses: WarehouseInfo[];
}

export async function fetchSnapshot(userHeaders: Record<string, string>): Promise<FetchedSnapshot> {
  const [inventory, products, warehouses] = await Promise.all([
    fetchJson<InventoryItem[]> (`${config.services.inventory}/inventory`,   userHeaders),
    fetchJson<ProductInfo[]>   (`${config.services.product}/products`,      userHeaders),
    fetchJson<WarehouseInfo[]> (`${config.services.warehouse}/warehouses`,  userHeaders),
  ]);
  return { inventory, products, warehouses };
}

// Extract the X-User-* headers the mobile-gateway forwards. The AI service
// only needs them to pass through; it doesn't authenticate on its own.
export function forwardableHeaders(req: { headers: Record<string, string | string[] | undefined> }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ['x-user-id', 'x-user-email', 'x-user-role'] as const) {
    const v = req.headers[key];
    if (typeof v === 'string') out[key] = v;
  }
  return out;
}
