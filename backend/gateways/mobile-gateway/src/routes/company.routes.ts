import { Router } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { config } from '../config';
import { authMiddleware, requireManager } from '../middleware/auth.middleware';

/**
 * Company routes.
 *
 * Mobile endpoint         →  Downstream
 * GET    /companies       →  GET    /companies
 * GET    /companies/:id   →  GET    /companies/:id
 * POST   /companies       →  POST   /companies  (MANAGER only)
 * PUT    /companies/:id   →  PUT    /companies/:id  (MANAGER only)
 * DELETE /companies/:id   →  DELETE /companies/:id  (MANAGER only)
 */
export function createCompanyRouter(): Router {
  const router = Router();

  const proxy = createProxyMiddleware({
    target: config.services.company,
    changeOrigin: true,
    // Re-prepend the `/companies` mount path Express strips before this router.
    pathRewrite: (path) => `/companies${path === '/' ? '' : path}`,
    on: { proxyReq: fixRequestBody },
  });

  router.use(authMiddleware);

  router.get('/',       proxy);
  router.get('/:id',    proxy);

  router.post('/',      requireManager, proxy);
  router.put('/:id',    requireManager, proxy);
  router.delete('/:id', requireManager, proxy);

  return router;
}
