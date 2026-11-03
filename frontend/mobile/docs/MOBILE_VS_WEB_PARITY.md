# Mobile vs Web Parity — Pocket Logistics Pro

Comparing each web screen / micro-frontend route to its planned mobile counterpart.

Web sources: `web-app/inventory-system-frontend` navigation (Dashboard, Warehouses, Products, Stock, Orders, Companies, Vehicles, Drivers, Settings) and micro-frontends: `auth-mf`, `warehouses-mf`, `inventory-mf`, `orders-mf`, `companies-mf`, `fleet-mf`, `products-mf`, `shell`.

---

## Screen-by-Screen Comparison

| Web route / MF | Web feature | Mobile screen | Status | Notes |
|---------------|-------------|---------------|--------|-------|
| `/login` (auth-mf) | Email + password login | `/(auth)/login.tsx` | **Planned this pass** | Mobile uses Bearer header; web uses HttpOnly cookie |
| `/register` (auth-mf) | Name, email, password, role registration | `/(auth)/register.tsx` | **Planned this pass** | Role field is a picker: MANAGER \| WORKER |
| `/ (Dashboard)` | KPIs: total warehouses, total companies, order stats, low-stock alerts, recent notifications | `/(tabs)/index.tsx` | **Planned this pass** | Mobile fetches same endpoints; uses card layout; notification feed replaces sidebar |
| `/warehouses` (warehouses-mf) | Warehouse list table + CRUD modal | `/(tabs)/more/warehouses/index.tsx` | **Planned this pass** | Moved to "Več" tab; list view with capacity bar |
| `/warehouses/:id` | Warehouse detail + inventory for warehouse | `/(tabs)/more/warehouses/[id].tsx` | **Planned this pass** | Taps through to stock filtered by this warehouse |
| `/stock` or `/inventory` (inventory-mf) | Stock list filtered by warehouse; add-stock form | `/(tabs)/stock/index.tsx` | **Planned this pass** | Core tab; warehouse picker at top; add-stock FAB |
| `/stock/:warehouseId` | Stock for specific warehouse | `/(tabs)/stock/[warehouseId].tsx` | **Planned this pass** | Navigated to from warehouse detail |
| `/orders` (orders-mf) | Orders list table; status filter; create order modal; upload document | `/(tabs)/orders/index.tsx` | **Planned this pass** | List with status badges; status update via long-press or swipe action |
| `/orders/create` | Create order form (product, company, warehouse, driver, quantity, delivery date) | `/(tabs)/orders/create.tsx` | **Planned this pass** | Same fields; each is a searchable picker; no line items (Gap 10) |
| `/orders/:id` | Order detail | No dedicated screen this pass | **Planned future** | Backend has no GET /orders/:id (Gap 11); show detail from list cache |
| `/products` (products-mf) | Products table + CRUD; filter by category | `/(tabs)/more/products/index.tsx` | **Planned this pass (shell)** | MANAGER-only write; list + category filter; no barcode until Gap 5 resolved |
| `/products/:id` | Product detail | `/(tabs)/more/products/[id].tsx` | **Planned future** | Basic detail screen |
| `/categories` | Category list + CRUD | `/(tabs)/more/products/categories.tsx` | **Planned this pass (shell)** | Nested under Products in More menu |
| `/companies` (companies-mf) | Companies list + CRUD | `/(tabs)/more/companies/index.tsx` | **Planned this pass (shell)** | MANAGER-only write; picker used in order create |
| `/vehicles` (fleet-mf) | Vehicles list + CRUD | `/(tabs)/more/fleet/vehicles.tsx` | **Planned this pass (shell)** | MANAGER-only write |
| `/drivers` (fleet-mf) | Drivers list + CRUD; assign vehicle | `/(tabs)/more/fleet/drivers.tsx` | **Planned this pass (shell)** | MANAGER-only write; driver picker used in order create |
| `/notifications` (web panel) | Notification history; mark read; real-time badge | `/(tabs)/notifications.tsx` | **Planned this pass** | WS + polling fallback; badge on tab icon for unread count |
| `/settings` | Theme toggle, user profile, logout | `/(tabs)/more/profile.tsx` | **Planned this pass** | Profile card + logout; theme stored in AsyncStorage |
| *(not on web)* | Barcode scanner | `/(tabs)/more/scanner.tsx` (or accessible via FAB) | **Shell this pass** | Camera permission + scan UI; "pending backend" state until Gap 5 resolved |
| *(not on web)* | AI analysis | `/(tabs)/more/ai.tsx` | **Shell this pass** | "AI analiza ni na voljo" placeholder; MANAGER-gated; wired to `/ai/inventory-summary` |
| *(not on web)* | Offline sync status | Component in `/(tabs)/stock` + `/(tabs)/orders` | **Shell this pass** | Offline banner in list screens; no actual write queue yet |

---

## Screens Skipped and Why

| Web screen | Reason skipped |
|-----------|----------------|
| Company totals dashboard widget | Low priority on mobile; Dashboard KPI card covers summary |
| Warehouse total GET /warehouses/total | Included in Dashboard KPI |
| Document upload from order | Upload screen requires multipart form + file picker; out of scope this pass |
| Order line items | Backend does not support multiple products per order (Gap 10); single product used instead |

---

## Navigation Architecture Comparison

```
Web (micro-frontend shell):          Mobile (expo-router):
────────────────────────────         ────────────────────────────────
Top-nav tabs:                        Bottom tabs (5):
  Dashboard                            1. Domov (Dashboard)
  Warehouses                           2. Zaloga (Stock)
  Products                             3. Naročila (Orders)
  Stock                                4. Obvestila (Notifications)
  Orders                               5. Več → Products, Warehouses,
  Companies                                     Fleet, Companies,
  Vehicles                                       AI, Profile
  Drivers
  Settings
```

Mobile collapses 8 web nav items into 5 tabs by grouping admin/management screens under "Več"
(More), which surfaces frequently-needed operational screens (stock + orders) as primary tabs.
