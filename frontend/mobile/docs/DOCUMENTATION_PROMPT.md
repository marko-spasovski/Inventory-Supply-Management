# Documentation Generator Prompt

> Paste **everything below the divider** as a single message to Claude (claude.ai or Claude Code). Claude will produce a long, well-formatted Markdown document with mermaid diagrams, a cover page, and a table of contents — ready to be exported to PDF (File → Print → Save as PDF in the browser, or use a Markdown-to-PDF tool such as `pandoc`, `md-to-pdf`, or VS Code's "Markdown PDF" extension).

---

## Role and goal

You are a senior technical writer. Generate a comprehensive **technical documentation** of a full-stack ERP / inventory & supply management system. The output **must** be:

- A **single Markdown document** (no questions back to me, no chit-chat).
- ≥ 6,000 words, structured with a cover page, table of contents, numbered sections, and subsections.
- Include **Mermaid** diagrams (`mermaid` fenced code blocks) for architecture, service map, request flow, order lifecycle, scanner flow, notification flow, AI flow.
- Include a few short **code snippets** illustrating critical mechanisms (i18n proxy + remount, JWT refresh interceptor, name-resolver fallback for category id, scanner ref-guard, etc.). Keep snippets ≤ 20 lines each.
- Use clean prose, active voice, third person, no marketing language.
- The reader is a software engineer / thesis reviewer. Assume they know HTTP, REST, JWT, Postgres, Kafka, React, React Native at a moderate level; explain anything project-specific.
- The document must be **self-contained** — do not say "see X" without inlining the relevant detail.
- Output **only the Markdown**. No preface ("Here is your documentation…"), no closing remark. Start with the cover-page heading and end with the appendix.

## Mandatory document sections

1. **Cover page** — project title, subtitle ("Mobile-first inventory & supply management"), one-paragraph abstract, author placeholder, date placeholder.
2. **Table of contents** — auto-style, hand-written links to each heading.
3. **Executive summary** (≤ 1 page).
4. **System overview & architecture** — monorepo layout, runtime topology, network boundaries.
5. **Backend services** — one subsection per service: responsibility, language/stack, port, persistence, key endpoints, notable design choices.
6. **API gateways** — mobile-gateway vs web-gateway; JWT handling and `X-User-*` header injection; WebSocket proxying; rate limiting; CORS.
7. **Inter-service communication** — Kafka topics and producers/consumers; the notification-service event pipeline; the name-resolver pattern for human-readable messages.
8. **Mobile application (Expo / React Native)** — file-system routing layout; tab structure; per-screen responsibilities; state management with zustand + persist; data fetching with React Query; offline strategy; push notifications; barcode/QR scanner.
9. **Internationalization (i18n)** — the `@erp/i18n` shared package, the live recursive Proxy `sl`, the `useStrings()` hook, the root-layout key-remount-on-locale-toggle, and why module-level constants that read from the proxy were a bug (and how the codebase has been refactored to build label arrays inside the render).
10. **Authentication & authorization** — login/register flow, JWT (HMAC-SHA, shared secret with auth-service), refresh-once axios interceptor, role-based UI gating (`useHasFeature`, `RoleGate`), gateway middleware verifying the JWT and stamping `X-User-Id/Email/Role`.
11. **Order lifecycle** — Requested → Approved | Rejected; Approved → Delivered; Delivered → Closed (with mandatory PDF delivery document upload via multipart). Include the capacity-warn flow on approve. Include the side-effect on Closed: inventory is created/incremented (stock cannot be added by hand on mobile).
12. **Stock (inventory) flows** — list, low-stock badging via min-threshold, edit min/max thresholds (drives low-stock notifications), consume (issue) flow as multipart with required PDF document. Stock is never created via UI — only via order closure. Explain why.
13. **Scanner subsystem** — `useBarcode` hook with synchronous `useRef` guard against the multi-fire bug; `parseProductPayload` JSON QR format; the in-screen result state machine (`idle | searching | found | notFound | checking | productExists | categoryMissing | productReady | saving | error`); direct create-product mutation; inline create-category mutation with name fallback to handle the empty `Ok()` response from `POST /categories`; QR JSON schema and a sample payload.
14. **Notifications subsystem** — Kafka events (`order.created`, `order.status.changed`, `inventory.low`, `inventory.out`); how notification-service consumes them, calls product/warehouse/order services to resolve names with a 5-minute in-memory cache, and produces human-readable messages; the rxjs pipeline (`concatMap` for ordered safe persistence, not `switchMap`); WebSocket broadcast at `/ws` (proxied through mobile-gateway, JWT-validated on upgrade); HTTP read API on `:8088`; the resilient bootstrap (HTTP listens before Kafka connects, Kafka connection failure does **not** crash the service).
15. **AI analysis** — gateway-gated to MANAGER+ via `requireManager`; `X-User-*` forwarded to ai-service; ai-service fetches inventory/product/warehouse snapshots and computes totals/alerts/reorder suggestions; Azure OpenAI integration optional (env: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`); template-summary fallback when env not provided (`source: 'template'` vs `'azure'`); mobile UI states (acknowledge, loading, summary).
16. **Offline & resilience** — `useOfflineState` via `@react-native-community/netinfo`, top-of-screen `OfflineBanner`, React Query staleTime 60 s and gcTime 5 min as the offline read cache, the 401 → refresh → retry → fallback-clear logic.
17. **Date pickers** — single reusable `DatePickerField` with imperative Android dialog (`DateTimePickerAndroid.open`) and iOS spinner inside a modal sheet, `themeVariant="light"` + explicit `textColor` so dark-mode devices still render readable digits, `YYYY-MM-DD` stored as the canonical form.
18. **Build / run** — how to start the backend with `docker compose up`, the mobile dev server (`npx expo start --tunnel`), the cloudflared / ngrok tunneling pattern for physical-device testing, the `EXPO_PUBLIC_API_URL` env var.
19. **Testing** — jest for mobile and notification-service, the moduleNameMapper for `@erp/*` packages, the AsyncStorage mock in `jest.setup.js`, what's covered.
20. **Known constraints and design tradeoffs** — why the `sl` proxy + remount on locale change (vs touching 45 files), why no add-stock UI (domain rule: stock only via order closure), why the scanner uses tap-to-add instead of auto-navigation (avoids fan-out of router pushes), why notification text stays in English server-side.
21. **Appendix A — QR payload schema** with example.
22. **Appendix B — Mermaid diagrams** consolidated.
23. **Appendix C — Glossary**.

## Project facts (use these — they are accurate as of this writing)

### Repositories
Two sibling git repositories:
- **Frontend monorepo** — `Inventory-Supply-Management-Frontend/`
  - `mobile/` — Expo / React Native app (the primary client).
  - `web/` — Module-Federation host **shell** + seven micro-frontends: `auth-mf`, `warehouses-mf`, `inventory-mf`, `orders-mf`, `companies-mf`, `fleet-mf`, `products-mf`.
  - `packages/domain` — runtime + types, framework-agnostic (roles, query keys, order-status enum).
  - `packages/api-types` — types-only DTOs (no runtime code).
  - `packages/i18n` — pure SL/EN message tables + `getStrings(locale)` + `Locale` type.
  - npm workspaces. Root `.npmrc` has `legacy-peer-deps=true` to unblock React 19 peer mismatch on `react-test-renderer`.
- **Backend monorepo** — `Inventory-Supply-Management-Backend/`
  - `services/` — nine independent microservices.
  - `mobile-gateway/` — Node / Express BFF for the mobile app.
  - `gateway-service/` — web gateway (different shape; web shell talks to it).
  - `compose.yaml` — docker-compose for DBs, brokers, gateway, MFs (most services run on host networking).

### Backend services — port, language, persistence, role

| Service              | Port  | Stack             | DB (port)              | Responsibility |
|----------------------|-------|-------------------|------------------------|----------------|
| auth-service         | 8081  | Java/Spring Boot  | Postgres `users` (5432) | Register, login, refresh; issues HMAC-signed JWTs. Stamps role claim. |
| company-service      | 8082  | Java/Spring       | Postgres `companies` (5433) | CRUD companies, contact info, country/city. |
| fleet-service        | 8083  | Java/Spring       | Postgres `fleet` (5434) | CRUD drivers and vehicles, vehicle types. |
| warehouse-service    | 8084  | Java/Spring       | Postgres `warehouses` (5435) | CRUD warehouses with capacity (total/used). |
| product-service      | 8085  | C# / .NET 8       | Postgres `products` (5436) | CRUD products and categories; `GET /products/by-sku`. |
| inventory-service    | 8086  | Java/Spring       | Postgres `inventory` (5437) | Inventory rows with min/max thresholds; consume (multipart with PDF). Emits `inventory.low` / `inventory.out` to Kafka. |
| order-service        | 8087  | C# / .NET 8       | Postgres `orders` (5438) | Order CRUD; status transitions; multipart upload of delivery doc on close. Emits `order.created` / `order.status.changed`. On `Closed`, increments inventory via inventory-service. |
| notification-service | 8088 + WS 9091 | Node/TS + RxJS + KafkaJS + Postgres + `ws` | Postgres `notifications` (5439) | Consumes Kafka events, resolves IDs → human-readable names by calling product/warehouse/order services (cached 5 min), persists notifications, broadcasts over WebSocket. Bootstrap is resilient: HTTP server starts **before** Kafka connect; Kafka connect failure does NOT crash the service. |
| ai-service           | 8089  | Node/TS           | (no DB)                 | Aggregates inventory/product/warehouse snapshots; returns totals + low-stock alerts + reorder suggestions; optionally calls Azure OpenAI for a natural-language summary. Falls back to a deterministic template when `AZURE_OPENAI_*` env is not set (`source: "template"`). |
| mobile-gateway       | 8090  | Node/Express + http-proxy-middleware | (stateless) | BFF for mobile. Validates JWT, stamps `X-User-Id/Email/Role` headers, proxies REST to the right downstream, proxies WebSocket upgrades at `/ws` to notification-service:9091. CORS open in dev. Rate-limited (300 req / 15 min). |

### Kafka topics

| Topic                  | Producer            | Payload key fields                                                  |
|------------------------|---------------------|----------------------------------------------------------------------|
| `order.created`        | order-service       | `orderId, companyId, companyName, warehouseId, status, createdAt`    |
| `order.status.changed` | order-service       | `orderId, oldStatus, newStatus, changedAt`                           |
| `inventory.low`        | inventory-service   | `warehouseId, capacityLeft, productId?`                              |
| `inventory.out`        | inventory-service   | `warehouseId, productId?`                                            |

Consumer: notification-service.

### Mobile app — high-level

- **Framework**: Expo SDK 54, React Native 0.80, expo-router (file-based).
- **Languages**: TypeScript.
- **State**: zustand + zustand/persist (AsyncStorage). One store for auth, one for locale, one for toast.
- **Data fetching**: `@tanstack/react-query` v5. staleTime 60 s, gcTime 5 min, retry 1.
- **HTTP**: axios with a request interceptor that injects `Authorization: Bearer <jwt>` and a response interceptor that, on 401, calls `POST /auth/refresh` once with the stored refresh token; concurrent 401s share a single in-flight refresh promise.
- **WebSocket**: a hand-written `ReconnectingWsClient` with exponential backoff (1 s → 60 s cap), a 3-failure fallback threshold so the UI can switch to 30 s polling when the broker is down.
- **Forms**: react-hook-form + zod. Validation messages are stored as i18n keys (`auth.emailInvalid`, …) so module-level zod schemas don't freeze to the locale that was active at module load.
- **Camera**: `expo-camera` `CameraView` with `barcodeTypes: ['ean13','ean8','code128','qr']`.
- **PDF picking**: `expo-document-picker` for the close-order doc upload and the consume proof.
- **Push**: best-effort `expo-notifications` token registration; only works in dev builds, not in Expo Go (SDK 53+).
- **Date input**: `@react-native-community/datetimepicker` wrapped in a single `DatePickerField` (`mobile/components/ui/DatePickerField.tsx`).
- **Network status**: `@react-native-community/netinfo` driving an `<OfflineBanner>`.

### Mobile route tree

```
app/
  _layout.tsx                       # ErrorBoundary > SafeAreaProvider > QueryClientProvider
                                    # > AuthGuard > <Stack> (keyed on locale to force remount)
  (auth)/
    login.tsx
    register.tsx
  (tabs)/
    _layout.tsx                     # Tabs with home/stock/orders/notifications/more
    index.tsx                       # Dashboard / Home
    stock/
      _layout.tsx
      index.tsx                     # Stock list, low-stock badges, edit-thresholds modal
      consume.tsx                   # Multi-item consume with required PDF document
    orders/
      _layout.tsx
      index.tsx                     # Filterable order list
      [id].tsx                      # Order detail + status transitions (capacity warn, upload-close)
      create.tsx                    # New order form (today → +1y delivery date picker)
    notifications.tsx               # WS-driven list, mark-read, polling-fallback indicator
    more/
      _layout.tsx
      index.tsx                     # Menu (Products, Warehouses, Fleet, Companies, Scanner, AI, Profile)
      profile.tsx
      scanner.tsx                   # Barcode/QR scanner + scan-to-create-product flow
      ai.tsx                        # AI analysis acknowledge + summary view
      products/
        index.tsx                   # SKU search + category filter
        [id].tsx
        new.tsx                     # Reused for both manual create and prefilled-from-scan
        categories.tsx              # Category CRUD
      warehouses/{index,[id]}.tsx
      fleet/
        index.tsx
        drivers/[id].tsx
        vehicles/[id].tsx
      companies/{index,[id]}.tsx
```

### i18n internals (important)

- Shared package `@erp/i18n`:
  - `Locale = 'sl' | 'en'`
  - `Strings = typeof sl` (sl.ts is canonical, en.ts must mirror its shape exactly).
  - `getStrings(locale)` returns the strings table.
  - `LOCALES`, `LOCALE_LABEL`, `DEFAULT_LOCALE` exported.
- Mobile-side facade: `constants/i18n.ts` exports `sl: Strings` which is **not** the sl table directly but a recursive **Proxy** that resolves every property access against `useLocaleStore.getState().locale` at call time. So `sl.orders.title` reads the active locale's strings on each access — call sites don't need to change when locale flips.
- `lib/i18n/locale.ts` is a zustand store persisted to AsyncStorage. Exposes `useStrings()` hook for components that want subscription semantics.
- Critical pitfall: any **module-level** value that reads from the proxy is frozen at module-load time. The codebase has had several of these (zod schemas, the `MoreScreen` menu array, the auth login zod). The fix is to either (a) build the value **inside** the component so each render re-resolves through the proxy, or (b) store **i18n keys** in the module-level data and resolve them at render time via a tiny `msg(key)` helper. Both patterns are used.
- The **root layout** subscribes to the locale and renders its inner navigator with `key={locale}`. Locale toggle → key changes → expo-router stack remounts → every screen re-resolves the proxy from scratch. This was necessary because React Navigation memoizes mounted screens and a plain re-render did not propagate into already-mounted tab screens.

### Stock / inventory rules

- Mobile **never** exposes a manual "add stock" action. Stock is only ever increased when an order moves to `Closed`; the order-service tells inventory-service to increment.
- The mobile stock screen offers: filter by warehouse, view the list with min-threshold-based low-stock badging, edit min/max thresholds (drives the `inventory.low` Kafka event), and **consume** (issue) which requires a user-selected PDF document (the consume record).
- Why the consume document is user-picked: the web `inventory-mf` auto-generates the consumption-record PDF via `jspdf`, but React Native has no Blob / jspdf pipeline. The mobile flow asks the operator to attach a PDF themselves (signed delivery sheet, paper-form scan, etc.). No backend change.

### Order lifecycle

```
Requested ──(approve, may show capacity warn)──► Approved ──► Delivered ──(upload delivery PDF)──► Closed
    │
    └──(reject)──► Rejected
```

- On approve, the UI checks if `order.quantity > warehouse.totalCapacity − warehouse.usedCapacity` and shows a 3-button alert (Cancel / Reject / Approve anyway) before submitting.
- Delivered → Closed is intercepted: a multipart upload of a PDF "delivery document" is required (`POST /orders/upload-document`), then status is set to Closed. On Closed, inventory is incremented (server-side).

### Scanner flow

The QR payload format (JSON):
```json
{
  "t": "product",
  "name": "Kladivo",
  "sku": "KLA-001",
  "description": "Jekleno kladivo 500g",
  "weight": 0.7,
  "category": "Orodje"
}
```
- `t:"product"` (or a `name`+`sku` pair) marks it as a "create product" payload. Anything else is treated as a SKU and looked up.
- The scanner uses `useBarcode`, a hook with a synchronous `useRef` guard so the single scan callback fires exactly once until reset — `CameraView.onBarcodeScanned` can fire many times per second and the previous state-only guard let multiple callbacks through, causing the same screen to be pushed several times. The ref guard fixes that.
- Validation runs in the scan handler: `getBySku` to verify the SKU is free, then `getAllCategories` to resolve the category name to an id.
- If the category doesn't exist, the result card shows a **"Ustvari kategorijo"** button. Tap → `POST /categories` with `{ name, description: name }` (auto-filled). If product-service returns an empty body (old version) or a zero-GUID, the mobile client refetches `/categories` and resolves by name as a fallback. Then the state transitions to `productReady`.
- Tapping **"Dodaj produkt"** calls `POST /products` directly (no navigation to a form). Description defaults to product name when omitted in the QR. Toast on success, scanner resets for the next scan.

### Notifications subsystem internals

- `notification-service/src/application/use-cases/process-kafka-event.usecase.ts` builds a `Notification` per event. The transform is **async** so it can resolve names via REST against product / warehouse / order services. Failures degrade to short-ID wording so a notification is never lost.
- The rxjs pipeline is `event$.pipe(concatMap(build), concatMap(save), tap(broadcast))`. **`concatMap`** for the persistence step, not `switchMap`: with async upstream, `switchMap` would cancel an in-flight DB write on the next event arriving.
- `name-resolver.ts` caches successful lookups for 5 minutes (and never caches failures, so a transient outage isn't pinned). 3-second `AbortController` timeout per call.
- Bootstrap order: `initDb → build deps → wire pipeline → app.listen(8088) → try connect Kafka catch log`. HTTP listens before Kafka connect specifically so a Kafka outage doesn't take down the read API (`GET /notifications`).
- WebSocket: notification-service runs a `ws` server on `:9091` and validates the JWT on upgrade (`?token=…`). mobile-gateway proxies `/ws` to it (`http-proxy-middleware` with `ws: true`).

### Authentication & roles

- Roles: `ADMIN`, `MANAGER`, `WORKER`, `DRIVER`. Mapped to UI features via `mobile/lib/auth/features.ts` and queried by `useHasFeature(feature)` / `<RoleGate feature="X">`.
- JWT is HMAC-SHA-256, signed by auth-service with a base64-encoded HMAC key. The mobile-gateway and notification-service share the same secret. The token's `role` claim is what gates everything; the gateway re-stamps it as `X-User-Role` for downstream services that don't verify the token themselves.
- The web shell also stores the JWT and shares the locale across micro-frontends via `localStorage` + a `'storage'` event (Module Federation can't share React runtime singletons).

### Build & run cheatsheet for the documentation

```bash
# Backend
cd Inventory-Supply-Management-Backend
docker compose up -d                                 # DBs, Kafka, gateway, MFs
cd services/notification-service && npm run dev       # not containerised; run manually

# Mobile
cd Inventory-Supply-Management-Frontend/mobile
cp .env.example .env                                  # set EXPO_PUBLIC_API_URL
npx expo start --tunnel --port 19000 --clear
# scan QR with Expo Go (iOS) or Camera app

# Cloudflared tunnel for physical-device testing against a laptop gateway
cloudflared tunnel --url http://localhost:8090
# put the https URL into mobile/.env as EXPO_PUBLIC_API_URL
```

## Style requirements

- Use H1 only for the document title. Sections start at H2.
- Use compact tables for service-port-stack matrices, role matrices, status flows.
- Mermaid for: top-level architecture, mobile route map, order state machine, scanner state machine, notification event flow, AI request flow, JWT refresh sequence. At least 5 diagrams total.
- Show one tiny code snippet per critical pattern (i18n proxy, `key={locale}` remount, refresh interceptor, `useBarcode` ref-guard, notification-service `concatMap` pipeline, scanner category fallback). Code blocks should be language-tagged (` ```ts `).
- Slovenian terms in parentheses where natural (Skladišče / warehouse, Naročilo / order, Zaloga / stock, Obvestilo / notification, Skener / scanner).

## Final reminder

Output **only** the Markdown document, starting with the cover-page H1 and ending with the appendices. No "Here you go", no "Let me know if you need anything else". The document must read like a polished thesis-grade technical reference.
