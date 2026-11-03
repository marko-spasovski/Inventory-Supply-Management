import { Router } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { config } from '../config';

/**
 * Auth routes — no JWT required (login / register / refresh).
 *
 * Mobile endpoint  →  Downstream
 * POST /auth/login    →  POST /auth/login
 * POST /auth/register →  POST /auth/register
 * POST /auth/logout   →  POST /auth/logout
 * POST /auth/refresh  →  POST /auth/refresh
 *
 * Mobile clients receive the JWT in the response body (not in an HttpOnly cookie)
 * so they can store it and include it in subsequent Authorization headers.
 */
export function createAuthRouter(): Router {
  const router = Router();

  const proxy = createProxyMiddleware({
    target: config.services.auth,
    changeOrigin: true,
    // Express strips the `/auth` mount path before passing the request to this
    // router, so req.url at the proxy is `/login` etc. The downstream Spring
    // controller is mapped at `/auth/...`, so we re-prepend the prefix here.
    pathRewrite: (path) => `/auth${path}`,
    // The downstream auth-service returns an HttpOnly cookie + JSON body.
    // For mobile we want only the JSON body — strip the Set-Cookie header
    // so the mobile client must manage the token itself.
    on: {
      // Re-stream the JSON body that express.json() already consumed upstream,
      // otherwise POST/PUT requests forward with an empty body and time out.
      proxyReq: fixRequestBody,
      proxyRes(proxyRes) {
        delete proxyRes.headers['set-cookie'];
      },
    },
  });

  router.post('/login',    proxy);
  router.post('/register', proxy);
  router.post('/logout',   proxy);
  router.post('/refresh',  proxy);

  return router;
}
