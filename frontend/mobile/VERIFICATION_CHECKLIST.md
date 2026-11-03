# Verification Checklist

One row per endpoint the mobile app calls. Use this to smoke-test every wired call once the backend stack is up (`docker compose up -d` in `Inventory-Supply-Management`). Tick the **Verified** column after a manual or automated check.

**Base URL:** mobile-gateway on port `8090` (see `lib/http/client.ts` for per-platform defaults).
**Path rewrites:** `mobile-gateway` rewrites `/stock/* → /inventory/*` and `/warehouses/summary → /warehouses/total` before forwarding to the upstream service.

Legend
- **Status — Built** = wired and exercised in a UI flow this pass.
- **Status — Shell** = client method exists, but the screen consuming it is a placeholder / pending feature.
- **Status — Gap** = endpoint does not exist on the backend yet — see `docs/ARCHITECTURE_GAPS.md`.

---

## Auth

| # | Method | Path (as seen by mobile) | Upstream service | Required role | Consumed by | Status | Verified |
|---|--------|--------------------------|------------------|---------------|-------------|--------|----------|
| 1 | POST   | `/auth/login`            | auth-service     | public        | `lib/api/auth.ts → authApi.login`, `app/(auth)/login.tsx`         | Built | ☐ |
| 2 | POST   | `/auth/register`         | auth-service     | public        | `lib/api/auth.ts → authApi.register`, `app/(auth)/register.tsx`   | Built | ☐ |
| 3 | POST   | `/auth/logout`           | auth-service     | authenticated | `lib/api/auth.ts → authApi.logout`, `app/(tabs)/more/profile.tsx` | Built | ☐ |
| — | POST   | `/auth/refresh`          | auth-service     | authenticated | not called — see Gap 1                                            | Gap   | n/a |

## Products & Categories

| # | Method | Path                          | Upstream service | Required role  | Consumed by                                                | Status | Verified |
|---|--------|-------------------------------|------------------|----------------|-----------------------------------------------------------|--------|----------|
| 4 | GET    | `/products`                   | product-service  | authenticated  | `productsApi.getAll`, `app/(tabs)/more/products/index.tsx` | Shell | ☐ |
| 5 | GET    | `/products/{id}`              | product-service  | authenticated  | `productsApi.getById`                                      | Shell | ☐ |
| 6 | POST   | `/products`                   | product-service  | MANAGER        | `productsApi.create`                                       | Shell | ☐ |
| 7 | PUT    | `/products/{id}`              | product-service  | MANAGER        | `productsApi.update`                                       | Shell | ☐ |
| 8 | DELETE | `/products/{id}`              | product-service  | MANAGER        | `productsApi.delete`                                       | Shell | ☐ |
| 9 | GET    | `/categories`                 | product-service  | authenticated  | `productsApi.getAllCategories`                             | Shell | ☐ |
|10 | POST   | `/categories`                 | product-service  | MANAGER        | `productsApi.createCategory`                               | Shell | ☐ |
| — | GET    | `/products/by-sku?sku={sku}`  | product-service  | authenticated  | scanner (`useBarcode`) wants this — see Gap 5              | Gap   | n/a |

## Warehouses

| # | Method | Path                   | Upstream service | Required role | Consumed by                                                | Status | Verified |
|---|--------|------------------------|------------------|---------------|-----------------------------------------------------------|--------|----------|
|11 | GET    | `/warehouses`          | warehouse-service| authenticated | `warehousesApi.getAll`, `app/(tabs)/more/warehouses/index.tsx` | Built  | ☐ |
|12 | GET    | `/warehouses/{id}`     | warehouse-service| authenticated | `warehousesApi.getById`                                    | Shell  | ☐ |
|13 | GET    | `/warehouses/summary`  | warehouse-service| authenticated | `warehousesApi.getSummary`, dashboard KPI                  | Built  | ☐ |
|14 | POST   | `/warehouses`          | warehouse-service| MANAGER       | `warehousesApi.create`                                     | Shell  | ☐ |
|15 | PUT    | `/warehouses/{id}`     | warehouse-service| MANAGER       | `warehousesApi.update`                                     | Shell  | ☐ |
|16 | DELETE | `/warehouses/{id}`     | warehouse-service| MANAGER       | `warehousesApi.delete`                                     | Shell  | ☐ |

## Inventory / Stock

| # | Method | Path                       | Upstream service   | Required role | Consumed by                                                  | Status | Verified |
|---|--------|----------------------------|--------------------|---------------|-------------------------------------------------------------|--------|----------|
|17 | GET    | `/stock`                   | inventory-service  | authenticated | `inventoryApi.getAll`, `app/(tabs)/stock/index.tsx`          | Built  | ☐ |
|18 | GET    | `/stock/{warehouseId}`     | inventory-service  | authenticated | `inventoryApi.getByWarehouse`                                | Built  | ☐ |
|19 | POST   | `/stock`                   | inventory-service  | authenticated | `inventoryApi.addStock`, `app/(tabs)/stock/add.tsx`          | Built  | ☐ |

## Orders

| # | Method | Path                         | Upstream service | Required role | Consumed by                                                          | Status | Verified |
|---|--------|------------------------------|------------------|---------------|---------------------------------------------------------------------|--------|----------|
|20 | GET    | `/orders`                    | order-service    | authenticated | `ordersApi.getAll`, `app/(tabs)/orders/index.tsx`                    | Built  | ☐ |
|21 | POST   | `/orders`                    | order-service    | authenticated | `ordersApi.create`, `app/(tabs)/orders/create.tsx`                   | Built  | ☐ |
|22 | PUT    | `/orders/{id}/status`        | order-service    | authenticated | `ordersApi.updateStatus`, `app/(tabs)/orders/index.tsx`              | Built  | ☐ |
| — | GET    | `/orders/{id}`               | order-service    | authenticated | not called — see Gap 11                                              | Gap   | n/a |

## Notifications

| # | Method | Path                              | Upstream service        | Required role | Consumed by                                                          | Status | Verified |
|---|--------|-----------------------------------|-------------------------|---------------|---------------------------------------------------------------------|--------|----------|
|23 | GET    | `/notifications`                  | notification-service    | authenticated | `notificationsApi.getAll`, `app/(tabs)/notifications.tsx`            | Built  | ☐ |
|24 | GET    | `/notifications/unread`           | notification-service    | authenticated | `notificationsApi.getUnread`, tab badge in `(tabs)/_layout.tsx`      | Built  | ☐ |
|25 | PATCH  | `/notifications/{id}/read`        | notification-service    | authenticated | `notificationsApi.markAsRead`                                        | Built  | ☐ |
|26 | PATCH  | `/notifications/read-all`         | notification-service    | authenticated | `notificationsApi.markAllAsRead`                                     | Built  | ☐ |
|27 | WS     | `ws://host:9091`                  | notification-service WS | unauthenticated (Gap 8) | `lib/realtime/wsClient.ts`, `hooks/realtime/useNotifications.ts` | Shell | ☐ |

## Fleet

| # | Method | Path                  | Upstream service | Required role | Consumed by                                          | Status | Verified |
|---|--------|-----------------------|------------------|---------------|-----------------------------------------------------|--------|----------|
|28 | GET    | `/drivers`            | fleet-service    | authenticated | `fleetApi.getAllDrivers`, `app/(tabs)/more/fleet/index.tsx` | Shell  | ☐ |
|29 | GET    | `/drivers/{id}`       | fleet-service    | authenticated | `fleetApi.getDriverById`                             | Shell  | ☐ |
|30 | POST   | `/drivers`            | fleet-service    | MANAGER       | `fleetApi.createDriver`                              | Shell  | ☐ |
|31 | PUT    | `/drivers/{id}`       | fleet-service    | MANAGER       | `fleetApi.updateDriver`                              | Shell  | ☐ |
|32 | DELETE | `/drivers/{id}`       | fleet-service    | MANAGER       | `fleetApi.deleteDriver`                              | Shell  | ☐ |
|33 | GET    | `/vehicles`           | fleet-service    | authenticated | `fleetApi.getAllVehicles`                            | Shell  | ☐ |
|34 | GET    | `/vehicles/{id}`      | fleet-service    | authenticated | `fleetApi.getVehicleById`                            | Shell  | ☐ |
|35 | POST   | `/vehicles`           | fleet-service    | MANAGER       | `fleetApi.createVehicle`                             | Shell  | ☐ |
|36 | PUT    | `/vehicles/{id}`      | fleet-service    | MANAGER       | `fleetApi.updateVehicle`                             | Shell  | ☐ |
|37 | DELETE | `/vehicles/{id}`      | fleet-service    | MANAGER       | `fleetApi.deleteVehicle`                             | Shell  | ☐ |

## Companies

| # | Method | Path                  | Upstream service  | Required role | Consumed by                                                          | Status | Verified |
|---|--------|-----------------------|-------------------|---------------|---------------------------------------------------------------------|--------|----------|
|38 | GET    | `/companies`          | company-service   | authenticated | `companiesApi.getAll`, `app/(tabs)/more/companies/index.tsx`         | Shell  | ☐ |
|39 | GET    | `/companies/{id}`     | company-service   | authenticated | `companiesApi.getById`                                               | Shell  | ☐ |
|40 | POST   | `/companies`          | company-service   | MANAGER       | `companiesApi.create`                                                | Shell  | ☐ |
|41 | PUT    | `/companies/{id}`     | company-service   | MANAGER       | `companiesApi.update`                                                | Shell  | ☐ |
|42 | DELETE | `/companies/{id}`     | company-service   | MANAGER       | `companiesApi.delete`                                                | Shell  | ☐ |

## AI

| # | Method | Path                       | Upstream service | Required role | Consumed by                                          | Status | Verified |
|---|--------|----------------------------|------------------|---------------|-----------------------------------------------------|--------|----------|
|43 | GET    | `/ai/inventory-summary`    | (none — Gap 6)   | n/a           | `aiClient.getInventorySummary`, `app/(tabs)/more/ai.tsx` | Gap   | n/a |

---

## How to verify a row

1. Ensure the backend stack is up (`docker compose ps` shows all services healthy).
2. Run the app on a simulator/device and reach the consuming screen.
3. Confirm the UI populates, then check the request in Expo dev tools network tab.
4. For mutations, confirm the resource was created/updated by re-reading the list.
5. Tick the box.

## How to add a new endpoint

1. Add the wrapper method to the matching file under `lib/api/`.
2. Add a row to this checklist with status `Built` or `Shell`.
3. If the endpoint is missing from the backend, instead add it to `docs/ARCHITECTURE_GAPS.md` and mark `Gap`.
