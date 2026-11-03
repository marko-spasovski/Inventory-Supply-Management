import express from 'express';
import request from 'supertest';
import { createReorderRouter } from '../routes/reorder-suggestion';

jest.mock('../data-fetcher', () => ({
  fetchSnapshot: jest.fn(),
  forwardableHeaders: jest.fn(() => ({})),
}));

import { fetchSnapshot } from '../data-fetcher';

function makeApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/ai', createReorderRouter());
  return app;
}

describe('POST /ai/reorder-suggestion', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns 400 when productId missing', async () => {
    const res = await request(makeApp())
      .post('/ai/reorder-suggestion')
      .send({ warehouseId: 'w1' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when warehouseId missing', async () => {
    const res = await request(makeApp())
      .post('/ai/reorder-suggestion')
      .send({ productId: 'p1' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when item not flagged for reorder', async () => {
    (fetchSnapshot as jest.Mock).mockResolvedValue({
      inventory: [{ id: 'i1', productId: 'p1', warehouseId: 'w1', quantity: 100 }],
      products: [], warehouses: [],
    });

    const res = await request(makeApp())
      .post('/ai/reorder-suggestion')
      .send({ productId: 'p1', warehouseId: 'w1' });

    expect(res.status).toBe(404);
  });

  it('returns matching suggestion when item is low', async () => {
    (fetchSnapshot as jest.Mock).mockResolvedValue({
      inventory: [{ id: 'i1', productId: 'p1', warehouseId: 'w1', quantity: 1, minQuantity: 10 }],
      products: [{ id: 'p1', name: 'Apple', sku: 'A' }],
      warehouses: [{ id: 'w1', name: 'Main', totalCapacity: 100, usedCapacity: 0 }],
    });

    const res = await request(makeApp())
      .post('/ai/reorder-suggestion')
      .send({ productId: 'p1', warehouseId: 'w1' });

    expect(res.status).toBe(200);
    expect(res.body.productId).toBe('p1');
    expect(res.body.suggestedQty).toBeGreaterThan(0);
  });

  it('returns 502 when upstream fails', async () => {
    (fetchSnapshot as jest.Mock).mockRejectedValue(new Error('boom'));

    const res = await request(makeApp())
      .post('/ai/reorder-suggestion')
      .send({ productId: 'p1', warehouseId: 'w1' });

    expect(res.status).toBe(502);
  });
});
