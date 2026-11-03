# Requirements

What the system must do and the rules it must keep. Decisions D1–D13 come from the approved
[remediation plan](plans/remediation-plan.md); the ADRs in [decisions/](decisions/) record why.
Each rule names the phase that implements it while the plan is in progress.

## Roles

| Role | Who | In one line |
|---|---|---|
| ADMIN | system owner | everything, including user management |
| MANAGER | operations lead | master data, orders, approval |
| WORKER | warehouse staff | stock work and receiving goods |
| DRIVER | delivery driver | sees and delivers only the orders assigned to them |

Registration (D5, phase 3): public registration is **off by default**
(`AUTH_REGISTRATION_ENABLED=false`). When on, it always creates a WORKER, whatever the request
says. ADMIN creates users and assigns roles. The first ADMIN is created at start-up from
`AUTH_BOOTSTRAP_ADMIN_EMAIL` and `AUTH_BOOTSTRAP_ADMIN_PASSWORD` if no ADMIN exists.

## Permission matrix (ADR 006)

The single source of authorization. The backend enforces it in **every service** and in both
gateways (phase 3). Clients only mirror it. `own` means the request is allowed only for a resource
assigned to the caller, resolved from the token on the server. Anything not listed is denied.

| Action | Endpoint | ADMIN | MANAGER | WORKER | DRIVER |
|---|---|:-:|:-:|:-:|:-:|
| Log in, refresh, log out | `POST /auth/login`, `/auth/refresh`, `/auth/logout` | public | public | public | public |
| Register (only if enabled; always WORKER) | `POST /auth/register` | public | public | public | public |
| Manage users and roles | `/auth/users/**` (new, phase 3) | ✅ | | | |
| Read companies | `GET /companies`, `/companies/{id}`, `/companies/total` | ✅ | ✅ | ✅ | ✅ |
| Write companies | `POST/PUT/DELETE /companies…` | ✅ | ✅ | | |
| Read warehouses | `GET /warehouses…` | ✅ | ✅ | ✅ | ✅ |
| Write warehouses | `POST/PUT/DELETE /warehouses…` | ✅ | ✅ | | |
| Read products and categories | `GET /products…`, `GET /categories…` | ✅ | ✅ | ✅ | ✅ |
| Write products and categories | `POST/PUT/DELETE /products…`, `/categories…` | ✅ | ✅ | | |
| Read fleet | `GET /drivers`, `/drivers/{id}`, `GET /vehicles…` | ✅ | ✅ | ✅ | ✅ |
| Read my driver profile | `GET /drivers/me` | | | | own |
| Write fleet | `POST/PUT/DELETE /drivers…`, `/vehicles…` | ✅ | ✅ | | |
| Read stock | `GET /inventory…` | ✅ | ✅ | ✅ | |
| Stock adjustment (correction outside an order) | `POST /inventory` | ✅ | ✅ | | |
| Edit thresholds | `PUT /inventory/thresholds` | ✅ | ✅ | ✅ | |
| Consume stock | `POST /inventory/consume` | ✅ | ✅ | ✅ | |
| Read orders | `GET /orders`, `/orders/{id}` | ✅ | ✅ | ✅ | own |
| Create orders | `POST /orders` | ✅ | ✅ | | |
| Approve / reject | status Requested → Approved / Rejected | ✅ | ✅ | | |
| Cancel | status Requested or Approved → Cancelled | ✅ | ✅ | | |
| Mark delivered | status Approved → Delivered | ✅ | ✅ | | own |
| Upload delivery document | `POST /orders/upload-document` | ✅ | ✅ | ✅ | own |
| Close (goods receipt) | status Delivered → Closed | ✅ | ✅ | ✅ | |
| Read notifications, mark read | `/notifications…` | ✅ | ✅ | ✅ | ✅ (order topics only) |
| AI inventory summary, reorder suggestion | `/ai/…` | ✅ | ✅ | | |

Responses: no token or an invalid token → `401`. A valid token whose role may not act → `403`.
A resource that exists but is not the caller's `own` resource → `404` (it does not reveal that the
resource exists).

Read access for DRIVER on companies, warehouses and products is allowed because order screens show
their names. These are reference data, not sensitive.

## Supply order lifecycle (ADR 007, phase 4)

```text
Requested ──approve──▶ Approved ──deliver──▶ Delivered ──close (PDF)──▶ Closed
    │                     │
    ├──reject──▶ Rejected │
    └──cancel──▶ Cancelled ◀──cancel──┘
```

1. Any transition not drawn above is refused with `409 invalid_transition`. Repeating a transition
   (approving an approved order) is the same as any other invalid transition and changes nothing.
2. **Approve** checks that the warehouse has room for the quantity (D2); if not,
   `409 capacity_exceeded`. Approval does **not** change stock.
3. **Deliver** may be done by the driver assigned to the order (or ADMIN/MANAGER).
4. **Close** requires an uploaded delivery PDF for the order (`409 document_required` otherwise).
   Closing is the **goods receipt** (D1): stock for (product, warehouse) increases by the order
   quantity, exactly once, through the gRPC `AddStock` call with the order id as the operation id.
5. If inventory is unavailable at close, the order is saved as `Delivered` with
   `receiptStatus = PENDING` and a background job retries until it succeeds. It never ends up
   Closed without stock, and never adds stock twice.
6. Orders use optimistic concurrency: an update based on an outdated version gets `409 version_conflict`.
7. Order quantity is a positive integer. Product, warehouse, company and driver ids must exist
   (`400 invalid_reference`).

## Stock and capacity (ADR 007, phase 4)

1. Stock is one row per (product, warehouse), enforced by a unique constraint.
2. Quantity never goes below zero. Consumption of more than is available is refused (`409 insufficient_stock`).
3. Thresholds: `0 ≤ min ≤ max` when both are set.
4. Every stock change (goods receipt, adjustment, consumption) emits `inventory.stock.changed`
   with a signed delta. The warehouse's used capacity is the sum of its stock and is rebuilt from
   these events, ignoring duplicates.
5. Capacity is measured in product units (D3) and may never be exceeded (D2).
6. Updates are atomic (no lost update under concurrent requests).
7. A document for consumption is optional (D8); if given it must be a real PDF.

## Documents (ADR 009, phase 4)

- PDFs only, checked by content (magic bytes), at most 10 MB.
- Stored on a persistent volume, with a metadata row (id, owner resource, uploader, size, sha256, time).
- Downloaded only through an authenticated endpoint by a caller who may read the owning resource.
- Responses never contain filesystem paths.

## Notifications (ADR 008, phase 5)

- A shared operations feed. Each notification has a topic. Roles see the topics in the matrix
  above. DRIVER sees only order notifications for their own orders.
- Read state is **per user**. "Mark all read" affects only the caller.
- Delivered in real time over WebSocket, and stored, so nothing is lost while a client is offline.
- Every event produces exactly one notification, even when events arrive in a burst or are redelivered.

## Mobile

- Offline: read-only cache that survives restart (D9). No offline writes.
- Tokens are kept in the platform secure store. Logout clears cached data and unregisters the push token.

## Non-functional requirements

| Area | Requirement |
|---|---|
| Security | ES256 access tokens (15 min) with JWKS. Refresh tokens rotate on use and are revoked on logout. Web uses an httpOnly, Secure, SameSite cookie; mobile uses Bearer. Secrets never in the repo. |
| Errors | Every error is `{ "error": { "code", "message", "requestId" } }` with an `X-Request-ID` header. No stack traces or internal paths. |
| Reliability | Outbox for every event producer; idempotent consumers; dead-letter topics; timeouts and retries on every network call. |
| Observability | Structured JSON logs with request id; `/healthz` (liveness) and `/readyz` (readiness: database and broker) on every service. |
| Performance | Lists are paginated (`limit` ≤ 100) before data grows (BACKLOG for endpoints not yet paged). |
| Localization | Slovenian (default) and English in web and mobile. |
| Deployment | Same images and manifests in CI (kind) and on the VPS (k3s). The VPS has 8 GB RAM; the whole stack must fit in about 5.5 GB. |
