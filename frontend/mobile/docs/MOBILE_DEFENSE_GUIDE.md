# Mobile App — Defense / Study Guide

A complete explanation of the `/mobile` Expo application: what it is, how it is
built, every architectural layer, the flagship features, the design decisions
behind them, and the questions an examiner is likely to ask (with answers).

Read this top to bottom once. After that you should be able to open any file in
`/mobile` and explain *what it does* and *why it is written that way*.

---

## 1. Elevator pitch — what the app is

A cross-platform **inventory & supply-management** mobile client built with
**Expo / React Native**. It is the phone-facing front end of a larger system:

- A **monorepo** holds this mobile app, several web micro-frontends, and shared
  TypeScript packages.
- A **separate backend repo** runs a set of microservices (Java/Spring, C#/.NET,
  Node/TS) behind a single **mobile-gateway**.
- The mobile app talks to **only one host** — the mobile-gateway — for both REST
  and WebSocket traffic. It never addresses individual services directly.

The app lets warehouse staff and managers: view stock, consume stock, create and
advance orders, receive live low-stock / order notifications, manage products,
warehouses, fleet and companies, scan QR codes to register products, and request
AI inventory analysis. Everything is bilingual (**Slovenian / English**) and
works degraded-but-usable when offline.

**One-sentence version for the panel:** *"It's an Expo React Native client for an
inventory system; it uses file-based routing, React Query for server state,
Zustand for auth/locale, talks to a single API gateway with JWT auth and a
refresh-on-401 interceptor, gets live updates over a self-healing WebSocket, and
is fully localized through a live i18n proxy."*

---

## 2. Technology stack (and the "why" for each)

| Concern | Choice | Why this one |
|---|---|---|
| Framework | **Expo SDK 54 / React Native 0.81 / React 19** | Managed workflow, runs in Expo Go (no native build needed for dev), OTA-friendly. |
| Routing | **expo-router 6** (file-based) | Routes are files; nested layouts map to nested navigators. No central route table to maintain. |
| Server state | **@tanstack/react-query 5** | Caching, background refetch, retries, and an in-memory cache that doubles as the offline read layer. |
| Client state | **Zustand 5** + `persist` | Tiny, hook-based global store. Persists auth + locale to `AsyncStorage`. |
| HTTP | **axios** | Interceptors give one place for auth headers and 401→refresh logic. |
| Forms | **react-hook-form + zod** (`@hookform/resolvers`) | Uncontrolled inputs (fast) + schema validation with typed errors. |
| i18n | shared **@erp/i18n** package + a live **Proxy** | One message table per locale, switched at runtime without prop-drilling. |
| Realtime | native **WebSocket** wrapped in a reconnecting client | Live notifications; falls back to polling on failure. |
| Camera / scan | **expo-camera** `CameraView` | QR/barcode scanning that works in Expo Go. |
| Dates | **@react-native-community/datetimepicker** | Native date pickers; Expo Go compatible. |
| Files | **expo-document-picker** | Pick PDFs for order close / stock consumption proof. |
| Connectivity | **@react-native-community/netinfo** | Drives the offline banner and write-blocking. |
| Push | **expo-notifications** | Best-effort push token registration. |
| Testing | **jest-expo + @testing-library/react-native** | Unit tests for pure logic + a component test. |

> **Defense tip:** if asked "why React Query *and* Zustand?", the crisp answer is:
> **server state** (data that lives on the backend, can go stale, must be cached &
> refetched) is React Query's job; **client state** (the JWT, the chosen language —
> things the server doesn't own) is Zustand's job. Mixing them is a common mistake;
> keeping them separate is the design.

---

## 3. High-level architecture & request flow

```
┌─────────────────────────────────────────────────────────┐
│                    Expo / React Native app                │
│                                                           │
│  Screens (expo-router)                                    │
│      │ read/write                                         │
│      ▼                                                    │
│  React Query  ◄── cache / refetch / offline reads         │
│      │ queryFn calls                                      │
│      ▼                                                    │
│  lib/api/*.ts  (typed API modules)                        │
│      │ uses                                               │
│      ▼                                                    │
│  axiosClient ── request: attach Bearer token              │
│              └─ response: 401 → refresh once → retry      │
│      │ Zustand authStore supplies the token               │
│      ▼                                                    │
│  WebSocket (ReconnectingWsClient) ── live notifications   │
└───────────────────────────┬───────────────────────────────┘
                            │ HTTP + WS  (one host)
                            ▼
                   mobile-gateway  (:8090)
                  /products /orders /ws  …
                            │ proxies + stamps X-User-* headers
                            ▼
        microservices (auth, product, order, warehouse,
        inventory, fleet, company, notification, ai)
```

**Walk the data path out loud (a classic defense question):**
1. A screen mounts and calls `useQuery({ queryKey, queryFn })`.
2. The `queryFn` is a function in `lib/api/*.ts` that calls `axiosClient`.
3. The **request interceptor** attaches `Authorization: Bearer <token>` from the
   Zustand auth store (`lib/http/client.ts:38`).
4. The request hits the **mobile-gateway**, which validates the JWT, stamps
   `X-User-Id/Email/Role` headers, and proxies to the right microservice.
5. The response comes back; React Query caches it under the `queryKey`.
6. If the token had expired, the **response interceptor** catches the `401`,
   exchanges the refresh token once, retries the original request, and the user
   never notices (`lib/http/client.ts:81`).

---

## 4. Folder structure (the map)

```
mobile/
├─ app/                       # expo-router routes (file = screen, _layout = navigator)
│  ├─ _layout.tsx             # ROOT: providers, auth guard, offline banner, locale remount
│  ├─ (auth)/                 # login + register (route group, no URL segment)
│  └─ (tabs)/                 # the 5-tab shell after login
│     ├─ _layout.tsx          # bottom tabs + WS + push + unread badge
│     ├─ index.tsx            # Home / Domov dashboard
│     ├─ stock/               # stock list + consume
│     ├─ orders/              # list + detail + create
│     ├─ notifications.tsx    # live notification list
│     └─ more/                # products, categories, warehouses, fleet,
│                             # companies, scanner, ai, profile
├─ components/                # reusable UI (forms, ui/, ErrorBoundary, RoleGate…)
├─ hooks/                     # useHasFeature, useRole, useOfflineState, realtime, push
├─ lib/
│  ├─ http/                   # axios client + error formatting
│  ├─ api/                    # one typed module per backend resource
│  ├─ realtime/               # ReconnectingWsClient
│  ├─ scanner/                # barcode hook + QR payload parser
│  ├─ ai/                     # ai-service client
│  └─ i18n/                   # locale store + hooks
├─ stores/                    # zustand: authStore, toastStore
├─ constants/                 # i18n proxy, colors, warehouse options
└─ __tests__/                 # jest tests
```

> **Key idea to state:** there is **no `App.tsx` router config**. With expo-router,
> the *folder structure is the navigation graph*. A `_layout.tsx` defines a
> navigator (Stack or Tabs); the files beside it are its screens. Parentheses like
> `(auth)` and `(tabs)` are **route groups** — they organize files without adding a
> URL segment. Brackets like `[id].tsx` are **dynamic routes**.

### The shared packages (monorepo)

The app imports three framework-agnostic packages so the same logic is shared
with the web micro-frontends:

- **`@erp/domain`** — runtime domain logic: the role/feature matrix
  (`hasFeature`), the order-status state machine (`nextStatus`, status↔number
  maps), and the `queryKeys` factory (single source of truth for cache keys).
- **`@erp/api-types`** — **types only** (no runtime code). Request/response DTOs.
- **`@erp/i18n`** — the message tables (`sl`, `en`) and `getStrings(locale)`.

> **Why share these?** The role matrix and order-status rules must be *identical*
> on web and mobile; duplicating them invites drift. Putting them in a typed
> package means a change is made once and the type checker enforces both clients.

---

## 5. App bootstrap & routing — `app/_layout.tsx`

The root layout (`app/_layout.tsx`) is the single composition root. It:

1. **Creates the React Query client** once, with sensible defaults
   (`staleTime: 60s`, `gcTime: 5min`, `retry: 1`). The 5-minute `gcTime` is what
   makes cached data available for **offline reads** (`_layout.tsx:13`).
2. Wraps the tree in providers: `ErrorBoundary` → `SafeAreaProvider` →
   `QueryClientProvider`.
3. Renders **`AuthGuard`** — a headless component that redirects based on auth
   state.
4. Renders the **`OfflineBanner`** above the navigator and the **`ToastHost`**
   below it (so toasts float over everything).
5. **Remounts the navigator on locale change** via `key={locale}` (see §10).

### AuthGuard — the redirect logic

```tsx
// app/_layout.tsx:23
function AuthGuard(): null {
  const token   = useAuthStore((s) => s.token);
  const isReady = useAuthStore((s) => s.isReady);   // hydration finished?
  const segments = useSegments();                   // current route segments
  useEffect(() => {
    if (!isReady) return;                            // wait for AsyncStorage rehydrate
    const inAuth = segments[0] === '(auth)';
    if (!token && !inAuth)  router.replace('/(auth)/login');  // protect app
    else if (token && inAuth) router.replace('/(tabs)');       // skip login if logged in
  }, [token, isReady, segments, router]);
  return null;
}
```

**Why `isReady`?** Zustand's `persist` rehydrates the token from `AsyncStorage`
asynchronously. Without the guard, the first render has `token === null` and would
bounce a logged-in user to the login screen for a frame. `isReady` (set after the
first effect) gates the redirect until hydration is done.

> **Defense Q:** *"How do you protect routes?"* — There's no per-screen guard;
> a single `AuthGuard` at the root watches the token and the current route group.
> No token + not in `(auth)` → go to login. Has token + in `(auth)` → go to the
> tabs. It's centralized and impossible to forget on a new screen.

### The tab shell — `app/(tabs)/_layout.tsx`

Defines the 5 bottom tabs (Home, Stock, Orders, Notifications, More). Crucially it
also **starts app-wide background work for the lifetime of the logged-in shell**:

- `useNotificationsSocket()` — opens the WebSocket and wires cache invalidation.
- `usePushRegistration()` — best-effort Expo push token registration.
- An `UnreadBadge` query polls unread notifications every 30s and shows a count on
  the Notifications tab (`(tabs)/_layout.tsx:11`).

---

## 6. Client state — Zustand stores

### `stores/authStore.ts`

Holds `token`, `refreshToken`, `user`, `role`, and `isReady`. Wrapped in
`persist` with `AsyncStorage`. `partialize` persists only the tokens/user/role —
**not** `isReady` (which must start `false` every boot).

Two things worth pointing out in defense:

- **`role` is a top-level field**, not nested on `user`. The raw JWT role string is
  normalized through `resolveRole()` (from `@erp/domain`) on `setAuth`, so the rest
  of the app only ever sees one of `ADMIN | MANAGER | WORKER | DRIVER`.
- **`setAccessToken`** exists separately so the refresh flow can swap *only* the
  access token without disturbing the refresh token or user.

### `stores/toastStore.ts`

A tiny global so any non-React code (API layers, mutations) can fire a toast via
`showToast(message, type)`. The `ToastHost` component subscribes and renders it.

> **Defense Q:** *"Why Zustand over Context?"* — Context re-renders every consumer
> on any change and needs a provider wrapper per slice. Zustand is a hook with
> selector-based subscriptions (`useAuthStore(s => s.token)` only re-renders when
> `token` changes), has no provider, and gives `getState()` for use *outside* React
> (the axios interceptor reads the token that way).

---

## 7. Server state — React Query

Every piece of backend data is a query or mutation. The rules of the codebase:

- **Cache keys come from `@erp/domain`'s `queryKeys` factory** — never inline
  arrays. This guarantees that an invalidation in one place hits the exact cache a
  screen reads. e.g. `queryKeys.orders`, `queryKeys.orderDetail(id)`,
  `queryKeys.stockAll`.
- **Reads** use `useQuery`; **writes** use `useMutation` and then
  `queryClient.invalidateQueries({ queryKey })` in `onSuccess` to refetch.
- **Offline reads**: because `gcTime` is 5 minutes, recently-viewed lists/details
  remain in cache and render even with no network.

> **Defense Q:** *"How does data refresh after I create something?"* — The mutation's
> `onSuccess` invalidates the relevant query key; React Query refetches it in the
> background and the list updates. No manual state juggling.

---

## 8. The HTTP layer — `lib/http/client.ts`

This is one of the most defense-relevant files. Three parts:

### a) Base URL resolution
```ts
const DEFAULT_HOSTS = { android: 'http://10.0.2.2:8090', ios: 'http://localhost:8090', web: 'http://localhost:8090' };
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_HOSTS[Platform.OS] ?? 'http://localhost:8090';
```
- `10.0.2.2` is the Android emulator's alias for the host machine's `localhost`.
- A real device overrides everything with `EXPO_PUBLIC_API_URL` (a tunnel URL).
- **WS URL** is derived from the same host: `ws(s)://<host>/ws` — so REST and
  WebSocket share one origin through the gateway (`client.ts:20`).

### b) Request interceptor — attach the token
Reads the current token from the Zustand store via `getState()` and sets the
`Authorization` header on every request (`client.ts:38`). Reading from the store
(not a closure) means it always uses the *latest* token, even after a refresh.

### c) Response interceptor — 401 → refresh once → retry
The clever part (`client.ts:81`):
- On a `401` from any non-`/auth/` endpoint, call `attemptRefresh()`.
- `attemptRefresh()` uses a **single in-flight promise** (`refreshInFlight`) so
  that if ten requests 401 at once, only **one** refresh call is made and all ten
  await it. This avoids a refresh stampede.
- It marks the retried request with `_retriedAfterRefresh` so a request can be
  retried **at most once** (no infinite loop).
- If refresh fails (or there's no refresh token), it `clear()`s auth; the
  `AuthGuard` then bounces to login.
- A **lazy `import()` of `@/lib/api/auth`** breaks the circular dependency
  (auth API depends on `axiosClient`, which would otherwise depend on auth API).

> **Defense Q:** *"What if two requests fail auth at the same time?"* — They share
> one refresh promise; only one network refresh happens. *"Could it loop forever?"*
> — No: the `_retriedAfterRefresh` flag caps it at one retry per request, and
> `/auth/*` calls never trigger a refresh of themselves.

### Error formatting — `lib/http/errors.ts`
`formatApiError(err)` extracts the human message from an axios error in priority
order: response body `message` → `error` → string body → network message → a
Slovenian fallback. Every mutation's `onError` runs through it so the user sees a
real message, never `[object Object]`.

---

## 9. Auth, roles & feature gating

### The flow
1. `login.tsx` posts credentials → backend returns access + refresh tokens + user.
2. `setAuth(token, user, rawRole, refreshToken)` stores them; `resolveRole`
   normalizes the role.
3. Every subsequent request carries the Bearer token (interceptor).
4. The gateway validates the JWT and injects `X-User-*` headers downstream.

### Role → feature matrix (`@erp/domain/roles.ts`)
Four roles: `ADMIN`, `MANAGER`, `WORKER`, `DRIVER`. A **feature matrix** maps each
role to a `Set<FeatureKey>` (e.g. `PRODUCTS_WRITE`, `ORDERS_STATUS_UPDATE`,
`AI_ANALYSIS`, `SCANNER`). `hasFeature(role, feature)` is a set lookup.

The UI consumes this through two thin wrappers:
- **`useHasFeature(feature)`** → boolean, for conditional rendering (e.g. the More
  menu only shows entries the role can access — `more/index.tsx:61`).
- **`RoleGate`** component → wraps a subtree and renders an "access denied" state
  if the role lacks the feature.

> **Important honesty point for the defense:** this is **client-side gating for UX**
> — it hides controls a role can't use. **Real authorization is enforced by the
> backend** (the gateway + services check the role on every call). If asked
> "isn't client-side security fake?", the correct answer is: *"Yes, the client gate
> is purely cosmetic; the gateway is the actual authority. The shared matrix just
> keeps the UI honest and avoids showing buttons that would 403."*

---

## 10. Internationalization (i18n) — the live Proxy

This is the most interview-worthy piece of the front end. Requirement: toggling
SL↔EN must instantly re-translate **every** visible string.

### How strings are accessed
Call sites write `sl.orders.title`, `sl.common.save`, etc. But `sl` is **not** a
static object — it's a **live JavaScript `Proxy`** (`constants/i18n.ts`).

```ts
// constants/i18n.ts — simplified
function currentTable() { return getStrings(useLocaleStore.getState().locale); }
function pathProxy(path) {
  return new Proxy({}, {
    get(_t, prop) {
      // walk `path` into the CURRENT locale table, then read `prop`
      // if the value is an object, return another proxy for deeper access
    },
  });
}
export const sl = pathProxy([]);  // typed as Strings
```

Each property access (`sl.orders.title`) re-resolves against
`getStrings(currentLocale)` **at read time**. So the *same* `sl.orders.title`
expression yields Slovenian or English depending on the store's current locale —
no imports change, no props thread through.

### The remount trick (`app/_layout.tsx:68`)
A live proxy alone isn't enough, because **React Navigation memoizes mounted
screens** and module-level constants freeze their proxy reads at load time. So the
root layout subscribes to the locale and puts `key={locale}` on the `<View>`
wrapping the navigator:

```tsx
const locale = useLocaleStore((s) => s.locale);
<View style={{ flex: 1 }} key={locale}>
  <Stack ... />
</View>
```

Changing `locale` changes the `key`, which **remounts the entire screen tree**,
forcing every screen and title to re-read the proxy in the new language at once.

### The module-level freeze trap (a real bug we fixed)
If you write `const MENU = [{ label: sl.products.title }]` at **module scope**, the
proxy is read **once** when the module loads and the label is frozen in whatever
language was active then. The fix (seen in `more/index.tsx:25`) is to build such
arrays **inside the component render** so the proxy is re-read every render.

> **Defense Q:** *"How does language switching work without reloading the app?"* —
> Strings are read through a Proxy that resolves to the active locale's table on
> every access; a Zustand store holds the locale; flipping it changes a `key` on the
> navigator which remounts the tree so everything re-resolves at once. *"Any
> gotcha?"* — Yes: strings captured in module-level constants freeze at import; we
> build those in render instead.

> Non-React/imperative code (axios formatters, etc.) uses `getActiveStrings()` from
> `lib/i18n/locale.ts`; React components can also use the `useStrings()` hook. `sl`
> is the back-compat shim that most screens use.

---

## 11. Feature walkthrough — screen by screen

### Home / Domov — `(tabs)/index.tsx`
A dashboard: a dark hero card with a localized date and the user's **role badge**,
a 2×2 grid of KPI cards (warehouses, active orders, low stock, unread) that are
tappable shortcuts into the relevant tab, and a recent-alerts list with an empty
state. KPI numbers come from React Query reads. Role is read from the auth store
(`useAuthStore(s => s.role)`), **not** from `user`.

### Stock — `(tabs)/stock/`
The stock model has a deliberate rule worth stating clearly:

> **Stock is never added manually in the app.** The *only* way inventory grows is
> by **closing a delivered order** (the order flow writes stock). In the app you can
> only (a) **consume** stock and (b) **edit min/max thresholds** that drive
> low/over-stock notifications.

- `stock/index.tsx` — inventory list with low-stock badges, a warehouse filter, a
  blue **Consume** FAB, and threshold editing. There is **no "Add stock"** button
  (it was removed on purpose); the empty state explains stock comes from orders.
- `stock/consume.tsx` — the consumption form (see below). The old `stock/add.tsx`
  was deleted.

**Consume flow (`stock/consume.tsx`):** pick quantities per inventory row (capped at
available — over-quantity rows turn red and block submit), enter a purpose, pick a
**date of usage** (date picker, max = today), optional description, attach a
**mandatory PDF document** plus an optional proof PDF. Submit posts a `multipart`
consume request that reduces stock and stores the record. `ready` is only true when
items are selected, none over-quantity, purpose is filled, date set, and a document
attached (`consume.tsx:79`).

### Orders — `(tabs)/orders/`
- `orders/index.tsx` — list with a status filter.
- `orders/create.tsx` — create form; the **delivery date** uses `DatePickerField`
  with `minimumDate = today` and `maximumDate = +1 year`.
- `orders/[id].tsx` — detail. The order keeps its short ID in the title, but inside
  it resolves **product** and **warehouse** to **names** (direct `getById` queries
  keyed by `productId`/`warehouseId`, with a fallback to a name-by-id lookup over
  the lists). Status is advanced one step via the order-status state machine.

**Order lifecycle** (from `@erp/domain/orderStatus.ts`):
`Requested → Approved → Delivered → Closed` (plus a terminal `Rejected`). The
status is sent to the backend as a **number** (`Requested=0 … Closed=3,
Rejected=4`) matching the C# enum ordinal, and responses (which come back as
numbers) are normalized to names through `ORDER_STATUS_NAMES`. `nextStatus()` gives
the single allowed forward transition; a status with no next entry is terminal.

> **Closing an order requires a document.** `Delivered → Closed` is gated behind
> uploading a delivery PDF (`UploadCloseModal`); the order only moves to Closed once
> the upload succeeds. This is the step that creates stock.

### Notifications — `(tabs)/notifications.tsx`
Lists notifications with read/unread state and "mark read / mark all read". A live
indicator shows whether the WebSocket is connected ("Live") or whether it has
fallen back to 30s polling. Messages are **human-readable** (resolved on the
backend notification-service to include product names and quantities, not raw
UUIDs).

### More — `(tabs)/more/`
A hub menu (only showing entries the role's features allow) into the management
screens: **products** (+ categories), **warehouses**, **fleet** (drivers +
vehicles), **companies**, **scanner**, **AI analysis**, **profile**. Each of these
is a nested stack (`_layout.tsx` + `index.tsx` + `[id].tsx` + `new.tsx` +
`edit/[id].tsx`) following the same CRUD pattern.

### Profile — `(tabs)/more/profile.tsx`
Shows the user, role, **language switcher** (writes the locale store), and logout.

---

## 12. The QR scanner (flagship feature) — `(tabs)/more/scanner.tsx`

The scanner lets you **register a product by scanning a QR code**. It is built as
an explicit **state machine** so the UI is always in a well-defined state.

### The barcode hook — `lib/scanner/useBarcode.ts`
`CameraView.onBarcodeScanned` fires *many times per second*. The React `scanned`
state updates asynchronously, so guarding on state alone let multiple scans through
before the next render — this is what caused the infamous "opens the product 10
times" bug. The fix is a **synchronous `useRef` guard**:

```ts
const handledRef = useRef(false);
const handleScan = (result) => {
  if (handledRef.current) return;   // synchronous — blocks the burst immediately
  handledRef.current = true;
  setScanned(true);
  onScanned(result);
};
const reset = () => { handledRef.current = false; setScanned(false); };
```

### The QR payload — `lib/scanner/parseProductPayload.ts`
A product QR encodes JSON:
```json
{"t":"product","name":"Kladivo","sku":"KLA-001",
 "description":"Jekleno kladivo","weight":0.7,"category":"Orodje"}
```
`parseProductPayload` validates it (must be `t:"product"` or have a name+sku pair),
coerces `weight`, and returns a typed `ScannedProduct | null`. `category` is a
**name**, not an id — it gets resolved to a category id later.

### The state machine (`scanner.tsx`)
States: `idle → searching → found | notFound | checking → productExists |
categoryMissing → productReady → saving → error`.

The flow on a successful product scan:
1. Parse the payload; if it isn't a product QR → error.
2. **Check the SKU isn't already taken** via `productsApi.getBySku(sku)`. If a
   product exists → `productExists` state ("product already exists").
3. **Resolve the category by name.** If the QR has no category → error
   (`noCategoryInQr`). If the named category doesn't exist → `categoryMissing`,
   carrying the scanned product.
4. If everything resolves → `productReady`; the user taps **"Dodaj produkt"** which
   calls the create-product mutation (description defaults to the name; weight
   defaults to 0).

**Inline category creation:** in the `categoryMissing` state the panel shows a
**"Ustvari kategorijo"** (Create category) button *inline* — it does **not**
navigate away to the categories screen. It runs `createCategory`, then advances to
`productReady` with the new category id so you can immediately add the product.

**The zero-GUID bug (good story to tell):** originally `POST /categories` returned
an empty `200 OK` with no body, so the client received `id = "0000…0000"` and the
follow-up create-product call failed with *"category 0000… not found"* — yet it
worked on the *second* scan (because the category now existed and was found by
name). Two fixes: (1) the backend now returns the created entity; (2) the client
has a defensive fallback — if the returned id looks like a zero/empty GUID, it
refetches all categories and matches by name to get the real id
(`isInvalidGuid` check in the `createCategory` `onSuccess`).

> **Defense Q:** *"Why a ref guard instead of disabling the camera?"* — State updates
> are async; by the time `scanned` flips, the camera has already fired dozens of
> times. A ref mutates synchronously inside the same tick, so the very next fire is
> blocked. *"Why a state machine?"* — Scanning has many outcomes (not found, exists,
> category missing, ready, saving, error); modeling them as explicit states keeps the
> single result panel correct instead of juggling booleans.

---

## 13. Realtime notifications — the WebSocket

### `lib/realtime/wsClient.ts` — `ReconnectingWsClient`
A small class that owns one `WebSocket` and makes it resilient:
- Connects to `WS_URL` with the JWT as `?token=<jwt>` (the notification-service
  validates it on the upgrade and closes with code `4001` if invalid).
- **Exponential backoff** reconnection: `retryDelay` doubles from 1s up to a 60s
  cap, reset to 1s on a successful open.
- After `FALLBACK_AFTER_FAILURES` (3) consecutive failed attempts, exposes
  `fallbackActive = true` so the UI can switch to HTTP polling — while still
  retrying in the background so it can recover.
- Pub/sub: `subscribe(handler)` for messages, `onStateChange(handler)` for
  connection state. `destroy()` tears it all down.

### `hooks/realtime/useNotifications.ts` — the bridge to React Query
- Maintains a **single shared client** across the whole app via a module-level
  singleton + a `subscriberCount`. Many components can call the hook without
  opening multiple sockets; the socket is torn down only when the last subscriber
  unmounts.
- On every message it **invalidates React Query caches** so the UI refetches: always
  the notifications + unread keys, plus topic-specific keys — `order.created` /
  `order.status.changed` → orders; `inventory.low` / `inventory.out` → stock;
  `warehouse.capacity` → warehouses.
- Returns the connection state so the Notifications screen can show "Live" vs the
  polling fallback.

> **Defense Q:** *"What happens when the WebSocket drops?"* — The client reconnects
> with exponential backoff (1s→60s). After 3 failures it flags `fallbackActive`, and
> the UI relies on the 30s polling query (the unread badge already polls). When the
> server returns, the socket reconnects and live updates resume — no app restart.

> **Honesty note:** there are stale comments in `wsClient.ts`/`useNotifications.ts`
> about WS auth being "not yet implemented". The current wiring **does** pass the
> token and the gateway proxies `/ws`. If an examiner spots the comment, explain it's
> a leftover from an earlier gap that was since closed.

---

## 14. AI analysis — `lib/ai/aiClient.ts` + `more/ai.tsx`

The AI screen requests an **inventory summary** from the backend `ai-service`
through the gateway (`GET /ai/inventory-summary`). The response includes a
generated `summary`, `totals` (product/warehouse counts, total stock, low-stock
count), `alerts`, and `reorderSuggestions`. A `source` field is `'azure'` or
`'template'`:

- If Azure OpenAI env vars are configured on the backend, the text is
  Azure-generated.
- If not, the service returns a **deterministic template summary** and `source:
  'template'` — the UI shows "Source: local analysis (Azure not configured)" instead
  of failing.

> **Defense Q:** *"What if the AI provider isn't configured?"* — The service degrades
> gracefully to a template-based summary; the UI still works and tells the user the
> source. AI is gated to managers/admins via the `AI_ANALYSIS` feature. **No keys are
> hardcoded** — Azure credentials come from backend env vars only.

---

## 15. Offline handling

- **`hooks/useOfflineState.ts`** wraps `@react-native-community/netinfo` to expose
  `online`.
- The root layout renders **`OfflineBanner`** when offline.
- **Reads** still work offline because React Query serves the 5-minute cache.
- **Writes** are blocked/disabled while offline (the banner + disabled controls);
  the i18n keys `common.offline` / `common.offlineMsg` explain why.

> **Defense Q:** *"Is it offline-first?"* — It's **offline-tolerant for reads**:
> cached data renders without network, and a banner makes the state obvious. Writes
> require connectivity by design (no local mutation queue), which is the right
> trade-off for inventory data that must be authoritative.

---

## 16. The date picker — `components/ui/DatePickerField.tsx`

A reusable field replacing every free-text date input. It stores a canonical
`YYYY-MM-DD` string and the user always *picks*, never types.

- **Platform split:** Android opens the native dialog imperatively
  (`DateTimePickerAndroid.open`); iOS renders a `display="spinner"` picker inside a
  bottom-sheet `Modal` with Cancel/Save.
- **Local-midnight parsing:** `parseYmd` builds `new Date(y, m-1, d)` to avoid the
  UTC off-by-one that `new Date('YYYY-MM-DD')` causes.
- **Localized display:** the visible label is formatted with `toLocaleDateString`
  using `sl-SI` or `en-GB` based on the active locale.
- **Dark-mode fix:** the iOS spinner is pinned to `themeVariant="light"` +
  `textColor="#1e293b"` so numerals stay readable on the white sheet (otherwise
  system-colored text rendered near-white on white in dark mode).
- Accepts `minimumDate` / `maximumDate` (orders: today → +1 year; consume: max =
  today).

---

## 17. Forms — react-hook-form + zod

Forms (`components/forms/*Form.tsx`, plus login/register) use **react-hook-form**
for uncontrolled, performant inputs and **zod** schemas (via
`@hookform/resolvers`) for validation.

A localization subtlety solved here: zod schemas store **i18n keys** as messages
(e.g. `'auth.emailInvalid'`) rather than literal strings, and a small `msg(key)`
helper resolves them through the proxy **at render time** — so validation messages
also translate when you switch language (otherwise they'd freeze at schema-build
time, the same module-level trap as §10).

---

## 18. Error handling (defense-relevant: "what happens when things fail?")

Layered, so a failure never crashes the app silently:

1. **`components/ErrorBoundary.tsx`** — a React error boundary at the very root
   catches render-time crashes and shows a recoverable fallback instead of a white
   screen.
2. **`lib/http/errors.ts` `formatApiError`** — turns any axios/network error into a
   readable message; used by every mutation `onError`.
3. **`components/ui/ErrorView.tsx`** — the standard "something went wrong + Retry"
   view for failed queries (`isError` → `<ErrorView onRetry={refetch} />`).
4. **`components/ui/LoadingView.tsx`** — the standard spinner for `isLoading`.
5. **`stores/toastStore.ts` + `ToastHost`** — transient success/error toasts.
6. **The 401 interceptor** — silently recovers expired sessions (§8).

> Every list/detail screen follows the same triad: `if (isLoading) return
> <LoadingView/>; if (isError) return <ErrorView onRetry={refetch}/>;` then render.

---

## 19. Testing — `__tests__/`

Jest with the `jest-expo` preset. Tests focus on **pure logic** (cheap, stable) plus
one component test:

- `roles.test.ts` — the feature matrix (`hasFeature`) behaves per role.
- `orderStatusFlow.test.ts` — the order-status state machine transitions.
- `errors.test.ts` — `formatApiError` extracts the right message per error shape.
- `OfflineBanner.test.tsx` — the banner renders by connectivity state.

Run from the mobile dir: `cd mobile && npx jest` (running from the repo root makes
Jest try to scan the web workspaces).

> **Defense Q:** *"What did you choose to test and why?"* — The highest-value,
> most-reused logic that lives in shared packages and the HTTP layer: role gating,
> order transitions, error formatting. These are pure functions, so the tests are
> fast and deterministic; UI is verified manually in Expo Go.

---

## 20. Build, run & connectivity

- **Dev:** `npm install` at the repo root (workspaces), then `cd mobile && npx expo
  start`. Open in **Expo Go** (scan QR) or an emulator (`a` / `i`).
- **Emulator hosts:** Android uses `10.0.2.2:8090` to reach the host gateway; iOS
  uses `localhost:8090`.
- **Physical device:** set `EXPO_PUBLIC_API_URL` (and optionally
  `EXPO_PUBLIC_WS_URL`) in `.env` to a tunnel URL so the phone can reach the
  gateway. The WS URL otherwise derives from the API URL as `<host>/ws`.
- **Tunneling:** the gateway is exposed via cloudflared / ngrok; Expo itself can run
  `--tunnel`. (See `docs/RUN_TUNNELED.md`.) The axios client sends
  `ngrok-skip-browser-warning` so the free-tier interstitial doesn't break requests.

> **Defense Q:** *"How does a real phone reach your local backend?"* — Through a
> tunnel: the gateway is exposed publicly (cloudflared/ngrok), and the app points at
> that URL via `EXPO_PUBLIC_API_URL`. REST and WS share the host; WS is `/ws` on the
> gateway.

---

## 21. Design decisions you should be ready to defend

| Decision | Justification |
|---|---|
| Single gateway, never call services directly | One auth point, one host to tunnel, services can move without changing the app. |
| React Query for server state, Zustand for client state | Different problems: caching/refetch vs. owning the token & locale. |
| Cache keys centralized in `@erp/domain` | Invalidation always matches the read; no string-array drift between screens. |
| i18n via live proxy + navigator remount | Instant full re-translation with zero prop-drilling; the remount beats Navigation's memoization. |
| Refresh-on-401 with a shared in-flight promise | Seamless sessions, no refresh stampede, capped at one retry (no loops). |
| Scanner as an explicit state machine + ref guard | Many scan outcomes handled cleanly; the synchronous ref kills the multi-fire burst. |
| Stock only grows via closed orders | Inventory stays authoritative; no ad-hoc "add stock" that bypasses the order trail. |
| Client-side role gating for UX, backend for security | Hides unusable controls without pretending the client enforces auth. |
| Shared types/domain/i18n packages | Web and mobile share one source of truth; the type checker enforces both. |
| Offline-tolerant reads, online-only writes | Inventory data must be authoritative; serving cached reads is safe, queuing writes is not. |

---

## 22. Likely examiner questions — quick answers

- **"Walk me through what happens when I open the orders tab."** Screen mounts →
  `useQuery(queryKeys.orders, ordersApi.getAll)` → axios attaches the token →
  gateway validates JWT & proxies to order-service → response cached → list renders;
  tapping a row routes to `[id].tsx` which fetches the detail and resolves
  product/warehouse names.
- **"How is the token kept secure / refreshed?"** Stored in the Zustand auth store
  (persisted to AsyncStorage); attached by the request interceptor; refreshed once
  on a 401 via a de-duplicated refresh promise; cleared (→ login) if refresh fails.
- **"How do you switch language instantly?"** Live `sl` proxy resolving to the
  active locale per access + `key={locale}` remount of the navigator. Watch out for
  module-level constants freezing the proxy.
- **"How do live notifications work?"** A single reconnecting WebSocket per app;
  messages invalidate React Query caches by topic; exponential-backoff reconnect with
  a polling fallback after 3 failures.
- **"What's special about the scanner?"** Synchronous ref guard against the
  multi-fire camera; QR carries product JSON; explicit state machine handles
  exists/category-missing/ready; inline category creation; zero-GUID defensive
  refetch.
- **"Where is the navigation defined?"** Nowhere central — expo-router derives it
  from the `app/` folder; `_layout.tsx` files are the navigators.
- **"Is the role check real security?"** No — it's UX gating; the gateway/services
  are the real authority. The shared matrix keeps the UI consistent with backend
  permissions.
- **"What happens offline?"** Reads come from React Query's 5-minute cache; a banner
  shows; writes are disabled.
- **"Why a monorepo with shared packages?"** Domain rules (roles, order status),
  DTO types, and translations are shared verbatim with the web clients — one source
  of truth, type-checked on both sides.

---

## 23. 60-second spoken summary (memorize this)

> "It's an Expo React Native inventory client. Routing is file-based with
> expo-router — the `app/` folder *is* the navigation graph, with an auth route
> group and a five-tab shell behind an auth guard. Server data goes through React
> Query with centralized cache keys; the token and language live in Zustand. All
> traffic goes to one mobile-gateway: an axios request interceptor attaches the JWT
> and a response interceptor transparently refreshes it on a 401, de-duplicating
> concurrent refreshes. The app is fully bilingual through a live i18n proxy plus a
> navigator remount on language change. Live notifications arrive over a
> self-healing WebSocket that invalidates the right caches and falls back to polling.
> The standout feature is a QR scanner built as a state machine with a synchronous
> ref guard against the camera's multi-fire, including inline category creation.
> Roles gate the UI for UX while the backend enforces real authorization, and shared
> monorepo packages keep domain rules, types, and translations identical with the web
> clients."

---

*File map quick-reference for the panel:* root composition `app/_layout.tsx` ·
tabs `app/(tabs)/_layout.tsx` · HTTP `lib/http/client.ts` · auth `stores/authStore.ts`
· roles `@erp/domain/roles.ts` · i18n proxy `constants/i18n.ts` · WS
`lib/realtime/wsClient.ts` + `hooks/realtime/useNotifications.ts` · scanner
`app/(tabs)/more/scanner.tsx` + `lib/scanner/*` · date picker
`components/ui/DatePickerField.tsx`.
