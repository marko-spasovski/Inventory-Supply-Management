# pocket-logistics-pro-expo — Changelog

## 2026-05-19 — Live Azure + palette alignment + CI

### Color palette aligned with the web MFs

The web micro-frontends use the slate + Tailwind blue-500 palette
(`#3b82f6` primary, `#dbeafe` accent, `#1e293b` text, `#94a3b8` muted,
`#e2e8f0` borders — grep their `src/App.tsx` to confirm). Mobile was using
indigo-500 (`#6366f1`) which didn't match. Refactored:

- New `constants/colors.ts` — single source of truth tokens table mirroring
  the MFs. New code should import `colors` from there; old hardcoded hex
  values still work but should migrate when touched.
- Sed-style global swap across `app/`, `components/`, `hooks/`, `lib/` of:
  - `#6366f1` → `#3b82f6` (primary blue-500)
  - `#ede9fe` → `#dbeafe` (light tint)
  - `#a5b4fc` → `#93c5fd` (mid-tone)
  - `#4f46e5` → `#2563eb` (dark)
  - `#818cf8` → `#60a5fa` (mid)
  103 hex literals across 41 files. tsc + tests stay green.

### Smoke-test results (against live backend + ngrok tunnel)

All gateway endpoints respond as documented:

| Domain | Status |
|---|---|
| Auth login / register / refresh | 200 / 201 / 200 |
| Companies CRUD                  | 200 / 200 / 200 |
| Warehouses (incl. summary)      | 200 |
| Stock (incl. min/max round-trip)| 200 |
| Products + by-sku               | 200 / 200 (404 for unknown SKU) |
| Categories                      | 200 (empty body — expected) |
| Orders list / detail / status   | 200 / 200 / 200 (status numeric ↔ string normalised in mobile) |
| Drivers list / me               | 200 / 404 (smoke-mgr isn't a driver — expected) |
| Vehicles CRUD                   | 200 / 201 / 200 |
| Notifications list / unread     | 200 |
| AI inventory-summary            | **200 with `source: "azure"`** — live Slovenian narrative from o4-mini |

### AI screen confirmed live

ai-service was responding with `source: "template"` despite having Azure
credentials because (a) `??` operator didn't shadow empty-string env vars,
(b) `2024-08-01-preview` API version is rejected for o-series, and
(c) the 600-token budget was burned entirely on `reasoning_tokens` with
zero left for the visible reply. All three fixed:

- `services/ai-service/src/config.ts` — `||` instead of `??` so empty env
  falls through to inline default.
- API version default bumped to `2024-12-01-preview` (in both `config.ts`
  and `compose.yaml`).
- `services/ai-service/src/azure/openai-client.ts` — detect o-series by
  deployment-name prefix (`/^o\d/i.test(...)`), send `max_completion_tokens`
  (not `max_tokens`), drop the temperature override (only the default 1
  is accepted), floor the budget at 4000 so reasoning has room to think
  AND produce a reply. Verified: `source: "azure"` end-to-end through
  the mobile-gateway.

### CI — mobile

New `.github/workflows/ci.yml` — runs `tsc --noEmit` + `npm test` on push
and PR to `main`. No registry credentials needed; mobile is distributed
via Expo, not as a container.

### Tiny mobile fix

`app/(tabs)/more/index.tsx` — companies menu entry was role-gated on
`PRODUCTS_READ` (copy-paste error). Now correctly uses `COMPANIES_READ`.

### Verification

`npx tsc --noEmit` exit 0 · `npm test` → 4 suites / 20 tests passing.

---



## 2026-05-17 (c) — Final gap-closure batch wired through the mobile

Following the third backend pass (ai-service spin-up + WS proxy + driver
self-view + inventory thresholds + push token table), the mobile side now
consumes everything.

### AI screen now does the real thing (Gap 6)

- `lib/ai/aiClient.ts` — types match ai-service exactly. Added
  `requestReorderSuggestion(productId, warehouseId)` for the POST endpoint.
- `app/(tabs)/more/ai.tsx` — full rewrite:
  - "Zaženi analizo" button gates the network call (no auto-fetch).
  - Renders summary in a colored card; badge indicates whether the text
    came from Azure or the templated fallback.
  - Totals grid: products / warehouses / total stock / low-stock count.
  - Alerts list + reorder suggestions with green "+suggestedQty" badges
    and human-readable reasoning.
  - Pull-to-refresh wired to React Query.
- `constants/i18n.ts` — new keys: `ai.{intro,bullet1..3,acknowledge,refresh,sourceAzure,sourceLocal,totals,products,warehouses,totalStock,lowStock,alerts,reorder,suggestedQty}`.

### WS connects through the gateway (Gap 7)

- `lib/http/client.ts` — `WS_URL` defaults to `${BASE_URL}/ws` (the new
  gateway upgrade endpoint). Old `:9091` direct connection no longer needed
  — same host:port works for both REST and WS now, which simplifies the
  hotspot / ngrok story considerably.

### Driver-scoped data (Gap 3)

- `lib/api/fleet.ts` — `getMyDriver()` calls `/drivers/me`; returns null on
  404 so DRIVER-role flows can show a friendly empty state.
- `lib/api/orders.ts` — `getByDriver(driverId)` adds `?driverId=` filter.

(Order list / dashboard auto-scoping based on role is a next-pass tweak;
the data layer is ready.)

### Inventory thresholds (Gap 13)

- `types/api.ts` — `InventoryResponse` / `CreateInventoryRequest` gain
  optional `minQuantity` / `maxQuantity`.
- `app/(tabs)/stock/index.tsx` — low-stock badge is now data-driven (uses
  `item.minQuantity` when present, falls back to 10). Card footer shows
  `min N · max N` when set.
- `app/(tabs)/stock/add.tsx` — two new optional inputs for thresholds with
  cross-validation (`max ≥ min`). Submitting with empty values leaves
  existing thresholds untouched on the server.
- `constants/i18n.ts` — `stock.{minQuantity,maxQuantity,thresholdInvalid}`.

### Push token registration (mobile #16 partial)

- `lib/api/notifications.ts` — `registerDeviceToken(token, platform)` /
  `unregisterDeviceToken(token)`.
- `hooks/usePushRegistration.ts` — runs once per logged-in user, asks for
  notification permission, fetches the Expo push token, POSTs to the
  gateway. Silent skip in Expo Go on iOS (Apple restriction). Best-effort —
  failures are logged, never throw to React.
- `app/(tabs)/_layout.tsx` — calls `usePushRegistration()` alongside
  `useNotificationsSocket()` for the lifetime of the tab shell.

### Verification

`npx tsc --noEmit` exit 0 · `npm test` → 4 suites / 20 tests passing.

End-to-end smoke through the gateway:

```bash
TOKEN=$(curl -s -X POST http://localhost:8090/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke-mgr@test.local","password":"smoke1234"}' \
  -i | grep -i ^x-auth-token | awk '{print $2}' | tr -d '\r')

curl http://localhost:8090/ai/inventory-summary   -H "Authorization: Bearer $TOKEN"  # 200
curl http://localhost:8090/drivers/me              -H "Authorization: Bearer $TOKEN"  # 404 unless mgr is also a driver — expected
curl "http://localhost:8090/orders?driverId=<uuid>" -H "Authorization: Bearer $TOKEN" # 200, filtered
```

### Backend rebuilds needed

```
mobile-gateway        docker compose up -d --build mobile-gateway
ai-service            docker compose up -d --build ai-service  (new image, not previously running)
inventory-service     mvn package + restart                 (new Inventory columns)
order-service         dotnet build + restart                (?driverId filter)
fleet-service         dotnet build + restart                (GET /drivers/me)
notification-service  npm run build + restart               (device_tokens table + endpoints)
auth-service          already done in previous pass         (no change today)
```

---



## 2026-05-17 (b) — Wired to new backend capabilities + P3 polish

Five backend gaps were closed (see sibling changelogs under
`erp-inventory/Inventory-Supply-Management/services/*` and the
`mobile-gateway`). The mobile side now consumes them.

### Refresh-token flow (Gap 1)

- `lib/api/auth.ts` — `login()` now also returns `refreshToken` (from
  `X-Refresh-Token` header). New `refresh(refreshToken)` method calls
  `POST /auth/refresh`.
- `stores/authStore.ts` — persists `refreshToken` alongside the access
  token in AsyncStorage; new `setAccessToken()` updater for in-place
  refresh.
- `lib/http/client.ts` — response interceptor rewritten:
  - On 401 from any non-auth endpoint, try one refresh via the stored
    refresh token.
  - Concurrent 401s share a single in-flight refresh promise
    (`refreshInFlight`) — no duplicate refresh requests.
  - On success, the original request is replayed with the new bearer.
  - On failure (or no refresh token), local auth is cleared and the
    AuthGuard bounces to login.
- `app/(auth)/login.tsx` — passes the refresh token through to `setAuth`.

### Barcode scanner uses the real endpoint (Gap 5)

- `lib/api/products.ts` — new `getBySku(sku)` calling
  `GET /products/by-sku`; returns `null` on 404 (no try/catch needed at the
  callsite).
- `lib/scanner/resolveScannedCode.ts` — collapsed from the
  fetch-all-and-walk fallback to a single `productsApi.getBySku(sku)` call.
  Signature preserved (`(queryClient, code)`) so the scanner screen needs
  no changes.

### Single-order detail screen (Gap 11)

- `lib/api/orders.ts` — new `getById(id)` returning `OrderResponse | null`,
  using the wire→domain normaliser.
- `constants/queryKeys.ts` — added `orderDetail(id)`.
- `app/(tabs)/orders/[id].tsx` — new detail screen with status card, all
  related ids, delivery/created timestamps, and the next-status action
  (`ORDERS_STATUS_UPDATE` gated).
- `app/(tabs)/orders/index.tsx` — list rows now navigate to the detail
  view; the inline "advance" button keeps working (stops event
  propagation so the card tap doesn't also fire).

### WS auth (Gap 8)

- `lib/realtime/wsClient.ts` — `connect()` appends `?token=<jwt>` to the
  WS URL. The stale reference to `_token` in the `onclose` reconnect
  scheduler was fixed (was an unused-prefix typo). The shared singleton
  in `hooks/realtime/useNotifications.ts` already passes the active JWT.

### ADMIN / DRIVER unblocked (Gap 2)

- `constants/roles.ts` — comment + types updated to reflect that the
  backend now issues all four roles; the alias collapse is a no-op now
  (kept for forwards compatibility with any unknown future role string).
  `RoleGate`-protected screens that targeted `ADMIN` / `DRIVER` (`FLEET_SELF`,
  e.g.) will start matching real users.

### P3 polish

- `lib/i18n/locale.ts` — new file:
  - `Locale` union (just `'sl'` today) and `Strings` type.
  - `MESSAGES` map keyed by locale.
  - `getStrings(locale)` standalone helper.
  - `useLocaleStore` (zustand + AsyncStorage persist) + `useStrings()`
    hook.
  - Adding a second locale is a one-line change: append to `MESSAGES` and
    extend `Locale`. Device-locale detection via `expo-localization` is a
    commented two-liner.
  - `constants/i18n.ts` is unchanged — every existing `import { sl }`
    keeps working.
- `components/ErrorBoundary.tsx` — top-level boundary; on a render-time
  exception it shows a recovery card with app slug + version + platform
  (read via `expo-constants` + `Platform`) and a reset button that clears
  the captured error. Wired in `app/_layout.tsx` above
  `QueryClientProvider` so it catches every screen.

### Verification

`npx tsc --noEmit` exit 0 · `npm test` → 4 suites / 20 tests passing.

### Backend rebuild required

These mobile changes assume the backend service rebuilds described in:

- `mobile-gateway/CHANGELOG.md` (2026-05-17 b)
- `services/auth-service/CHANGELOG.md`
- `services/product-service/CHANGELOG.md`
- `services/order-service/CHANGELOG.md`
- `services/notification-service/CHANGELOG.md`

Each has its own restart instructions.

---



## 2026-05-17 — Mobile DTO + form fixes after live smoke-test

While walking `VERIFICATION_CHECKLIST.md` against the live backend the
mobile-side type mirrors and a few form components disagreed with the real
service DTOs. Updated to match the actual schemas observed in
`erp-inventory/Inventory-Supply-Management/services/*`.

> See sibling changelog at
> `erp-inventory/Inventory-Supply-Management/mobile-gateway/CHANGELOG.md` for
> the gateway-side fixes that had to land before any of these mismatches could
> surface.

### DTO mismatches fixed (`types/api.ts`)

| Entity | Was (mobile) | Now (matches backend) |
|---|---|---|
| `CompanyResponse` / Create / Update | `{ id, name }` | `{ id, name, email, phone, contact }` — all four required by company-service `CreateCompanyRequest.java` (`contact` is `NOT NULL` in the DB) |
| `WarehouseResponse` / Create / Update | `country: string`, `city: string` | `country: 'MACEDONIA' \| 'SLOVENIA'`, `city: 'MARIBOR' \| 'LJUBLJANA' \| 'KUMANOVO' \| 'SKOPJE'` — Jackson rejects anything else with a 400 |
| `VehicleResponse` / Create / Update | `{ id, plateNumber, type, companyId }` | `{ id, registrationPlate }` — the C# `Vehicle` entity has only those two columns; `type` and `companyId` never existed |
| `CategoryResponse` / Create | `{ name }` | `{ name, description? }` — backend accepts and persists optional description |
| `TotalWarehousesResponse` | `{ total }` | `{ totalNumberOfWarehouses }` — the actual field name returned by warehouse-service |

New constant exports: `COUNTRIES`, `CITIES` (typed enum arrays) plus the
matching `Country` and `City` union types — single source of truth for
mobile form pickers.

### Form components updated

- `components/forms/CompanyForm.tsx` — added `email`, `phone`, `contact`
  inputs; submit guard now requires all four fields (email RFC-ish regex).
- `components/forms/WarehouseForm.tsx` — replaced free-text `country` / `city`
  inputs with enum pickers driven by `COUNTRIES` / `CITIES`. Submit guard
  requires non-empty selection. User-facing display labels remain Slovenian
  (`'Slovenija'`, `'Ljubljana'`, …); the wire value is the enum constant.
- `components/forms/VehicleForm.tsx` — collapsed to a single
  `registrationPlate` input. Vehicle type and company picker removed (those
  fields don't exist on the backend).
- `components/forms/DriverForm.tsx` — vehicle picker now uses
  `registrationPlate` for the label; `vehicleId` is now part of the submit
  guard (the C# `CreateDriverRequest` flags it `[Required]`).

### Screen updates

- `app/(tabs)/more/companies/[id].tsx` — detail view now renders email,
  phone, contact fields below name.
- `app/(tabs)/more/fleet/vehicles/[id].tsx` — dropped `type` and `company`
  fields and the now-unused `companiesApi` query; title uses
  `registrationPlate`.
- `app/(tabs)/more/fleet/vehicles/edit/[id].tsx` — title uses
  `registrationPlate`.
- `app/(tabs)/more/fleet/index.tsx` — vehicle row shows only the plate.
- `app/(tabs)/more/fleet/drivers/[id].tsx` — vehicle field shows plate only.

### i18n additions (`constants/i18n.ts`)

- `companies.{name, email, phone, contact}` — labels for the expanded form.

### Verification (after gateway fix + these mobile fixes)

Manual curl smoke against `http://localhost:8090` with a fresh MANAGER JWT:

| Endpoint | Status |
|---|---|
| `POST /auth/register`                   | 201 |
| `POST /auth/login` (returns `X-Auth-Token`) | 200 |
| `POST /companies` `{name,email,phone,contact}` | 200 + full body |
| `POST /warehouses` `{name, country:SLOVENIA, city:LJUBLJANA, totalCapacity}` | 200 + full body |
| `POST /categories` `{name, description?}`         | 200 |
| `POST /products` `{name, sku, description, weight, categoryId}` | 200 |
| `POST /vehicles` `{registrationPlate}`            | 201 + full body |
| `POST /drivers` `{name, phone, email, vehicleId, companyId}` | 201 + full body |
| `POST /stock` `{warehouseId, productId, quantity}` | 200 + full body |
| `POST /orders` `{productId, companyId, warehouseId, driverId, quantity}` | 200 + full body |
| `PUT /orders/:id/status` `{status:1}`             | 200 (advanced Requested→Approved) |
| `DELETE /companies/:id`, `DELETE /vehicles/:id`   | 200 |
| `PUT /warehouses/:id` (with `usedCapacity` in body) | 200 |
| `GET` for every entity                            | 200 |

`npx tsc --noEmit` exit 0 · `npm test` → 4 suites / 20 tests passing.

### Open items (not regressions, but visible)

- The detail/list views of warehouses still display the raw enum string
  (`SLOVENIA`, `LJUBLJANA`). Acceptable; the form pickers use friendly
  labels. Could be polished by sharing the label maps.
- The mobile schema for `DriverResponse.vehicleId` is required on the wire
  but optional in the data model — pre-existing drivers may need backfill.
- `OrderResponse.status` numeric vs string mismatch: the C# enum serialises
  as a number (`0 = Requested`), but mobile types declare it as a string
  union. The orders list already maps via `ORDER_STATUS_VALUES`; the
  read-side mapping is the next thing to tighten.
