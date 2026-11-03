// AI analysis client.
// Wired to ai-service (Gap 6 closed) — see services/ai-service/CHANGELOG.md.
import { axiosClient } from '@/lib/http/client';

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

export interface AiTotals {
  productCount:   number;
  warehouseCount: number;
  totalStock:     number;
  lowStockCount:  number;
}

export interface AiInventorySummary {
  generatedAt:        string;
  summary:            string;
  source:             'azure' | 'template'; // tells the UI whether Azure produced the text
  totals:             AiTotals;
  alerts:             AiAlert[];
  reorderSuggestions: AiReorderSuggestion[];
}

export const aiClient = {
  getInventorySummary: async (): Promise<AiInventorySummary> => {
    const res = await axiosClient.get<AiInventorySummary>('/ai/inventory-summary');
    return res.data;
  },

  requestReorderSuggestion: async (productId: string, warehouseId: string): Promise<AiReorderSuggestion> => {
    const res = await axiosClient.post<AiReorderSuggestion>('/ai/reorder-suggestion', { productId, warehouseId });
    return res.data;
  },
};
