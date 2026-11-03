# Architecture Gaps — Pocket Logistics Pro

Each gap describes a mismatch between what the spec declares and what the backend currently provides.

## Status overview

| Gap | Status (2026-05-17) | Where |
|---|---|---|
| 1  Refresh tokens               | ✅ Closed | auth-service `/auth/refresh` + mobile interceptor |
| 2  ADMIN + DRIVER roles         | ✅ Closed | `Role.java` enum + gateway `requireManager`/`requireAdmin` |
| 3  Driver-scoped filtering      | ✅ Closed | order-service `?driverId=` filter + fleet-service `GET /drivers/me` |
| 4  Logout token invalidation    | Open      | needs Redis blocklist or short TTL + refresh (Gap 1 lays groundwork) |
| 5  Barcode SKU lookup           | ✅ Closed | product-service `GET /products/by-sku` |
| 6  AI service                   | ✅ Closed | new `ai-service` (Azure OpenAI wrapper) + gateway `/ai/*` |
| 7  WS proxy via mobile-gateway  | ✅ Closed | gateway `http.createServer` + `upgrade` handler at `/ws` |
| 8  WS JWT validation            | ✅ Closed | notification-service ws-server `verifyClient` |
| 9  Pagination / filtering       | Open      | per-service work |
| 10 Order line items             | Open      | schema migration |
| 11 GET /orders/{id}             | ✅ Closed | order-service `[HttpGet("{id:guid}")]` |
| 12 Idempotency-Key              | Open      | needs Redis dep |
| 13 Inventory min/max            | ✅ Closed | nullable columns + DTO/mapper + AddStockCommand carries them |

See per-service CHANGELOG.md files in the backend repo for the actual diffs
landed for each closed gap.

---

## Gap 1: No JWT Refresh Token Endpoint

**Spec wants:** Persistent session; users should not need to re-login frequently.

**Backend has:** `POST /auth/refresh` is proxied by mobile-gateway, but `AuthController` in auth-service does not implement it — the route returns 404/502. JWT expiry is hardcoded to 24 hours with no refresh mechanism.

**Impact on mobile:** Users must re-login every 24 hours. On 401, the mobile app clears the auth store and redirects to login — no silent token renewal. This is a poor UX for an app intended for field workers.

**Recommendation:** Implement refresh token support in auth-service: issue a long-lived refresh token alongside the access token at login, store the refresh token securely on the mobile side, and implement `POST /auth/refresh` to exchange it for a new access token. Alternatively, extend the access token TTL to 7 days as a short-term workaround.

**Effort estimate:** M (auth-service + mobile interceptor update)

---

## Gap 2: Only 2 of 4 Spec Roles Exist in Backend

**Spec wants:** Four roles — Admin, Manager, Skladiščni delavec (WORKER), Voznik (DRIVER).

**Backend has:** `Role` enum contains only `MANAGER` and `WORKER`. ADMIN and DRIVER are absent. The JWT `role` claim is a single string from this enum.

**Impact on mobile:** Mobile cannot route ADMIN or DRIVER users to the correct experience. If someone registers with `role = "ADMIN"`, the auth-service will likely throw an enum parse exception. The mobile app must treat MANAGER as the highest available role.

**Recommendation:** Add `ADMIN` and `DRIVER` to the `Role` enum in auth-service. Add `ADMIN` as a superset of MANAGER in mobile-gateway's `requireManager` check (or add `requireAdmin`). Add `DRIVER` as a new role type with its own gating logic.

**Effort estimate:** M (auth-service enum + gateway + mobile constants/roles.ts)

---

## Gap 3: No Driver-Scoped Order or Fleet Filtering

**Spec wants:** Driver role sees only their assigned orders and their own fleet record.

**Backend has:** `GET /orders` returns all orders. `GET /drivers` returns all drivers. No `X-User-Id` filtering in any query handler.

**Impact on mobile:** A DRIVER user (when role is implemented) would see all orders and all drivers, not just their own. No backend support for scoped queries.

**Recommendation:** Add `GET /orders?driverId={id}` filter to order-service. Add `GET /drivers/me` to fleet-service returning the driver record where email matches `X-User-Email`. Both require the services to trust the forwarded `X-User-*` headers.

**Effort estimate:** S per service (M total, 2 services)

---

## Gap 4: No JWT Token Invalidation on Logout

**Spec wants:** Secure logout.

**Backend has:** `POST /auth/logout` only clears the HttpOnly cookie on web clients. JWT is stateless and remains valid until expiry. There is no token blocklist or blacklist.

**Impact on mobile:** After logout, the old token is still valid for up to 24 hours if it leaks. Mobile must delete the token from SecureStore, which is sufficient for normal use but not for stolen-device scenarios.

**Recommendation:** Implement a short-lived token blocklist (Redis-backed) in auth-service, or shorten token TTL significantly and rely on refresh tokens (Gap 1 fix) for continuity.

**Effort estimate:** M (requires Redis dependency in auth-service)

---

## Gap 5: No Barcode / SKU Lookup Endpoint

**Spec wants:** Camera-based barcode scanner that identifies a product and adds it to an order or inventory update.

**Backend has:** `Product` entity has a `SKU` field. `ProductController` only exposes `GET /products/{id:guid}` (by UUID) and `GET /products` (list all). No `GET /products/by-sku?sku=X` or `GET /products/by-barcode?code=X` endpoint exists.

**Impact on mobile:** The scanner screen can decode a barcode from the camera, but cannot resolve it to a product without fetching the full product list and doing a client-side lookup by SKU — inefficient for large catalogs. A dedicated endpoint is needed.

**Recommendation:** Add `GET /products/by-sku?sku={sku}` to product-service and expose it in mobile-gateway. Optionally support a `barcode` field on the Product entity if the business uses EAN-13/UPC codes distinct from internal SKUs.

**Effort estimate:** S (one endpoint in product-service + one route in mobile-gateway)

---

## Gap 6: No AI Endpoints

**Spec wants:** AI analysis of inventory — summaries, low-stock alerts with one-tap reorder.

**Backend has:** No AI service, no `/ai/*` routes in gateway or mobile-gateway.

**Impact on mobile:** AI screen must show a "Feature not yet available" placeholder. No wiring is possible this pass.

**Recommendation:** Design a new `ai-service` (Python FastAPI or Node.js) that exposes `GET /ai/inventory-summary` and `POST /ai/reorder-suggestion`. Wire it into mobile-gateway. In mobile-gateway, add role check (`requireManager`).

**Effort estimate:** L (new service + LLM/ML integration + mobile screen wiring)

---

## Gap 7: WebSocket Not Proxied Through Mobile-Gateway

**Spec wants:** Real-time notifications via WebSocket, integrated through the same API entry point.

**Backend has:** WebSocket server runs on notification-service port 9091. Mobile-gateway is plain Express HTTP; it does not upgrade WS connections.

**Impact on mobile:** Mobile must maintain two connection targets — `http://host:8090` for REST and `ws://host:9091` for WebSocket. In production, the second port must be publicly reachable. Firewall/NAT configuration becomes more complex.

**Recommendation (short-term):** Fall back to polling (`GET /notifications` every 30s) when WS is unavailable. Wire WS for development. **For production:** front notification-service port 9091 with nginx WS proxy, or add `http-proxy-middleware` WS support to mobile-gateway.

**Effort estimate:** S (nginx config update), M (mobile-gateway WS proxy)

---

## Gap 8: WebSocket Has No Authentication ⚠️ SEVERITY: HIGH

**SEVERITY: HIGH — must be resolved before any non-development deployment.**

**Spec wants:** Secure, role-aware notifications.

**Backend has:** `WsServer` in `notification-service/src/infrastructure/websocket/ws-server.ts` accepts all connections without JWT validation. Any client that connects to `ws://host:9091` receives all notification events broadcast to all users — no user scoping, no role filtering.

**Impact on mobile:** Sensitive business data (order details, inventory levels, company operations) is visible to any unauthenticated client that discovers port 9091. In a LAN deployment this is a data leak risk. Not acceptable for any multi-user or externally reachable environment.

**Mobile-side plan this pass:** Connect to WS without token (matches current backend capability). The `lib/realtime/wsClient.ts` is written to accept an optional `token` parameter and will pass it as `ws://.../...?token=<jwt>` once the backend supports it — so upgrading is a one-call-site change.

**Recommendation:** In `ws-server.ts`, add JWT verification on the `upgrade` event before `handleUpgrade`. Reject connections with missing or invalid tokens (close socket with status 4001). Then filter message delivery so each client only receives events relevant to their role or userId.

**Effort estimate:** M (ws-server.ts upgrade handler + message filtering per client)

---

## Gap 9: No Pagination, Filtering, or Sorting on List Endpoints

**Spec wants:** Scalable list views with search and filtering.

**Backend has:** All list endpoints return the full collection. `GET /inventory` returns all records. `GET /orders` returns all records. No `?page=`, `?size=`, `?sort=`, `?search=` query parameters exist on any endpoint.

**Impact on mobile:** For small datasets (dev/test), this is acceptable. For production with hundreds of orders or thousands of inventory items, mobile will receive oversized payloads and render performance will degrade.

**Recommendation:** Add cursor-based or offset pagination to at minimum inventory and order list endpoints. Add `?warehouseId=` filter to inventory (already partially supported server-side but not as a query param — only as a path param on `/inventory/{warehouseId}`).

**Effort estimate:** M per service (S if using Spring Data Pageable / EF Core .Skip().Take())

---

## Gap 10: Order Has No Line Items (Single Product Only)

**Spec wants:** Orders with multiple line items (products + quantities).

**Backend has:** `CreateOrderRequest` has single `ProductId`, `Quantity`. An order represents one product. No `OrderItems` / `OrderLines` collection.

**Impact on mobile:** The create-order screen can only add one product per order. A picker (product, warehouse, driver) is sufficient but does not match typical ERP order UX.

**Recommendation:** Extend `Order` domain entity with an `OrderItems` collection. This is a breaking schema change (new migration) and requires changes to order-service DTO, Kafka event payload, and gRPC stock-update call.

**Effort estimate:** L (schema change + cascade changes)

---

## Gap 11: No GET /orders/:id Endpoint

**Spec wants:** Order detail screen for a single order.

**Backend has:** `OrdersController` has `GET /orders` (all) and `POST /orders` and `PUT /orders/status`. No `GET /orders/{id}` endpoint.

**Impact on mobile:** Order detail screen must find the order by ID in the full list, or the order detail is not possible without fetching all orders.

**Recommendation:** Add `GET /orders/{id}` to order-service and expose it via mobile-gateway.

**Effort estimate:** S

---

## Gap 12: Missing Idempotency Support for Future Offline Sync

**Spec wants:** Offline mutations that sync when connectivity is restored.

**Backend has:** No idempotency keys on any POST endpoint. Retrying a failed POST would create duplicate records.

**Impact on mobile:** Phase-2 offline write queue (see ARCHITECTURE_FUTURE.md) cannot be safely implemented without backend idempotency support.

**Recommendation:** Add `Idempotency-Key` header support to POST endpoints for: `POST /stock`, `POST /orders`, `POST /warehouses`. Store processed idempotency keys in a short-TTL Redis store per service.

**Effort estimate:** M per service (Redis dep required)

---

## Gap 13: DTOs Lack min/max Threshold Fields for Inventory

**Spec wants:** Inventory with minimum and maximum stock thresholds (for low-stock alerts and reorder triggers).

**Backend has:** `InventoryResponse` only has `{ id, productId, warehouseId, quantity }`. No `minQuantity`, `maxQuantity`, or `reorderPoint` fields. Kafka events `inventory.low` / `inventory.out` do exist in warehouse-service, but threshold logic is based on warehouse capacity, not per-product stock levels.

**Impact on mobile:** Low-stock indicator on the mobile inventory screen cannot be data-driven — mobile would have to hardcode thresholds or not show them.

**Recommendation:** Add `minQuantity` and `maxQuantity` to the Inventory entity (new migration), include them in `InventoryResponse`, and compute low-stock status in `AddStockCommandHandler` to publish `inventory.low` Kafka event when quantity falls below `minQuantity`.

**Effort estimate:** M (inventory-service schema + logic + mobile UI)
