import { Router } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { config } from '../config';
import { authMiddleware, requireManager } from '../middleware/auth.middleware';

/**
 * AI analysis routes — proxied to ai-service.
 *
 * Mobile endpoint                →  Downstream (ai-service)
 * GET  /ai/inventory-summary     →  GET  /ai/inventory-summary
 * POST /ai/reorder-suggestion    →  POST /ai/reorder-suggestion
 *
 * AI features are MANAGER (or ADMIN) only — they aggregate cross-warehouse
 * data that workers don't typically see.
 */
export function createAiRouter(): Router {
  const router = Router();

  const proxy = createProxyMiddleware({
    target: config.services.ai,
    changeOrigin: true,
    // Mount path `/ai` is stripped by Express; re-prepend before forwarding.
    pathRewrite: (path) => `/ai${path === '/' ? '' : path}`,
    on: { proxyReq: fixRequestBody },
  });

  router.use(authMiddleware);

  router.get('/inventory-summary',  requireManager, proxy);
  router.post('/reorder-suggestion', requireManager, proxy);

  return router;
}
