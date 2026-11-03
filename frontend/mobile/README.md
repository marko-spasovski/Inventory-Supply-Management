# Pocket Logistics Pro — Mobile App

React Native / Expo client for the Inventory-Supply-Management ERP backend. Built as the mobile companion to the existing web app, sharing the same microservices through `mobile-gateway` (Express/TS on port 8090).

This pass delivers the foundation, auth, and the three representative features (Stock, Orders, Warehouses) plus shells for Scanner, Notifications, AI, and Fleet. See [`docs/`](./docs) for the full architecture, role matrix, and gap analysis.

---

## Quick start

```bash
npm install --legacy-peer-deps   # see "Peer-dep note" below
cp .env.example .env             # then edit EXPO_PUBLIC_API_URL if needed
npx expo start
```

Then press `a` (Android emulator), `i` (iOS simulator), or scan the QR code with **Expo Go** on a physical device.

### Peer-dep note

`react@19.1.0` conflicts with `@testing-library/react-native@13.3.3`'s declared peer range. The dependency tree resolves correctly at runtime; `--legacy-peer-deps` is required for `npm install`.

---

## Environment variables

All env vars must be prefixed with `EXPO_PUBLIC_` to be inlined into the JS bundle.

| Variable                 | Default                            | When to override                                                |
|--------------------------|------------------------------------|------------------------------------------------------------------|
| `EXPO_PUBLIC_API_URL`    | platform-specific (see below)      | Physical device on LAN; staging / prod deploys                  |
| `EXPO_PUBLIC_WS_URL`     | derived from `API_URL` (port 9091) | When notification-service WS lives on a different host          |

### Base URL defaults (`lib/http/client.ts`)

| Platform           | Default URL              | Why                                                              |
|--------------------|--------------------------|-------------------------------------------------------------------|
| Android emulator   | `http://10.0.2.2:8090`   | Android emulator routes `10.0.2.2` to the host's `localhost`     |
| iOS simulator      | `http://localhost:8090`  | iOS simulator shares the host network namespace                  |
| Web                | `http://localhost:8090`  | Browser runs on the host                                          |
| **Physical device**| **set explicitly**        | Device cannot reach the host's loopback — use the host's LAN IP  |

Example `.env` for a phone on the same WiFi as the dev machine:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.42:8090
EXPO_PUBLIC_WS_URL=ws://192.168.1.42:9091
```

### Backend prerequisites

Before the app can do anything past the login screen, the backend stack must be running:

```bash
cd ../../erp-inventory/Inventory-Supply-Management
docker compose up -d
```

This brings up `mobile-gateway` (8090), `notification-service` WS (9091), and the per-service databases.

---

## Scripts

| Command            | What it does                                  |
|--------------------|-----------------------------------------------|
| `npm start`        | `expo start` (interactive dev menu)           |
| `npm run android`  | `expo start --android`                         |
| `npm run ios`      | `expo start --ios`                             |
| `npm run web`      | `expo start --web`                             |
| `npm run lint`     | `expo lint`                                    |
| `npm test`         | `jest` (uses `jest-expo` preset)               |
| `npx tsc --noEmit` | TypeScript type-check (no emit)                |

---

## Project layout

```
app/                        expo-router file-based routes
  (auth)/                     login, register
  (tabs)/                     5 bottom tabs — see docs/ARCHITECTURE_OVERVIEW.md §Folder structure
components/                 Shared UI (RoleGate, OfflineBanner, etc.)
constants/                  roles, i18n strings, react-query keys
hooks/                      useRole, useHasFeature, realtime/useNotifications
lib/
  api/                        Per-domain axios wrappers (auth, products, …)
  http/                       Axios client, error formatting
  realtime/                   WebSocket client (notification-service :9091)
  scanner/                    Barcode scanner helpers + permission flow
  ai/                         AI client (shell — endpoint not yet on backend)
stores/                     Zustand stores (authStore — JWT + decoded role)
types/                      Backend DTO mirror types
docs/                       Architecture, role matrix, gap analysis
__tests__/                  Jest tests (formatApiError, roles, OfflineBanner)
```

---

## Authentication

- Login → `POST /auth/login` → JWT returned in the `X-Auth-Token` response header (mobile-specific; web uses an HttpOnly cookie).
- The JWT is decoded via `jwt-decode`; `role` is normalised through `constants/roles.ts → resolveRole()`.
- The token is persisted via `zustand/persist` + `@react-native-async-storage/async-storage`.
- `AuthGuard` in `app/_layout.tsx` redirects unauthenticated users to `/(auth)/login` and authenticated users away from auth screens.
- On `401`, the axios response interceptor clears auth state — there is **no refresh token endpoint** on the backend (see [`docs/ARCHITECTURE_GAPS.md` Gap 1](./docs/ARCHITECTURE_GAPS.md)).

## Role-based UI

`constants/roles.ts` is the single source of truth. Wrap UI in `<RoleGate feature="PRODUCTS_WRITE">…</RoleGate>` instead of hardcoding role strings. The matrix is exercised by `__tests__/roles.test.ts`.

Today the backend issues only `MANAGER` and `WORKER`. `ADMIN` and `DRIVER` are defined in the mobile matrix but will resolve to `WORKER` until [Gap 2](./docs/ARCHITECTURE_GAPS.md) is closed.

## Internationalisation

All user-visible strings live in `constants/i18n.ts` (Slovenian, per spec). Adding a second locale is a one-file change — swap the export for a locale-keyed lookup.

---

## Docs

Read these in order for a full picture:

1. [`docs/ARCHITECTURE_OVERVIEW.md`](./docs/ARCHITECTURE_OVERVIEW.md) — system diagram, tech stack, data flows
2. [`docs/FEATURE_MATRIX.md`](./docs/FEATURE_MATRIX.md) — every spec feature × backend support × mobile plan
3. [`docs/ROLE_MATRIX.md`](./docs/ROLE_MATRIX.md) — spec vs backend role mismatch
4. [`docs/ARCHITECTURE_GAPS.md`](./docs/ARCHITECTURE_GAPS.md) — 13 documented backend gaps blocking spec parity
5. [`docs/ARCHITECTURE_FUTURE.md`](./docs/ARCHITECTURE_FUTURE.md) — design sketches for offline sync, WS auth, AI, push
6. [`docs/MOBILE_VS_WEB_PARITY.md`](./docs/MOBILE_VS_WEB_PARITY.md) — screen-by-screen parity matrix
7. [`VERIFICATION_CHECKLIST.md`](./VERIFICATION_CHECKLIST.md) — one row per endpoint the app calls
8. [`NEXT_ITERATIONS.md`](./NEXT_ITERATIONS.md) — ordered backlog for the next pass
