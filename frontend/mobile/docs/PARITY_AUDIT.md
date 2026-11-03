# Parity Audit — Mobile vs Web Micro-Frontends

> **Status:** Analysis only. No app code was changed. This document is the deliverable
> requested in `INSTRUCTIONS.md`; it ends with a proposed plan split into
> independently-approvable chunks. **Nothing has been implemented — awaiting approval
> on which chunks to build.**
>
> **Method:** Capabilities were derived from *current code*, not from the prior-intent
> docs. Where the existing docs (`FEATURE_MATRIX.md`, `MOBILE_VS_WEB_PARITY.md`,
> `ROLE_MATRIX.md`) disagree with the code, the drift is called out explicitly.
>
> **Sources read:**
> - Web: `web/{auth,companies,fleet,inventory,orders,products,warehouses}-mf/src/App.tsx`, `web/shell/src/{App,auth,notifications}.tsx`, `web/shell/src/components/{Layout,NotificationsPanel}.tsx`
> - Mobile: `mobile/app/**`, `mobile/lib/**`, `mobile/constants/{roles,colors}.ts`
> - Backend: `../Inventory-Supply-Management-Backend/mobile-gateway/src/**`, plus the relevant controllers in `services/*`

---

## 0. Headline finding — the prior docs are stale; the code has moved on

The three docs in `mobile/docs/` describe a world where many backend gaps were still
open. **Every one of those gaps is now closed in the actual backend code.** Verified
against the services:

| Doc claim (prior intent) | Current reality (verified in code) |
|---|---|
| `FEATURE_MATRIX` #1: "no refresh endpoint; backend 404s on refresh"; only 2 roles | `auth-service` `AuthController.refresh` exists; login sets `X-Auth-Token` + `X-Refresh-Token`; `Role` enum = `WORKER, MANAGER, ADMIN, DRIVER` |
| `FEATURE_MATRIX` #4: "no min/max threshold fields; no reduce-stock HTTP endpoint" | `inventory-service` `InventoryController` has `PUT /inventory/thresholds` and `POST /inventory/consume` (multipart) |
| `FEATURE_MATRIX` #5/#7: "no `/products/by-sku`… not exposed anywhere" | `product-service` `ProductController` has `[HttpGet("by-sku")]`; mobile-gateway proxies `/products/by-sku` |
| `FEATURE_MATRIX` #10: "no `/ai/*` routes exist anywhere" | `ai-service` exists with `GET /ai/inventory-summary` + `POST /ai/reorder-suggestion`; gateway proxies `/ai/*` |
| `MOBILE_VS_WEB_PARITY`: "Backend has no GET /orders/:id (Gap 11)" | `order-service` `OrdersController` has `[HttpGet("{id:guid}")]` and `?driverId=` filter |
| `ROLE_MATRIX`: backend Role enum is only `{WORKER, MANAGER}` | Now 4 roles (see above). Mobile `constants/roles.ts` already reflects this |

`mobile/docs/` should be treated as historical. Several mobile source files still carry
**stale comments** claiming gaps are open even though their own code already calls the
closed endpoint (`lib/scanner/scanner` header comment, `lib/realtime/wsClient.ts`
header comment) — flagged in §4 and §3.

---

## 1. Parity Matrix (capabilities, from code)

Legend: ✅ full · ⚠️ partial · ❌ missing. "Web MF" column names the owning micro-frontend.

| Capability | Web MF | Mobile | Notes on any non-✅ |
|---|:---:|:---:|---|
| **Auth — login** | ✅ auth-mf | ✅ | Web stores user in `localStorage` + HttpOnly cookie; mobile uses Bearer access token |
| **Auth — register** | ✅ auth-mf | ✅ | Both expose only `MANAGER`/`WORKER` in the role picker (see §3 role note) |
| **Auth — logout** | ✅ shell | ✅ | |
| **Auth — token refresh** | ❌ | ✅ | Web never calls `/auth/refresh`; mobile has a 401→refresh→retry interceptor. Mobile-only, not a gap to close on web for this audit |
| **Dashboard / KPIs** | ❌ | ✅ | **Reverse gap.** Web shell has no dashboard route (lands on `/warehouses`). Mobile `(tabs)/index.tsx` shows warehouse/order/active-order/unread KPIs + recent alerts. (Prior doc wrongly claims web has a Dashboard) |
| **Companies — list** | ✅ companies-mf | ✅ | |
| **Companies — create / edit / delete** | ✅ | ✅ | Mobile has full CRUD screens under `more/companies/` |
| **Companies — total count** | ✅ (`/companies/total`) | ❌ | Mobile API + gateway don't expose companies total (mobile shows it only as part of dashboard counts via list length) |
| **Products — list** | ✅ products-mf | ✅ | |
| **Products — create / edit / delete** | ✅ | ✅ | Both MANAGER-gated |
| **Products — filter by category** | ✅ | ❌ | Web has a category dropdown filter; mobile product list has no filter |
| **Products — find by SKU (text)** | ✅ (search box) | ⚠️ | Mobile has no SKU search box in the product list; SKU lookup exists only through the scanner screen |
| **Categories — list** | ✅ products-mf | ⚠️ | Mobile reads categories only as a picker inside the product form + detail; no standalone category list screen |
| **Categories — create** | ✅ | ⚠️ | `productsApi.createCategory` exists but there's no category-management screen wired to it |
| **Categories — edit / delete** | ✅ | ❌ | Mobile has no category edit/delete; mobile-gateway does not even proxy `PUT/DELETE /categories` |
| **Warehouses — list** | ✅ warehouses-mf | ✅ | |
| **Warehouses — detail** | ❌ (table only) | ✅ | Mobile has a dedicated `[id]` detail screen |
| **Warehouses — create / edit / delete** | ✅ | ✅ | Both MANAGER-gated; both use country/city enums + capacity |
| **Warehouses — total/summary** | ✅ (`/total`) | ✅ (`/summary`→`/total`) | |
| **Warehouse capacity display** | ✅ (used/total columns) | ⚠️ | Need to confirm mobile detail shows used vs total; no utilization bar on either side |
| **Stock — list (all + per warehouse)** | ✅ inventory-mf | ✅ | |
| **Stock — add / create inventory** | ❌ | ✅ | **Reverse gap.** inventory-mf has *no* add-stock; mobile `stock/add.tsx` posts `POST /stock` and can set min/max on creation |
| **Stock — edit thresholds (standalone)** | ✅ (`PUT /inventory/thresholds`) | ❌ | Mobile can only set thresholds at add-time, not edit them later. Gateway doesn't proxy `/stock/thresholds` |
| **Stock — consume / reduce (with PDF record)** | ✅ (`POST /inventory/consume`) | ❌ | Web builds a PDF + multipart consume flow. Mobile has no reduce/consume path. Gateway doesn't proxy `/stock/consume` |
| **Stock — low-stock indicator** | ✅ (red count pill) | ✅ (amber per-item badge) | Semantics + color diverge (see §4) |
| **Orders — list + status filter** | ✅ orders-mf | ✅ | |
| **Orders — create** | ✅ | ⚠️ | Web create form includes a **delivery date**; mobile create form omits it (product/company/warehouse/driver/qty only) |
| **Orders — detail** | ✅ (modal) | ✅ (`[id]` screen) | Web resolves IDs→names; mobile shows raw UUIDs (see §4) |
| **Orders — advance status** | ✅ | ✅ | Both walk Requested→Approved→Delivered→Closed |
| **Orders — close requires document upload** | ✅ | ❌ | **Behavioral divergence.** Web forces a PDF upload on Delivered→Closed (`POST /orders/upload-document`). Mobile advances Delivered→Closed with no upload. Gateway *does* proxy upload-document; only the mobile UI is missing |
| **Orders — driver assignment on create** | ✅ | ✅ | |
| **Orders — line items (multi-product)** | ❌ | ❌ | Neither supports it (backend is single-product per order) |
| **Fleet — drivers list / CRUD** | ✅ fleet-mf | ✅ | Mobile MANAGER-gated writes |
| **Fleet — vehicles list / CRUD** | ✅ fleet-mf | ✅ | |
| **Fleet — driver self-view (`/drivers/me`)** | ❌ | ✅ | Mobile-only; `fleetApi.getMyDriver`. Only reachable if a DRIVER token exists (see §3) |
| **Notifications — history list** | ✅ (header panel) | ✅ (dedicated tab) | |
| **Notifications — mark one / all read** | ✅ | ✅ | |
| **Notifications — unread badge** | ✅ (bell badge) | ✅ (tab badge) | |
| **Notifications — realtime (WebSocket)** | ✅ (ticket → `:9091`) | ✅ (jwt → gateway `/ws`) | Different auth + transport path (see §3) |
| **Notifications — polling fallback** | ❌ | ✅ | Mobile falls back to 30s polling when WS gives up |
| **Role-based UI gating** | ⚠️ | ✅ | Web shows all action buttons to everyone (gating is backend-only); mobile has `RoleGate`/`useHasFeature` hiding write actions client-side |
| **Profile / settings** | ❌ (no route) | ⚠️ | Mobile has a profile screen (user card + logout) but no theme toggle that the prior doc mentions; web has no settings page at all |

**Ambiguous cells flagged for your call (don't want to guess ✅/❌):**
- *Categories on mobile* — marked ⚠️ because the API methods exist and categories are
  used as a picker, but there is no management screen. Is "category management" in
  scope for mobile parity, or is picker-only acceptable?
- *Warehouse capacity display* — I did not fully read `more/warehouses/[id].tsx`; please
  confirm whether used/total capacity is shown there before treating it as ✅.
- *Products "find by SKU"* — mobile can resolve a SKU (scanner), but has no typed search
  box like web. Is that parity or a gap?

---

## 2. Mobile-only intended features (additions, NOT parity gaps)

These exist on mobile by design and have no web counterpart. Per instructions they are
**not** flagged as gaps:

1. **AI analysis** — `app/(tabs)/more/ai.tsx` + `lib/ai/aiClient.ts`. Fully wired to
   `ai-service`: inventory summary (Azure or template source), totals, low-stock alerts,
   reorder suggestions. MANAGER-gated. **Not a shell** — it renders live data.
2. **Barcode scanner** — `app/(tabs)/more/scanner.tsx` + `lib/scanner/*`. Camera
   (`expo-camera`, EAN/Code128/QR) + manual SKU entry, resolves via
   `GET /products/by-sku`, routes to the product detail. **Not a shell** — fully working.
   *(Header comment in the file is stale: it claims a client-side fallback "until backend
   ships by-sku", but the code already uses the real endpoint.)*
3. **Push notifications** — `hooks/usePushRegistration` + `notificationsApi.registerDeviceToken`
   (`POST /notifications/device-tokens`). A scaffold: registers an Expo token; no
   server-side fan-out worker yet.
4. **Realtime polling fallback** — mobile degrades WS→30s polling; web does not.
5. **Token refresh interceptor** — silent 401→refresh→retry; web has none.
6. **Client-side role gating** — `RoleGate` / `useHasFeature` driven by `constants/roles.ts`.
7. **Offline reads (weak)** — React Query `gcTime: 5min` gives cached reads offline.
   ⚠️ Note: `components/ui/OfflineBanner.tsx` exists **but is never rendered anywhere**,
   and there is no connectivity detection or write queue. Offline support is effectively
   "cache only"; the banner is dead code.

---

## 3. Gateway routing findings (Phase 3 — correctness check)

**Verdict: clean. Mobile routes exclusively through `mobile-gateway` (port 8090). No
bypass defects found.**

### Does every mobile API call resolve to a mobile-gateway route?

Yes. `lib/http/client.ts` sets `BASE_URL` to the gateway (`:8090`, override via
`EXPO_PUBLIC_API_URL`) and every `lib/api/*` module uses the shared `axiosClient`. A
grep across `app/`, `lib/`, `hooks/`, `stores/`, `components/` found **no** raw `fetch()`,
no `ws://`/`wss://` literals, and no hardcoded service ports. Endpoint-by-endpoint, every
mobile call maps to a router in `mobile-gateway/src/routes/*`:

| Mobile call | Gateway route | Downstream |
|---|---|---|
| `/auth/{login,register,logout,refresh}` | `auth.routes` | auth-service |
| `/companies`, `/companies/:id` (CRUD) | `company.routes` | company-service |
| `/drivers[/:id]`, `/drivers/me`, `/vehicles[/:id]` | `fleet.routes` | fleet-service |
| `/stock`, `/stock/:warehouseId` (GET/POST) | `inventory.routes` → `/inventory*` | inventory-service |
| `/orders`, `/orders?driverId=`, `/orders/:id`, `PUT /orders/:id/status` | `order.routes` (rewrites status to `PUT /orders/status`) | order-service |
| `/products[/:id]`, `/products/by-sku`, `/categories` (GET/POST) | `product.routes` | product-service |
| `/warehouses[/:id]`, `/warehouses/summary`→`/total` | `warehouse.routes` | warehouse-service |
| `/notifications`, `/notifications/unread`, `PATCH …/read`, `/read-all`, `/device-tokens` | `notification.routes` | notification-service |
| `/ai/inventory-summary`, `/ai/reorder-suggestion` | `ai.routes` (MANAGER) | ai-service |
| WS `…/ws?token=<jwt>` | `index.ts` `/ws` upgrade proxy | notification-service `:9091` |

### Any mobile capability whose backend route is MISSING from mobile-gateway?

**None.** Every endpoint the mobile app actually calls is proxied, and every downstream
controller exists (verified in the services). The previously-feared missing pieces
(refresh, by-sku, orders/:id, drivers/me, ai) are all present.

### Any mobile call bypassing the gateway?

**None.** This is a key correctness result and contradicts the prior docs, which assumed
the WebSocket connected directly to `:9091`:

- **WS now goes through the gateway.** `index.ts` registers a `/ws` upgrade proxy → 
  `ws://localhost:9091`, and `client.ts` sets `WS_URL = BASE_URL/ws`. So mobile WS
  traffic hops through `:8090`, not directly to `:9091`.
- ⚠️ **Stale comment defect (not a routing defect):** `lib/realtime/wsClient.ts`'s header
  comment still says *"WebSocket connects directly to notification-service :9091 (not via
  mobile-gateway)… Gap 7."* The code does not do that — it uses `WS_URL` (gateway). The
  only way to actually bypass is to set `EXPO_PUBLIC_WS_URL` to a raw `:9091` URL. Worth
  fixing the comment to prevent someone "restoring" a real bypass.

### Gateway gaps relative to *web* parity (only matter if we close the §1 gaps)

The gateway omits some routes the **web** gateway exposes. These are not defects for
current mobile behavior, but each is a prerequisite if we choose to build the matching
mobile feature:

- `PUT /stock/thresholds` and `POST /stock/consume` — needed for standalone threshold
  edit / stock consume on mobile.
- `PUT /categories/:id`, `DELETE /categories/:id` — needed for mobile category management.
- `GET /companies/total` — needed if mobile wants the companies total endpoint.
- `GET /notifications/ws-ticket` — web's WS auth style; mobile uses jwt-in-query instead,
  so only relevant if we ever align the WS auth approach.

---

## 4. Style / UX divergences (Phase 4 — describe only)

Shared foundation is good: both use the slate + blue-500 palette, and `constants/colors.ts`
is explicitly documented as mirroring the MFs. Divergences below are concrete.

**Language / labels**
- Web UI is **English** (Warehouses, Orders, Requested/Approved/Delivered/Closed).
- Mobile UI is **Slovenian** via `constants/i18n.ts` (Domov, Zaloga, Naročila, Obvestila,
  Več; order statuses localized). This is the single biggest user-facing divergence.

**App chrome color**
- Web: dark slate (`#1e293b`) sidebar **and** top header.
- Mobile: tab header bar is **blue** (`#3b82f6`, set in `(tabs)/_layout.tsx`); there is no
  slate chrome. Different brand feel between platforms.

**Order status badge colors** (same labels, different hues)

| Status | Web (`orders-mf`) | Mobile (`orders/*`) |
|---|---|---|
| Requested | `#f59e0b` | `#f59e0b` ✅ same |
| Approved | `#3b82f6` (blue-500) | `#0ea5e9` (sky-500) ✗ |
| Delivered | `#10b981` (emerald-500) | `#22c55e` (green-500) ✗ |
| Closed | `#64748b` (slate-500) | `#94a3b8` (slate-400) ✗ |

**Notification rendering**
- Web `AppNotification`: fields `title` + **`message`**, `category` (ORDER/INVENTORY/
  WAREHOUSE → emoji icons), `severity` lowercase (`info/warning/error/success`).
  Severity colors: info `#3b82f6`, warning `#f59e0b`, error `#dc2626`, success `#16a34a`.
- Mobile `NotificationResponse`: fields `title` + **`body`**, **no category**, `severity`
  UPPERCASE (`INFO/WARNING/ERROR`, **no SUCCESS**). Severity colors: INFO `#0ea5e9`,
  WARNING `#f59e0b`, ERROR `#ef4444`.
- Divergences: field name (`message` vs `body`), info hue, error hue, missing
  success severity, missing category icons on mobile.

**Low-stock semantics & color**
- Web: a single red count pill ("Low: N", `#dc2626`) in the header; row quantity turns red
  when below min.
- Mobile: a per-card **amber** badge ("Nizka zaloga", `#fef3c7`/`#d97706`) + amber left
  border. Web treats low stock as *danger* (red), mobile as *warning* (amber).

**Red shade inconsistency (also internal to mobile)**
- Web uses `#dc2626` (red-600) for destructive/error throughout.
- Mobile screens hardcode `#ef4444` (red-500) for logout/delete/error in several places,
  **even though `colors.ts` defines `danger: '#dc2626'`.** So mobile diverges from web
  *and* from its own token.

**ID resolution in lists/detail**
- Web resolves foreign keys to human names everywhere (product/company/warehouse/driver
  via `fetchOptions` + `nameById`).
- Mobile order list/detail and stock cards show **raw UUIDs** for product/company/driver
  (order detail even renders them in a monospace style). This is a real readability gap,
  not just cosmetics.

**Layout idioms (expected platform divergence, listed for completeness)**
- Web: fixed sidebar nav, data **tables**, centered modal dialogs for create/edit.
- Mobile: bottom **tab bar** (5 tabs), **card** lists, **FABs** for create, full-screen
  push forms, inline picker lists instead of `<select>`.

---

## 5. Proposed plan (chunks — each independently approvable, NOTHING built yet)

Sizes: **S** ≈ <½ day, **M** ≈ 1–2 days, **L** ≈ 3+ days. Dependencies noted.

### A. Parity gaps to close (mobile features missing vs web)

| # | Chunk | Size | Files it would touch | Depends on |
|---|---|:---:|---|---|
| A1 | **Resolve IDs→names** in order list/detail + stock cards (fetch products/companies/warehouses/drivers, map like web) | S–M | `app/(tabs)/orders/index.tsx`, `orders/[id].tsx`, `stock/index.tsx` | — |
| A2 | **Order create: add delivery date** field to match web | S | `app/(tabs)/orders/create.tsx`, `types/api`, `lib/api/orders.ts` | — |
| A3 | **Order close: require document upload** on Delivered→Closed (file picker → `POST /orders/upload-document`) | M | `app/(tabs)/orders/[id].tsx`, `orders/index.tsx`, `lib/api/orders.ts` | Gateway already proxies upload-document (no B item needed) |
| A4 | **Stock: consume / reduce flow** (select items, qty, optional proof PDF) mirroring inventory-mf | L | new `app/(tabs)/stock/consume.tsx`, `lib/api/inventory.ts` | **B1** (gateway must proxy `/stock/consume`) |
| A5 | **Stock: edit thresholds** for an existing item (standalone, not only at add-time) | S–M | `app/(tabs)/stock/*`, `lib/api/inventory.ts` | **B1** (proxy `/stock/thresholds`) |
| A6 | **Products: category filter + SKU search box** in the product list | S | `app/(tabs)/more/products/index.tsx` | — |
| A7 | **Category management screen** (list + create + edit + delete) | M | new `app/(tabs)/more/products/categories*`, `lib/api/products.ts` | **B2** (proxy `PUT/DELETE /categories`) |
| A8 | **Wire the offline banner** (add connectivity detection, render `OfflineBanner`, block mutations offline) — closes the dead-code gap | M | `components/ui/OfflineBanner.tsx` (already exists), tab/layout screens, a `useConnectivity` hook | — |

### B. Gateway fixes (mobile-gateway routes the mobile features above need)

| # | Chunk | Size | Files it would touch | Notes |
|---|---|:---:|---|---|
| B1 | Proxy `PUT /stock/thresholds` → `/inventory/thresholds` and `POST /stock/consume` (multipart) → `/inventory/consume` | S | `mobile-gateway/src/routes/inventory.routes.ts` | Backend endpoints already exist; this is pure proxy wiring. Blocks A4, A5 |
| B2 | Proxy `PUT /categories/:id`, `DELETE /categories/:id` (MANAGER) | S | `mobile-gateway/src/routes/product.routes.ts` | Confirm product-service supports category update/delete first. Blocks A7 |
| B3 | (Optional) Proxy `GET /companies/total` | S | `mobile-gateway/src/routes/company.routes.ts` | Only if we want the companies total on mobile |

> **No bypass-defect fixes are required** — Phase 3 found none. The only gateway-adjacent
> cleanup is documentation: fix the stale "direct to :9091 / Gap 7 open" comment in
> `lib/realtime/wsClient.ts` and the stale "until backend ships by-sku" comment in
> `lib/scanner/scanner.tsx`. Bundle these into whichever chunk you approve, or treat as a
> tiny standalone **S** docs chunk (call it B0).

### C. Style alignment (make mobile match the MFs' visual language) — approve/skip independently

| # | Chunk | Size | Files it would touch |
|---|---|:---:|---|
| C1 | **Unify status badge colors** with web (Approved `#3b82f6`, Delivered `#10b981`, Closed `#64748b`) — ideally via a shared token | S | `orders/index.tsx`, `orders/[id].tsx`, `constants/colors.ts` |
| C2 | **Unify red shade**: replace hardcoded `#ef4444` with the `colors.danger` (`#dc2626`) token across screens | S | many `app/**` StyleSheets, `constants/colors.ts` |
| C3 | **Align notification model**: add category icons + a SUCCESS severity, match severity hues (info `#3b82f6`, error `#dc2626`) | S–M | `app/(tabs)/notifications.tsx`, `types/api`, possibly notification-service response shape |
| C4 | **Decide low-stock semantics**: red (danger, like web) vs amber (warning, current mobile) — pick one and apply both sides | S | `stock/index.tsx` (and/or inventory-mf) — cross-platform decision |
| C5 | **App chrome**: decide whether mobile header should adopt the slate (`#1e293b`) brand chrome like web, or keep blue | S | `app/(tabs)/_layout.tsx` |

> **Language (English vs Slovenian) is intentionally NOT in chunk C.** Localizing web or
> de-localizing mobile is a product decision well beyond style alignment — flagging it for
> your direction rather than proposing it as a task.

### Suggested dependency / sequencing summary
- **B1 → A4, A5** · **B2 → A7** (gateway before the feature that needs it).
- A1, A2, A3, A6, A8 and all of C are independent and can be approved à la carte.
- The doc-update micro-chunk (B0) can ride along with anything.

---

## 6. Open questions for you (before any build)
1. Is **category management** in scope for mobile parity, or is picker-only fine? (affects A7/B2)
2. Should the **low-stock color** be red (web) or amber (mobile)? (affects C4 — cross-platform)
3. Do you want mobile to **localize→English-parity** or is the Slovenian UI intentional and to stay?
4. Confirm whether `more/warehouses/[id].tsx` already shows used/total capacity (one ⚠️ in §1 hinges on it).
5. Should B2 proceed only after confirming product-service exposes category update/delete?

> **Stopping here per instructions — awaiting your approval on which chunks (A/B/C items) to build.**
