# mobile-gateway — Changelog

## 2026-05-17 (c) — AI routes, WS proxy, driver self-view, push tokens

Third pass — once the route plumbing and JWT plumbing were stable the
remaining missing capabilities became one-route additions.

### New routes

| Method | Path | Notes |
|---|---|---|
| `GET`  | `/ai/inventory-summary`        | MANAGER/ADMIN — proxies to ai-service |
| `POST` | `/ai/reorder-suggestion`       | MANAGER/ADMIN — proxies to ai-service |
| `GET`  | `/drivers/me`                  | DRIVER (or any authed user) — resolves driver record by JWT email; *must precede* `/:id` in router order |
| `POST` | `/notifications/device-tokens` | mobile push-token registration |
| `DELETE` | `/notifications/device-tokens/:token` | logout cleanup |
| **WS** | `/ws`                          | upgrades proxied to notification-service `:9091` — same host:port as REST now |

`src/routes/ai.routes.ts` is a new file. `src/routes/fleet.routes.ts` and
`src/routes/notification.routes.ts` got the new lines inline.

### WS proxy infrastructure (`src/index.ts`)

Switched from `app.listen(...)` to `http.createServer(app)` so the same
listening socket can serve REST and WS upgrades. A single
`createProxyMiddleware({ target: ws://localhost:9091, ws: true })` instance
is mounted at `/ws`, and an `server.on('upgrade', …)` handler forwards only
upgrades whose path starts with `/ws` (others get destroyed).

### Config

`src/config.ts` — added two entries:

```
services.ai             = http://localhost:8089   (env AI_SERVICE_URL)
services.notificationWs = ws://localhost:9091     (env NOTIFICATION_WS_URL)
```

### Files changed (this pass)

```
mobile-gateway/src/index.ts                      (WS upgrade + router mounts)
mobile-gateway/src/config.ts                     (ai + notificationWs entries)
mobile-gateway/src/routes/ai.routes.ts           (new)
mobile-gateway/src/routes/fleet.routes.ts        (+ /drivers/me)
mobile-gateway/src/routes/notification.routes.ts (+ device-tokens)
```

To apply: `docker compose -f compose.yaml up -d --build mobile-gateway`

---



## 2026-05-17 (b) — Backend gap closures: new routes + role + CORS

After the routing/body/auth fixes from the earlier pass, five backend gaps
documented in `pocket-logistics-pro-expo/docs/ARCHITECTURE_GAPS.md` were
closed. The gateway picks up the corresponding new downstream endpoints and
adds an ADMIN-aware permission helper.

### New routes proxied

- `GET /products/by-sku?sku=…` — product-service barcode SKU lookup (closes Gap 5).
  Declared *before* `/products/:id` so the literal path matches first.
- `GET /orders/:id` — order-service single-order endpoint (closes Gap 11).
  Forwarded by the existing list/create proxy with the corrected
  `/orders` prefix.

### ADMIN role recognition (`middleware/auth.middleware.ts`)

- `JwtPayload.role` widened to `'MANAGER' | 'WORKER' | 'ADMIN' | 'DRIVER'`
  (closes Gap 2 — auth-service now issues all four).
- `requireManager` now also accepts `ADMIN`. New `requireAdmin` middleware
  exported for routes that need the higher permission.

### Auth headers exposed to web clients (`index.ts`)

`POST /auth/login` and the new `POST /auth/refresh` return tokens in
`X-Auth-Token` and `X-Refresh-Token` headers. Added to the CORS
`exposedHeaders` list so web-target Expo clients can read them via fetch.

### Files changed (this pass)

```
mobile-gateway/src/index.ts
mobile-gateway/src/middleware/auth.middleware.ts
mobile-gateway/src/routes/product.routes.ts
mobile-gateway/src/routes/order.routes.ts
```

To apply: `docker compose -f compose.yaml up -d --build mobile-gateway`

---



## 2026-05-17 — Gateway routing & body-forwarding fixes

While smoke-testing the mobile app against the live backend, four blocking
defects were found in the gateway proxy layer. Without these, every POST/PUT
through the gateway timed out, every authenticated route returned 401, and
every request that did get through hit the wrong downstream path.

All changes are surgical — no API surface change, no new dependency.

### 1. Path prefix dropped on forward (404 for almost everything)

**Symptom:** `POST /auth/login` → `404 No static resource login.`
The Spring/`.NET` controllers were receiving `/login` instead of `/auth/login`,
`/` instead of `/warehouses`, etc.

**Cause:** When an Express `Router` is mounted via `app.use('/auth', router)`,
Express strips the mount path from `req.url` before the router sees it. The
`createProxyMiddleware` instance then forwards using `req.url` (now `/login`).
The downstream Spring/.NET controllers are mapped at the full path
(`/auth/login`, `/warehouses`, ...) and 404 the truncated URL.

**Fix:** Re-prepend the mount path in each affected router via `pathRewrite`:

```ts
const proxy = createProxyMiddleware({
  target: config.services.auth,
  pathRewrite: (path) => `/auth${path}`,
  ...
});
```

Routers patched:
- `routes/auth.routes.ts` — prepend `/auth`
- `routes/warehouse.routes.ts` — prepend `/warehouses`; also fixed the existing
  `/summary → /total` rewrite which used to never match (it expected
  `^/warehouses/summary` but the path arriving at the proxy was `/summary`)
- `routes/inventory.routes.ts` — was supposed to rewrite `/stock → /inventory`
  but the old regex couldn't match the stripped path; now uses a function that
  emits `/inventory` + suffix directly
- `routes/company.routes.ts` — prepend `/companies`
- `routes/notification.routes.ts` — prepend `/notifications`
- `routes/order.routes.ts` — prepend `/orders` on both the list/create proxy
  and the upload-document proxy

`product.routes.ts` and `fleet.routes.ts` were already correct because they
mount at `/` and declare full paths (`/products`, `/drivers`, ...) inside the
router, so Express never strips anything.

The handler-style `PUT /orders/:id/status` in `order.routes.ts` was unaffected
because it uses a raw `fetch` to a hard-coded path, not the proxy middleware.

### 2. Request body never reached downstream (timeouts on every POST/PUT)

**Symptom:** Every JSON `POST` / `PUT` hung until `408 Request Timeout`.

**Cause:** `app.use(express.json())` runs before the routers, so the
`IncomingMessage` body stream is already consumed by the time the proxy
forwards. The downstream service waits for a body that will never arrive.

**Fix:** Add the `fixRequestBody` helper to each proxy's `proxyReq` hook so it
re-streams the parsed JSON body to the downstream.

```ts
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

createProxyMiddleware({
  target,
  on: { proxyReq: fixRequestBody },
});
```

Applied to every proxy in: auth, warehouse, inventory, company, notification,
order (both list/create and upload), product, fleet.

`auth.routes.ts` already had an `on.proxyRes` hook that strips `Set-Cookie`;
the new `proxyReq` hook coexists alongside it.

### 3. JWT verify mismatch (every authenticated request → 401 "Invalid token")

**Symptom:** Logged-in requests with a valid `Authorization: Bearer <jwt>`
returned `401 "Invalid token"` from the gateway.

**Cause:** Encoding mismatch between issuer and verifier:

- `auth-service` (`JwtService.java:24`) signs with the **raw UTF-8 bytes** of
  the secret string: `Keys.hmacShaKeyFor(secret.getBytes())`.
- `mobile-gateway` (`middleware/auth.middleware.ts`) tried to verify with the
  secret **base64-decoded**: `Buffer.from(config.jwt.secret, 'base64')`.

The secret happens to look like base64 (`ewzqAN…=`), so it decoded to a
shorter byte sequence — completely different signing key.

**Fix:** Match the issuer. Pass the secret string directly to
`jwt.verify(token, config.jwt.secret)`, letting `jsonwebtoken` use the same
UTF-8 bytes the issuer used.

### 4. Auth header stripped before sibling router saw it (401 on /drivers, /vehicles, /notifications, …)

**Symptom:** With a valid token, `GET /products` returned 200, but
`GET /drivers`, `GET /vehicles`, `GET /notifications`, … returned
`401 "Missing Authorization header"`.

**Cause:** Both `productRouter` and `fleetRouter` are mounted at `/` (see
`index.ts` lines 65–66). Express runs every router's middleware in mount order,
not just the one whose route eventually matches. So `productRouter.use(
authMiddleware)` ran first for a request to `/drivers`; the middleware
verified the token, then **deleted `req.headers['authorization']`**. The
request then fell through to `fleetRouter`, whose own `authMiddleware` re-ran
on a request that no longer had an Authorization header — 401.

**Fix:** Leave the Authorization header in place after verifying it. The
downstream services do not read it (they trust the forwarded `X-User-*`
headers), so it is harmless. Removed the `delete req.headers['authorization']`
line in `middleware/auth.middleware.ts`.

---

## Files changed

```
mobile-gateway/src/routes/auth.routes.ts
mobile-gateway/src/routes/warehouse.routes.ts
mobile-gateway/src/routes/inventory.routes.ts
mobile-gateway/src/routes/company.routes.ts
mobile-gateway/src/routes/notification.routes.ts
mobile-gateway/src/routes/order.routes.ts
mobile-gateway/src/routes/product.routes.ts
mobile-gateway/src/routes/fleet.routes.ts
mobile-gateway/src/middleware/auth.middleware.ts
```

To apply:

```bash
docker compose -f compose.yaml up -d --build mobile-gateway
```

## Verified (after rebuild)

All eleven read endpoints return 200 with a fresh `MANAGER` JWT:

| Endpoint | Status |
|---|---|
| `GET /warehouses`            | 200 `[]` |
| `GET /warehouses/summary`    | 200 `{"totalNumberOfWarehouses":0}` |
| `GET /products`              | 200 `[]` |
| `GET /categories`            | 200 `[]` |
| `GET /stock`                 | 200 `[]` |
| `GET /orders`                | 200 `[]` |
| `GET /companies`             | 200 `[]` |
| `GET /drivers`               | 200 `[]` |
| `GET /vehicles`              | 200 `[]` |
| `GET /notifications`         | 200 `[]` |
| `GET /notifications/unread`  | 200 `[]` |

Auth: `POST /auth/register` → 201, `POST /auth/login` → 200 with `X-Auth-Token`.

## Still failing (mobile-side DTO mismatches, not gateway)

Tracked separately. Examples surfaced during smoke test:

- `POST /companies` requires `{name, email, phone, contact}` — mobile sent only `{name}`.
- `POST /warehouses` requires enum `country ∈ {MACEDONIA, SLOVENIA}` and
  enum `city ∈ {MARIBOR, LJUBLJANA, KUMANOVO, SKOPJE}` — mobile sent free
  strings.
- `POST /vehicles` accepts only `{registrationPlate}` — mobile sends extra
  `type` and `companyId` fields that don't exist on the backend.

These are mobile-app fixes (update `types/api.ts` and the relevant form
components). The gateway already forwards the body correctly.
