import { summarizeWithAzure } from '../azure/openai-client';
import type { AnalysisResult } from '../analytics/analyze';

const sampleAnalysis: AnalysisResult = {
  totals: { productCount: 1, warehouseCount: 1, totalStock: 5, lowStockCount: 1 },
  alerts: [{
    productId: 'p1', productName: 'Apple', warehouseId: 'w1', currentQty: 1, minQty: 10,
  }],
  reorderSuggestions: [],
};

describe('summarizeWithAzure', () => {
  it('returns null when Azure not configured (no env vars)', async () => {
    // Without AZURE_OPENAI_* env vars, azureConfigured() returns false
    // and the function short-circuits without making a network call.
    const result = await summarizeWithAzure(sampleAnalysis);
    expect(result).toBeNull();
  });
});
