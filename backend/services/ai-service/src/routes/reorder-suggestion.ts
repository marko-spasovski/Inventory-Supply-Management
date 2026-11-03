import { Router, type Request, type Response } from 'express';
import { fetchSnapshot, forwardableHeaders } from '../data-fetcher';
import { analyze } from '../analytics/analyze';

// POST /ai/reorder-suggestion
// Body: { productId: string, warehouseId: string }
// Returns the matching reorder suggestion from the latest snapshot, or 404 if
// the item isn't currently flagged as low-stock.
export function createReorderRouter(): Router {
  const router = Router();

  router.post('/reorder-suggestion', async (req: Request, res: Response) => {
    const productId   = (req.body?.productId   ?? '').toString();
    const warehouseId = (req.body?.warehouseId ?? '').toString();
    if (!productId || !warehouseId) {
      res.status(400).json({ error: 'Bad Request', message: '`productId` and `warehouseId` are required.' });
      return;
    }

    try {
      const snapshot = await fetchSnapshot(forwardableHeaders(req));
      const analysis = analyze(snapshot);
      const match = analysis.reorderSuggestions.find(
        (s) => s.productId === productId && s.warehouseId === warehouseId,
      );
      if (!match) {
        res.status(404).json({ error: 'Not Found', message: 'No reorder needed for that item.' });
        return;
      }
      res.json(match);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(502).json({ error: 'Bad Gateway', message });
    }
  });

  return router;
}
