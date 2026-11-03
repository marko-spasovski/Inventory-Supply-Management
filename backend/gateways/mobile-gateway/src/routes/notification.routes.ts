import { Router } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { config } from '../config';
import { authMiddleware } from '../middleware/auth.middleware';

/**
 * Notification routes.
 *
 * Mobile endpoint                    →  Downstream
 * GET   /notifications               →  GET   /notifications
 * GET   /notifications/unread        →  GET   /notifications/unread
 * PATCH /notifications/read-all      →  PATCH /notifications/read-all
 * PATCH /notifications/:id/read      →  PATCH /notifications/:id/read
 *
 * Note: WebSocket for real-time events is at ws://localhost:9091
 * Mobile clients should connect to it directly (or via a WS proxy if needed).
 */
export function createNotificationRouter(): Router {
  const router = Router();

  const proxy = createProxyMiddleware({
    target: config.services.notification,
    changeOrigin: true,
    // Re-prepend the `/notifications` mount path Express strips before this router.
    pathRewrite: (path) => `/notifications${path === '/' ? '' : path}`,
    on: { proxyReq: fixRequestBody },
  });

  router.use(authMiddleware);

  router.get('/',                  proxy);
  router.get('/unread',            proxy);
  router.patch('/read-all',        proxy);
  router.patch('/:id/read',        proxy);
  // Push-notification scaffold (Gap → mobile #16 partial). Mobile clients POST
  // their Expo push token; DELETE clears one when the user logs out.
  router.post('/device-tokens',    proxy);
  router.delete('/device-tokens/:token', proxy);

  return router;
}
