# Next Iterations

> **Status note (2026-05-17, end of day):** P0 #2–#5, the entire P1 batch
> (#6–#11), P2 #12–#14 + #16 partial, and P3 #18, #19 are landed.
> Closed backend gaps: **1, 2, 3, 5, 6, 7, 8, 11, 13** (9 of 13). Still open:
> Gap 4 (Redis-backed logout blocklist), Gap 9 (pagination), Gap 10 (order
> line items), Gap 12 (idempotency — Redis dep). User decision: skip
> offline sync (mobile #17) and order line items (Gap 10) — too costly for
> the remaining value. Push fan-out worker (mobile #16, real Expo push send)
> is the next obvious mobile-side enhancement now that the device-token
> table is in place.

Ordered backlog for the next implementation pass. Each item lists the work, the files it touches, the backend dependency (if any), and a rough effort tag (**S** ≤ ½ day, **M** 1–2 days, **L** > 2 days).

Items are grouped by priority. Within a group, do them top-to-bottom — later items often depend on earlier ones.

> Cross-references:
> - Backend blockers → [`docs/ARCHITECTURE_GAPS.md`](./docs/ARCHITECTURE_GAPS.md)
> - Feature scope → [`docs/FEATURE_MATRIX.md`](./docs/FEATURE_MATRIX.md)
> - Endpoint coverage → [`VERIFICATION_CHECKLIST.md`](./VERIFICATION_CHECKLIST.md)
> - Future-design sketches → [`docs/ARCHITECTURE_FUTURE.md`](./docs/ARCHITECTURE_FUTURE.md)

---

## P0 — Finish the spine of the “Built” features

These are wired this pass but still rough. Closing them first means the app demos cleanly before any new feature is added.

### 1. Manual end-to-end verification against the live backend (**S**)
- Bring up the stack: `cd ../../erp-inventory/Inventory-Supply-Management && docker compose up -d`.
- Walk through every row marked **Built** in [`VERIFICATION_CHECKLIST.md`](./VERIFICATION_CHECKLIST.md) and tick the boxes.
- Record any 4xx/5xx in a scratchpad — they become bug rows below.
- **No code changes expected.** If something fails, file it as a new P0 item.

### 2. Auth: surface backend error messages on login/register (**S**)
- Today `lib/http/formatApiError.ts` already extracts the message, but `app/(auth)/login.tsx` and `app/(auth)/register.tsx` show a generic toast. Show the formatted message inline under the form.
- Add a Jest snapshot for the “invalid credentials” path.

### 3. Orders: wire status transitions to the spec flow (**S**)
- Backend status enum: `Requested → Approved → Delivered → Closed`.
- `app/(tabs)/orders/index.tsx` currently exposes the next status as a single button. Replace with a status-aware action set so a `Closed` order shows no action and a `Requested` order does not skip straight to `Delivered`.
- Add a row to `__tests__/` covering the allowed transitions.

### 4. Inventory: empty state + pull-to-refresh (**S**)
- `app/(tabs)/stock/index.tsx` shows a spinner forever when the warehouse has no stock. Add an empty state with a CTA to “Add stock”.
- Add `RefreshControl` so the user can re-pull the React Query cache.

### 5. Notifications: polling fallback when WS is down (**M**)
- `hooks/realtime/useNotifications.ts` reconnects forever if the WS port (9091) is unreachable. After 3 failed attempts, fall back to `notificationsApi.getUnread` on a 30 s interval and surface a small badge (“Posodobitve vsakih 30 s”) in the screen header.
- Reset to WS when connectivity returns.
- Background dependency: depends on **Gap 7** for a long-term fix, but the fallback unblocks usable behaviour today.

---

## P1 — Promote the “Shell” screens to working features

Each item turns a placeholder into a usable screen. They are independent — pick by user value.

### 6. Products: list + detail + MANAGER create/edit/delete (**M**)
- Screens already scaffolded under `app/(tabs)/more/products/`.
- Wire `productsApi.getAll`, `getById`, `create`, `update`, `delete`. Gate the mutation buttons with `<RoleGate feature="PRODUCTS_WRITE">`.
- Add a category picker on create/edit (reuses `productsApi.getAllCategories`).
- React-query keys live in `constants/queryKeys.ts` — invalidate `['products']` after each mutation.

### 7. Warehouses: detail + MANAGER CRUD (**M**)
- The list and dashboard KPI are Built; the detail screen still 404s.
- Add `app/(tabs)/more/warehouses/[id].tsx` consuming `warehousesApi.getById`.
- MANAGER create/edit/delete forms — capacity is a number input with min 0.

### 8. Fleet: drivers and vehicles CRUD (**M**)
- Screens scaffolded under `app/(tabs)/more/fleet/`.
- Two read-only tabs (drivers, vehicles) + MANAGER-only create/edit/delete sheets.
- Driver form needs a vehicle picker that calls `fleetApi.getAllVehicles`.

### 9. Companies: read + MANAGER CRUD (**S**)
- Smallest of the shell features. Mirrors warehouses CRUD.
- After this lands, the **More** tab is fully populated.

### 10. Barcode scanner: client-side SKU lookup as interim (**M**)
- Without **Gap 5** resolved, fetch `productsApi.getAll` once and resolve the scanned code by walking the result.
- Cache the product list under React Query key `['products', 'all']` with `staleTime: 5 * 60_000`.
- When Gap 5 is closed, swap the resolver for `productsApi.getBySku(code)` — single call-site change in `lib/scanner/resolveScannedCode.ts`.

### 11. AI screen: structured placeholder (**S**)
- Pending **Gap 6**.
- Replace the spinner with an explanatory card: what this screen will do, why it is disabled today, and a “Učeno” acknowledgement button.
- Keep `lib/ai/aiClient.ts` so the wiring stays trivial once the endpoint exists.

---

## P2 — Cross-cutting hardening

These improve everything but ship no new screen on their own.

### 12. Token refresh / silent re-login (**M, blocked by Gap 1**)
- Today: a 401 wipes the auth store and bounces to login.
- When `POST /auth/refresh` lands, change `lib/http/client.ts` interceptor to attempt a refresh once before clearing auth.
- Persist the refresh token via `expo-secure-store` (not AsyncStorage — see `docs/ARCHITECTURE_FUTURE.md §Auth`).

### 13. WebSocket authentication (**S after Gap 8 fix**)
- `lib/realtime/wsClient.ts` already accepts an optional `token` parameter and passes it as `?token=<jwt>`.
- When the backend validates it, flip the call site in `hooks/realtime/useNotifications.ts` to pass the JWT from `authStore`.

### 14. ADMIN + DRIVER roles (**M, blocked by Gap 2**)
- `constants/roles.ts` already maps the four roles; today both unknown roles collapse to `WORKER`.
- When the backend ships them: remove the collapse in `resolveRole()`, add `<RoleGate feature="ADMIN_…">` checks where relevant, and add a driver-only landing tab.
- Update `__tests__/roles.test.ts`.

### 15. List pagination (**M, blocked by Gap 9**)
- When backend list endpoints accept `?page=&size=`, swap `useQuery` for `useInfiniteQuery` in `app/(tabs)/orders/index.tsx`, `app/(tabs)/stock/index.tsx`, `app/(tabs)/more/products/index.tsx`.
- Shared helper in `lib/http/paginated.ts`.

### 16. Push notifications (**L**)
- Wire `expo-notifications`, register the device token, and `POST` it to a future backend endpoint (does not exist yet — add to `docs/ARCHITECTURE_GAPS.md` if work starts).
- Wake the in-app notification cache on receipt.

### 17. Offline write queue (**L, blocked by Gap 12**)
- Design captured in `docs/ARCHITECTURE_FUTURE.md §Offline sync`.
- Requires backend `Idempotency-Key` support on `POST /stock`, `POST /orders`, `POST /warehouses`.
- Until then, mutations remain disabled when `OfflineBanner` is visible (current behaviour).

---

## P3 — Polish and DX

### 18. Locale switch scaffolding (**S**)
- `constants/i18n.ts` currently exports a flat Slovenian map. Convert to `{ sl: {...} }` and add `getString(key, locale)`. Locale source: `expo-localization`.
- No second locale shipped yet — the change is purely structural so a future EN/HR locale is a single-file add.

### 19. Error boundary + Sentry-style crash capture (**S**)
- Add a top-level `<ErrorBoundary>` in `app/_layout.tsx` that renders a recovery screen.
- Wire `expo-application` + `expo-device` so the screen shows app version + device for support copy-paste. No external SDK yet.

### 20. CI: type-check + test on PR (**S**)
- Add `.github/workflows/mobile-ci.yml` that runs `npm ci`, `npx tsc --noEmit`, `npm test`, `npm run lint` against the `pocket-logistics-pro-expo` directory.
- The repo is currently not a git repo (per the environment check) — defer until the umbrella project is initialised.

### 21. Storybook-lite for `components/` (**M, optional**)
- A single `app/(dev)/components.tsx` route that renders every shared component (RoleGate, OfflineBanner, EmptyState…) with toggleable props.
- Dev-only — gate behind `__DEV__`.

---

## Backend asks (in priority order)

For the backend team. Each item closes a documented gap and unblocks one or more rows above.

1. **Gap 1** — `POST /auth/refresh` implementation → unblocks #12.
2. **Gap 5** — `GET /products/by-sku?sku=…` → unblocks the proper version of #10.
3. **Gap 8** — JWT validation on the WS upgrade → unblocks #13 and removes a HIGH-severity data leak.
4. **Gap 2** — ADMIN + DRIVER roles → unblocks #14.
5. **Gap 11** — `GET /orders/{id}` → unblocks a real order-detail screen (currently scaffolded via list lookup).
6. **Gap 9** — Pagination/filter query params → unblocks #15.
7. **Gap 12** — `Idempotency-Key` support on POST endpoints → unblocks #17.
8. **Gap 6** — AI service + `/ai/*` routes → unblocks the real #11.
9. **Gap 13** — `minQuantity` / `maxQuantity` on `InventoryResponse` → enables data-driven low-stock UI.
10. **Gap 10** — Order line items → enables a multi-product create-order flow.

---

## How to pick the next item

- If you have ≤ ½ day: take the next unchecked **S** from P0 or P1.
- If you have a fresh day: take an **M** from P1 — it ships a visible feature.
- If the backend just shipped a gap fix: jump to the corresponding P2 row immediately while the change is fresh.
- Avoid starting a P2 item that depends on an open gap unless the backend timeline is committed.
