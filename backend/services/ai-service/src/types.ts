// Shared DTOs — both for downstream service responses and the public API.

// ── Downstream entity shapes ──────────────────────────────────────────────
export interface InventoryItem {
  id:           string;
  productId:    string;
  warehouseId:  string;
  quantity:     number;
  // Optional thresholds (Gap 13). The aggregator falls back to a default
  // when they're missing so the UI still shows a sensible "low stock" badge.
  minQuantity?: number;
  maxQuantity?: number;
}

export interface ProductInfo {
  id:   string;
  name: string;
  sku:  string;
}

export interface WarehouseInfo {
  id:            string;
  name:          string;
  totalCapacity: number;
  usedCapacity:  number;
}

// ── Public API shapes (mobile/web read these) ─────────────────────────────
export interface AiAlert {
  productId:   string;
  productName: string;
  warehouseId: string;
  currentQty:  number;
  minQty:      number;
}

export interface AiReorderSuggestion {
  productId:    string;
  productName:  string;
  warehouseId:  string;
  suggestedQty: number;
  reasoning:    string;
}

export interface AiInventorySummary {
  generatedAt:        string;          // ISO8601
  summary:            string;          // natural language (Azure or templated)
  source:             'azure' | 'template';
  totals: {
    productCount:   number;
    warehouseCount: number;
    totalStock:     number;
    lowStockCount:  number;
  };
  alerts:             AiAlert[];
  reorderSuggestions: AiReorderSuggestion[];
}
