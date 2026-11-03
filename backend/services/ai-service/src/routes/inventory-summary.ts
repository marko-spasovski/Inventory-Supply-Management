import { Router, type Request, type Response } from 'express';
import { fetchSnapshot, forwardableHeaders } from '../data-fetcher';
import { analyze, templateSummary } from '../analytics/analyze';
import { summarizeWithAzure } from '../azure/openai-client';
import type { AiInventorySummary } from '../types';

export function createInventorySummaryRouter(): Router {
  const router = Router();

  router.get('/inventory-summary', async (req: Request, res: Response) => {
    try {
      const snapshot = await fetchSnapshot(forwardableHeaders(req));
      const analysis = analyze(snapshot);

      const azureText = await summarizeWithAzure(analysis);
      const summary   = azureText ?? templateSummary(analysis);

      const payload: AiInventorySummary = {
        generatedAt:        new Date().toISOString(),
        summary,
        source:             azureText ? 'azure' : 'template',
        totals:             analysis.totals,
        alerts:             analysis.alerts,
        reorderSuggestions: analysis.reorderSuggestions,
      };
      res.json(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[AI] inventory-summary failed:', message);
      res.status(502).json({ error: 'Bad Gateway', message: `Aggregation failed: ${message}` });
    }
  });

  return router;
}
