import { analyze, templateSummary } from '../analytics/analyze';
import type { FetchedSnapshot } from '../data-fetcher';

function buildSnapshot(overrides: Partial<FetchedSnapshot> = {}): FetchedSnapshot {
  return {
    inventory: [],
    products: [],
    warehouses: [],
    ...overrides,
  };
}

describe('analyze', () => {
  it('returns zero totals for empty snapshot', () => {
    const r = analyze(buildSnapshot());
    expect(r.totals.totalStock).toBe(0);
    expect(r.totals.productCount).toBe(0);
    expect(r.totals.warehouseCount).toBe(0);
    expect(r.totals.lowStockCount).toBe(0);
    expect(r.alerts).toEqual([]);
    expect(r.reorderSuggestions).toEqual([]);
  });

  it('sums totalStock and counts products/warehouses', () => {
    const r = analyze(buildSnapshot({
      inventory: [
        { id: 'i1', productId: 'p1', warehouseId: 'w1', quantity: 30 },
        { id: 'i2', productId: 'p2', warehouseId: 'w1', quantity: 70 },
      ],
      products: [
        { id: 'p1', name: 'Apple', sku: 'A' },
        { id: 'p2', name: 'Banana', sku: 'B' },
      ],
      warehouses: [{ id: 'w1', name: 'Main', totalCapacity: 1000, usedCapacity: 0 }],
    }));

    expect(r.totals.totalStock).toBe(100);
    expect(r.totals.productCount).toBe(2);
    expect(r.totals.warehouseCount).toBe(1);
    expect(r.totals.lowStockCount).toBe(0);
  });

  it('flags items below default minQuantity (10) as low stock', () => {
    const r = analyze(buildSnapshot({
      inventory: [{ id: 'i1', productId: 'p1', warehouseId: 'w1', quantity: 5 }],
      products: [{ id: 'p1', name: 'Apple', sku: 'A' }],
      warehouses: [{ id: 'w1', name: 'Main', totalCapacity: 1000, usedCapacity: 0 }],
    }));

    expect(r.totals.lowStockCount).toBe(1);
    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0]).toMatchObject({
      productId: 'p1',
      productName: 'Apple',
      currentQty: 5,
      minQty: 10,
    });
  });

  it('respects explicit minQuantity threshold', () => {
    const r = analyze(buildSnapshot({
      inventory: [
        { id: 'i1', productId: 'p1', warehouseId: 'w1', quantity: 15, minQuantity: 20 },
        { id: 'i2', productId: 'p2', warehouseId: 'w1', quantity: 15, minQuantity: 5 },
      ],
    }));

    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0]?.productId).toBe('p1');
  });

  it('uses maxQuantity as reorder target when provided', () => {
    const r = analyze(buildSnapshot({
      inventory: [
        { id: 'i1', productId: 'p1', warehouseId: 'w1', quantity: 5, minQuantity: 10, maxQuantity: 50 },
      ],
    }));

    expect(r.reorderSuggestions[0]?.suggestedQty).toBe(45); // 50 - 5
  });

  it('falls back to 2x min target when no maxQuantity', () => {
    const r = analyze(buildSnapshot({
      inventory: [
        { id: 'i1', productId: 'p1', warehouseId: 'w1', quantity: 5, minQuantity: 10 },
      ],
    }));

    expect(r.reorderSuggestions[0]?.suggestedQty).toBe(15); // 20 - 5
  });

  it('ensures suggestedQty is at least minQty', () => {
    const r = analyze(buildSnapshot({
      inventory: [
        // current=9, max=10 -> target-current=1, but min=10 so suggested=10
        { id: 'i1', productId: 'p1', warehouseId: 'w1', quantity: 9, minQuantity: 10, maxQuantity: 10 },
      ],
    }));
    expect(r.reorderSuggestions[0]?.suggestedQty).toBe(10);
  });

  it('does not flag items at or above min', () => {
    const r = analyze(buildSnapshot({
      inventory: [{ id: 'i1', productId: 'p1', warehouseId: 'w1', quantity: 10, minQuantity: 10 }],
    }));
    expect(r.alerts).toHaveLength(0);
  });

  it('uses short id fallback when product name unknown', () => {
    const r = analyze(buildSnapshot({
      inventory: [{ id: 'i1', productId: 'unknown-product-id', warehouseId: 'w1', quantity: 0 }],
    }));
    expect(r.alerts[0]?.productName).toBe('unknown-');
  });
});

describe('templateSummary', () => {
  it('returns empty-warehouse message when nothing stocked', () => {
    const r = analyze({ inventory: [], products: [], warehouses: [] });
    expect(templateSummary(r)).toMatch(/ni zalog/);
  });

  it('reports total stock and warehouse count', () => {
    const r = analyze({
      inventory: [{ id: 'i1', productId: 'p1', warehouseId: 'w1', quantity: 50 }],
      products: [{ id: 'p1', name: 'X', sku: 'X' }],
      warehouses: [{ id: 'w1', name: 'Main', totalCapacity: 100, usedCapacity: 0 }],
    });
    expect(templateSummary(r)).toMatch(/50 kosov/);
    expect(templateSummary(r)).toMatch(/Vse zaloge so nad mejnimi/);
  });

  it('mentions critical items when below min', () => {
    const r = analyze({
      inventory: [{ id: 'i1', productId: 'p1', warehouseId: 'w1', quantity: 1, minQuantity: 10 }],
      products: [{ id: 'p1', name: 'Critical', sku: 'C' }],
      warehouses: [{ id: 'w1', name: 'Main', totalCapacity: 100, usedCapacity: 0 }],
    });
    const text = templateSummary(r);
    expect(text).toMatch(/Nizka zaloga/);
    expect(text).toMatch(/Critical/);
  });

  it('lists at most 3 top alerts', () => {
    const r = analyze({
      inventory: [
        { id: '1', productId: 'p1', warehouseId: 'w1', quantity: 1 },
        { id: '2', productId: 'p2', warehouseId: 'w1', quantity: 1 },
        { id: '3', productId: 'p3', warehouseId: 'w1', quantity: 1 },
        { id: '4', productId: 'p4', warehouseId: 'w1', quantity: 1 },
        { id: '5', productId: 'p5', warehouseId: 'w1', quantity: 1 },
      ],
      products: [],
      warehouses: [],
    });
    const text = templateSummary(r);
    // Should mention "5 pozicij" overall but only 3 in top list
    expect(text).toMatch(/5 pozicij/);
  });
});
