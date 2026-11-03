# Role Matrix — Pocket Logistics Pro

## 0. Role Alias Strategy (Active Until Backend Adds ADMIN + DRIVER)

The backend `Role` enum contains only `MANAGER` and `WORKER`. Until `ADMIN` and `DRIVER`
are added to auth-service, the mobile app uses an **alias layer** in `constants/roles.ts`:

```typescript
// constants/roles.ts — alias mapping (remove when backend adds the full enum)
export const ROLE_ALIAS: Record<string, AppRole> = {
  ADMIN:   'MANAGER',   // ADMIN → treated as MANAGER (superset, same features)
  DRIVER:  'WORKER',    // DRIVER → treated as WORKER (subset, restricted features)
  MANAGER: 'MANAGER',
  WORKER:  'WORKER',
};

export type AppRole = 'ADMIN' | 'MANAGER' | 'WORKER' | 'DRIVER';
export type ResolvedRole = 'MANAGER' | 'WORKER';  // what the backend actually issues

export function resolveRole(raw: string | undefined): AppRole {
  return (ROLE_ALIAS[raw ?? ''] ?? 'WORKER') as AppRole;
}
```

`RoleGate` and `useHasFeature` read the **AppRole** (4 values). The feature matrix in
`constants/roles.ts` is defined in terms of all four spec roles so that when the alias is
removed, gating changes automatically without touching any screen file. The alias is the
**only** place that maps the two backend values to the four spec roles.

**To remove the alias when backend is ready:** delete `ROLE_ALIAS`, change `resolveRole` to
return the raw JWT claim directly, and update the `AppRole` union if needed. One file, one
function.

---

## 1. Declared Role Matrix (from spec)

| Feature | Admin | Manager | Skladiščni delavec (Worker) | Voznik (Driver) |
|---------|:-----:|:-------:|:---------------------------:|:---------------:|
| 1. Auth + authorization | ✓ | ✓ | ✓ | ✓ |
| 2. Products CRUD + categories | ✓ | ✓ | ✗ | ✗ |
| 3. Warehouses CRUD + capacity | ✓ | ✓ | ✗ | ✗ |
| 4. Inventory / stock (view + update) | ✓ | ✓ | ✓ | ✗ |
| 5. Orders (CRUD + status + driver assignment) | ✓ | ✓ | ✓ (view + scan) | ✓ (assigned orders) |
| 6. Real-time notifications | ✓ | ✓ | ✓ | ✓ |
| 7. Barcode scanner | ✓ | ✓ | ✓ | ✗ |
| 8. Offline mode + sync | ✓ | ✓ | ✓ | ✗ |
| 9. Fleet (Vehicles + Drivers, assignment) | ✓ | ✓ (view only) | ✗ | ✓ (self-view) |
| 10. AI analysis | ✓ | ✓ | ✗ | ✗ |

---

## 2. Actual Role Matrix (from backend)

**Roles that exist in the codebase:** `MANAGER`, `WORKER`

The `Role` enum in `auth-service/src/main/java/com/marko/logistics/auth/domain/model/Role.java`:
```java
public enum Role { WORKER, MANAGER }
```

The `JwtPayload` in `mobile-gateway/src/middleware/auth.middleware.ts`:
```typescript
role: 'MANAGER' | 'WORKER'
```

| Endpoint Group | MANAGER | WORKER | Enforcement location |
|---------------|:-------:|:------:|---------------------|
| POST/PUT/DELETE `/warehouses` | ✓ | ✗ | mobile-gateway `requireManager` + warehouse-service controller check |
| POST/PUT/DELETE `/products`, `/categories` | ✓ | ✗ | mobile-gateway `requireManager` |
| POST/PUT/DELETE `/companies` | ✓ | ✗ | mobile-gateway `requireManager` |
| POST/PUT/DELETE `/drivers`, `/vehicles` | ✓ | ✗ | mobile-gateway `requireManager` |
| GET any resource | ✓ | ✓ | mobile-gateway `authMiddleware` (any valid JWT) |
| POST `/stock` (add inventory) | ✓ | ✓ | no restriction beyond auth |
| POST `/orders` | ✓ | ✓ | no restriction beyond auth |
| PUT `/orders/:id/status` | ✓ | ✓ | no restriction beyond auth |
| GET/PATCH `/notifications` | ✓ | ✓ | no restriction beyond auth |

---

## 3. Diff — Declared Spec vs Actual Backend

### Mismatch 1 — ADMIN role does not exist

| | Spec | Backend |
|-|------|---------|
| **Spec wants** | An ADMIN role with full access to all 10 features | |
| **Backend has** | No ADMIN value in Role enum; no `@PreAuthorize("hasRole('ADMIN')")` anywhere | |
| **Impact on mobile** | Mobile cannot distinguish Admin from Manager; any `ADMIN` user registered via API gets an invalid role (enum parse failure) |
| **Mobile UI gates on** | **Declared spec** — mobile will treat ADMIN as a superset of MANAGER using `constants/roles.ts`. Practically, if a user registers with role `MANAGER`, they get MANAGER privileges. |
| **Recommendation** | Add `ADMIN` to the `Role` enum in auth-service and add `ADMIN` case to mobile-gateway JwtPayload type. Until then, treat MANAGER as the highest-privilege role in the mobile app. |

### Mismatch 2 — DRIVER role does not exist

| | Spec | Backend |
|-|------|---------|
| **Spec wants** | A DRIVER role that sees assigned orders, notifications, and own fleet record | |
| **Backend has** | No DRIVER value in Role enum; no driver-scoped endpoint filtering anywhere | |
| **Impact on mobile** | Drivers cannot be given a restricted-access role; they get WORKER or MANAGER privileges |
| **Mobile UI gates on** | **Declared spec** — mobile `constants/roles.ts` will define DRIVER feature flags, but since the token will never carry `"DRIVER"`, the DRIVER tab experience is not reachable in practice |
| **Recommendation** | Add `DRIVER` to the `Role` enum; add driver-scoped filtering on GET /orders (return only orders where `DriverId == X-User-Id`) and GET /drivers (return own record only) |

### Mismatch 3 — Warehouse CRUD: spec says Manager, backend allows both roles on POST

| | Spec | Backend |
|-|------|---------|
| **Spec wants** | Only Admin + Manager can create/edit/delete warehouses | |
| **Backend has** | mobile-gateway `requireManager` on POST/PUT/DELETE ✓; but warehouse-service controller only checks MANAGER on PUT and DELETE (not POST) | |
| **Impact on mobile** | Consistent at mobile-gateway level (WORKER cannot hit POST); minor inconsistency if calling warehouse-service directly | |
| **Mobile UI gates on** | Mobile-gateway enforcement (MANAGER-only) — consistent with spec | |
| **Recommendation** | Add role check on POST in warehouse-service controller for defence-in-depth |

### Mismatch 4 — Worker order scope not restricted

| | Spec | Backend |
|-|------|---------|
| **Spec wants** | Workers see inventory and orders (but presumably scoped to their warehouse/context) | |
| **Backend has** | GET /orders returns ALL orders regardless of caller role or userId | |
| **Impact on mobile** | Workers see all orders; no filtering by assigned warehouse | |
| **Mobile UI gates on** | **No gate** — mobile shows all orders to both roles |
| **Recommendation** | Accept for now; add optional `?assignedWarehouse=X` query param to order-service in a future iteration |

### Mismatch 5 — Driver fleet self-view not supported

| | Spec | Backend |
|-|------|---------|
| **Spec wants** | Driver can view their own fleet record (vehicle assignment) | |
| **Backend has** | GET /drivers returns all drivers; no user-scoped filter | |
| **Impact on mobile** | A driver user (if role existed) would see all drivers | |
| **Mobile UI gates on** | Skipped (DRIVER role not yet in backend) |
| **Recommendation** | Add GET /drivers/me endpoint returning the driver record matching `X-User-Email` or `X-User-Id` |

### Mismatch 6 — AI feature: spec grants it to Admin + Manager, backend has nothing

| | Spec | Backend |
|-|------|---------|
| **Spec wants** | AI analysis available to Admin and Manager | |
| **Backend has** | No AI service, no `/ai/*` route | |
| **Impact on mobile** | Shell screen with "Feature not available" state; no role gating needed yet |
| **Mobile UI gates on** | **Declared spec** — will gate to MANAGER+ in constants/roles.ts |
| **Recommendation** | Design and build AI service in a future iteration (see ARCHITECTURE_FUTURE.md) |
