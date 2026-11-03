import type { FetchedSnapshot } from '../data-fetcher';
import type { AiAlert, AiInventorySummary, AiReorderSuggestion } from '../types';

// Default threshold when an item doesn't carry an explicit minQuantity.
const DEFAULT_MIN_QTY = 10;
// Default reorder target multiplier of min — bringing stock back to 2× min.
const REORDER_MULTIPLIER = 2;

interface NameLookups {
  productName:   (id: string) => string;
  warehouseName: (id: string) => string;
}

export interface AnalysisResult {
  totals: AiInventorySummary['totals'];
  alerts:             AiAlert[];
  reorderSuggestions: AiReorderSuggestion[];
}

export function analyze(snapshot: FetchedSnapshot): AnalysisResult {
  const lookups: NameLookups = {
    productName:   (id) => snapshot.products.find((p) => p.id === id)?.name ?? id.slice(0, 8),
    warehouseName: (id) => snapshot.warehouses.find((w) => w.id === id)?.name ?? id.slice(0, 8),
  };

  const alerts:             AiAlert[]             = [];
  const reorderSuggestions: AiReorderSuggestion[] = [];

  let totalStock = 0;

  for (const item of snapshot.inventory) {
    totalStock += item.quantity;
    const minQty = item.minQuantity ?? DEFAULT_MIN_QTY;
    if (item.quantity < minQty) {
      const productName = lookups.productName(item.productId);
      alerts.push({
        productId:   item.productId,
        productName,
        warehouseId: item.warehouseId,
        currentQty:  item.quantity,
        minQty,
      });
      const target = item.maxQuantity ?? minQty * REORDER_MULTIPLIER;
      const suggestedQty = Math.max(target - item.quantity, minQty);
      reorderSuggestions.push({
        productId:   item.productId,
        productName,
        warehouseId: item.warehouseId,
        suggestedQty,
        reasoning: `Trenutna zaloga ${item.quantity} je pod minimumom ${minQty}. ` +
                   `Predlog dopolnitve na ${target} kosov (skladišče ${lookups.warehouseName(item.warehouseId)}).`,
      });
    }
  }

  return {
    totals: {
      productCount:   snapshot.products.length,
      warehouseCount: snapshot.warehouses.length,
      totalStock,
      lowStockCount:  alerts.length,
    },
    alerts,
    reorderSuggestions,
  };
}

// Deterministic Slovenian narrative used when Azure isn't configured (or
// fails). Kept terse so the mobile card stays readable.
export function templateSummary(analysis: AnalysisResult): string {
  const { totals, alerts } = analysis;
  if (totals.totalStock === 0 && totals.productCount === 0) {
    return 'V skladiščih trenutno ni zalog.';
  }
  const parts: string[] = [];
  parts.push(`Skupaj ${totals.totalStock} kosov v ${totals.warehouseCount} skladišču(-ih), ${totals.productCount} produktov.`);
  if (alerts.length === 0) {
    parts.push('Vse zaloge so nad mejnimi vrednostmi.');
  } else {
    const top = alerts.slice(0, 3).map((a) => `${a.productName} (${a.currentQty}/${a.minQty})`).join(', ');
    parts.push(`Nizka zaloga: ${alerts.length} pozicij. Najnujnejše: ${top}.`);
  }
  return parts.join(' ');
}
