import { Router } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { config } from '../config';
import { authMiddleware, requireManager } from '../middleware/auth.middleware';

/**
 * Fleet routes — drivers & vehicles.
 *
 * Mobile endpoint         →  Downstream
 * GET    /drivers         →  GET    /drivers
 * GET    /drivers/:id     →  GET    /drivers/:id
 * POST   /drivers         →  POST   /drivers  (MANAGER only)
 * PUT    /drivers/:id     →  PUT    /drivers/:id  (MANAGER only)
 * DELETE /drivers/:id     →  DELETE /drivers/:id  (MANAGER only)
 *
 * GET    /vehicles        →  GET    /vehicles
 * GET    /vehicles/:id    →  GET    /vehicles/:id
 * POST   /vehicles        →  POST   /vehicles  (MANAGER only)
 * PUT    /vehicles/:id    →  PUT    /vehicles/:id  (MANAGER only)
 * DELETE /vehicles/:id    →  DELETE /vehicles/:id  (MANAGER only)
 */
export function createFleetRouter(): Router {
  const router = Router();

  const proxy = createProxyMiddleware({
    target: config.services.fleet,
    changeOrigin: true,
    // Re-stream body consumed by express.json() upstream.
    on: { proxyReq: fixRequestBody },
  });

  router.use(authMiddleware);

  // Drivers
  router.get('/drivers',            proxy);
  router.get('/drivers/me',         proxy);  // driver self-view — must precede /:id
  router.get('/drivers/:id',        proxy);
  router.post('/drivers',           requireManager, proxy);
  router.put('/drivers/:id',        requireManager, proxy);
  router.delete('/drivers/:id',     requireManager, proxy);

  // Vehicles
  router.get('/vehicles',           proxy);
  router.get('/vehicles/:id',       proxy);
  router.post('/vehicles',          requireManager, proxy);
  router.put('/vehicles/:id',       requireManager, proxy);
  router.delete('/vehicles/:id',    requireManager, proxy);

  return router;
}
