import express from 'express';
import request from 'supertest';
import { createInventorySummaryRouter } from '../routes/inventory-summary';

jest.mock('../data-fetcher', () => ({
  fetchSnapshot: jest.fn(),
  forwardableHeaders: jest.fn(() => ({})),
}));
jest.mock('../azure/openai-client', () => ({
  summarizeWithAzure: jest.fn(),
}));

import { fetchSnapshot } from '../data-fetcher';
import { summarizeWithAzure } from '../azure/openai-client';

function makeApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/ai', createInventorySummaryRouter());
  return app;
}

describe('GET /ai/inventory-summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with templated summary when Azure not used', async () => {
    (fetchSnapshot as jest.Mock).mockResolvedValue({
      inventory: [{ id: 'i1', productId: 'p1', warehouseId: 'w1', quantity: 5 }],
      products: [{ id: 'p1', name: 'Apple', sku: 'A' }],
      warehouses: [{ id: 'w1', name: 'Main', totalCapacity: 100, usedCapacity: 0 }],
    });
    (summarizeWithAzure as jest.Mock).mockResolvedValue(null);

    const res = await request(makeApp()).get('/ai/inventory-summary');

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('template');
    expect(res.body.totals.totalStock).toBe(5);
    expect(res.body.alerts).toHaveLength(1);
  });

  it('uses Azure summary when configured and returns text', async () => {
    (fetchSnapshot as jest.Mock).mockResolvedValue({
      inventory: [], products: [], warehouses: [],
    });
    (summarizeWithAzure as jest.Mock).mockResolvedValue('Azure-generated summary');

    const res = await request(makeApp()).get('/ai/inventory-summary');

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('azure');
    expect(res.body.summary).toBe('Azure-generated summary');
  });

  it('returns 502 on upstream failure', async () => {
    (fetchSnapshot as jest.Mock).mockRejectedValue(new Error('inventory unreachable'));
    // Silence the route's console.error so test output stays clean.
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(makeApp()).get('/ai/inventory-summary');

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Bad Gateway');
    errSpy.mockRestore();
  });
});
