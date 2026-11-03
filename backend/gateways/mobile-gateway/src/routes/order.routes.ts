import { Router, Request, Response } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { config } from '../config';
import { authMiddleware } from '../middleware/auth.middleware';

/**
 * Order routes — mobile uses resource-oriented status update (REST-ful).
 *
 * Mobile endpoint              →  Downstream
 * GET  /orders                 →  GET  /orders
 * POST /orders                 →  POST /orders
 * PUT  /orders/:id/status      →  PUT  /orders/status  (body: { orderId, status })
 * POST /orders/upload-document →  POST /orders/upload-document
 *
 * Key difference from web gateway:
 *   Web:    PUT /orders/status    { orderId, status }
 *   Mobile: PUT /orders/:id/status { status }  (orderId comes from URL param)
 */
export function createOrderRouter(): Router {
  const router = Router();

  router.use(authMiddleware);

  // List & create — direct proxy.
  // Express strips the `/orders` mount path; re-prepend it on forward.
  const listCreateProxy = createProxyMiddleware({
    target: config.services.order,
    changeOrigin: true,
    pathRewrite: (path) => `/orders${path === '/' ? '' : path}`,
    on: { proxyReq: fixRequestBody },
  });

  router.get('/',     listCreateProxy);
  router.get('/:id',  listCreateProxy);  // single order — order-service GET /orders/{id}
  router.post('/',    listCreateProxy);

  // Mobile-style status update: PUT /orders/:id/status { status: number }
  // Rewrites to downstream: PUT /orders/status { orderId: id, status }
  router.put('/:id/status', async (req: Request, res: Response) => {
    const orderId = req.params['id'];
    const { status } = req.body as { status: number };

    if (status === undefined || status === null) {
      res.status(400).json({ error: 'Bad Request', message: '`status` field is required in the request body' });
      return;
    }

    try {
      const response = await fetch(`${config.services.order}/orders/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id':    req.headers['x-user-id'] as string ?? '',
          'x-user-email': req.headers['x-user-email'] as string ?? '',
          'x-user-role':  req.headers['x-user-role'] as string ?? '',
        },
        body: JSON.stringify({ orderId, status }),
      });

      const data: unknown = await response.json().catch(() => null);
      res.status(response.status).json(data);
    } catch (err) {
      res.status(502).json({ error: 'Bad Gateway', message: 'Failed to reach order service' });
    }
  });

  // Document upload — multipart proxy. Same prefix-restore as listCreateProxy.
  // Multipart body streams as-is, but the fix is harmless if the content-type
  // is multipart (fixRequestBody only re-streams for JSON / urlencoded).
  const uploadProxy = createProxyMiddleware({
    target: config.services.order,
    changeOrigin: true,
    pathRewrite: (path) => `/orders${path}`,
    on: { proxyReq: fixRequestBody },
  });

  router.post('/upload-document', uploadProxy);

  return router;
}
