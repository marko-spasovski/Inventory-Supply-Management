import { Router } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { config } from '../config';
import { authMiddleware } from '../middleware/auth.middleware';

/**
 * Inventory / Stock routes — mobile uses the name "stock" instead of "inventory".
 *
 * Mobile endpoint            →  Downstream
 * GET  /stock                →  GET  /inventory
 * GET  /stock/:warehouseId   →  GET  /inventory/:warehouseId
 * POST /stock                →  POST /inventory
 * PUT  /stock/thresholds     →  PUT  /inventory/thresholds
 * POST /stock/consume        →  POST /inventory/consume   (multipart/form-data)
 */
export function createInventoryRouter(): Router {
  const router = Router();

  // Express strips the `/stock` mount path; forward as `/inventory` + path
  // so downstream inventory-service sees /inventory, /inventory/:warehouseId, etc.
  const proxy = createProxyMiddleware({
    target: config.services.inventory,
    changeOrigin: true,
    pathRewrite: (path) => `/inventory${path === '/' ? '' : path}`,
    // fixRequestBody re-streams JSON/urlencoded bodies that upstream
    // express.json() consumed. Harmless for multipart (it streams as-is).
    on: { proxyReq: fixRequestBody },
  });

  router.use(authMiddleware);

  // /thresholds must precede /:warehouseId so the static segment wins.
  router.put('/thresholds',   proxy);
  router.post('/consume',     proxy);

  router.get('/',             proxy);
  router.get('/:warehouseId', proxy);
  router.post('/',            proxy);

  return router;
}
