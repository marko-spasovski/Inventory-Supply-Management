# Architecture Future — Pocket Logistics Pro

Capabilities not built in this pass but on the roadmap. Each section provides enough design
detail to scope and start the next iteration.

---

## Offline Sync (Full — Phase 2)

### Problem

React Query cache provides read-only offline access. Mutations attempted while offline fail
immediately. The spec requires "save locally and sync later."

### Design

**Local store:** expo-sqlite via `expo-sqlite` (built into Expo, no extra native config).
Alternative: WatermelonDB (better for relational data, heavier setup).
Recommendation: expo-sqlite for simplicity; migrate to WatermelonDB if query complexity grows.

**Outbox queue model:**

```
User action (offline)
  → insert into outbox table: { id, endpoint, method, body, status: 'pending', createdAt, attempts }
  → show optimistic UI immediately (pending badge)

App comes online
  → NetInfo event fires
  → OutboxWorker iterates pending rows oldest-first
  → For each row: POST/PUT to API with Idempotency-Key: row.id header
  → On 2xx: mark row status: 'synced'
  → On 4xx (validation): mark row status: 'failed', store errorMessage
  → On 5xx / network error: increment attempts, schedule retry with exponential backoff (2^n seconds, max 5 retries)
```

**Conflict resolution:** Last-write-wins (LWW). The mobile app is a field client; server state
is authoritative. Mobile writes carry a `clientTimestamp` field; server discards if server
record was modified after `clientTimestamp`. Simpler than CRDT and sufficient for this domain.

**Idempotency keys needed on backend:** (see ARCHITECTURE_GAPS.md Gap 12)
- `POST /stock`
- `POST /orders`
- `POST /warehouses`
- `POST /products`

**UI indicators:**

```
Each record card shows:
  ● grey dot  = synced
  ● orange ⟳  = pending sync
  ● red ✕    = sync failed (tap for error detail + retry button)
```

**Libraries:**
- `@react-native-community/netinfo` — online/offline events
- `expo-sqlite` — local outbox persistence
- No extra background-task lib in this pass (sync runs on foreground resume)

---

## WebSocket Notifications (Full — Phase 2)

### Problem

This pass wires WebSocket as a best-effort direct connection to `ws://host:9091`. The
mobile-gateway does not proxy WS upgrades. Reconnection is manual. No auth on the WS connection.

### Design

**Library:** Native `WebSocket` API (built into React Native). No socket.io-client — the
notification-service uses the `ws` library (plain WebSocket protocol, no socket.io framing).

**Reconnection strategy:**

```typescript
class ReconnectingWs {
  private ws: WebSocket | null = null;
  private retryDelay = 1_000;      // starts at 1 s
  private maxDelay   = 60_000;     // cap at 60 s
  private destroyed  = false;

  connect(url: string, token: string) {
    this.ws = new WebSocket(`${url}?token=${token}`);  // JWT in query param
    this.ws.onopen    = () => { this.retryDelay = 1_000; }
    this.ws.onclose   = () => { if (!this.destroyed) this.scheduleReconnect(); }
    this.ws.onmessage = (e) => this.handleMessage(e.data);
  }

  private scheduleReconnect() {
    setTimeout(() => this.connect(...), this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, this.maxDelay);
  }

  destroy() { this.destroyed = true; this.ws?.close(); }
}
```

**Channel / topic model:** Currently notification-service broadcasts ALL events to ALL clients.
Future: add `?role=MANAGER` or `?userId=X` filter in the WS upgrade handler so each client only
receives relevant events.

**Cache invalidation on push received:**

```typescript
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.topic) {
    case 'order.created':
    case 'order.status.changed':
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      break;
    case 'inventory.low':
    case 'inventory.out':
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      break;
  }
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
};
```

**Fallback to polling:** When WS connection fails after max retries, fall back to
`GET /notifications` every 30 seconds. Show a "Live updates unavailable" banner.

**Backend change needed for authentication:**
Add JWT verification to the WS upgrade handler in `ws-server.ts`:
```typescript
this.wss.on('upgrade', (req, socket, head) => {
  const token = new URL(req.url, 'ws://base').searchParams.get('token');
  try { verifyToken(token); } catch { socket.destroy(); return; }
  this.wss.handleUpgrade(req, socket, head, (ws) => this.wss.emit('connection', ws, req));
});
```

---

## Barcode Scanner Full Flow (Phase 2)

### Problem

Scanner screen is a shell this pass. Product lookup by barcode is not possible without a
backend endpoint.

### Design

**expo-camera + expo-barcode-scanner setup:**
```typescript
// app.config.ts permissions
{
  "ios":     { "infoPlist": { "NSCameraUsageDescription": "Skeniranje črtnih kod" } },
  "android": { "permissions": ["CAMERA"] }
}
```

**Permission flow:**
```typescript
const { status, requestPermission } = useCameraPermissions();
if (status !== 'granted') return <PermissionRequest onRequest={requestPermission} />;
```

**Lookup flow:**
```
Camera detects barcode → scannedCode (string)
  → GET /products/by-sku?sku={scannedCode}   ← requires Gap 5 to be resolved
  → if 200: navigate to ProductDetail screen with product data
  → if 404: show "Produkt ni najden" with manual entry option
  → if offline: search local React Query cache for matching SKU
```

**Add-to-order shortcut:**
```
Scanner invoked from OrderCreate screen
  → scanned product pre-fills the product picker
  → no navigation change, just state update
```

**Add-to-inventory shortcut:**
```
Scanner invoked from AddStock screen
  → scanned product pre-fills productId field
```

**Manual entry fallback:**
```
TextInput: "Vnesite SKU ročno"
  → triggers same lookup flow as scanner
```

**Backend change required:** `GET /products/by-sku?sku={sku}` in product-service +
mobile-gateway route `GET /products/by-sku` → product-service (no auth restriction needed for read).

---

## AI Analysis (Phase 3)

### Approach (TBD — pending user direction)

Two options:
1. **External LLM:** Call Anthropic/OpenAI API from a new `ai-service`. Send inventory snapshot
   as context. Stream response to mobile. Costs per call.
2. **Rule-based analysis service:** Compute low-stock ratios, reorder suggestions, and trend
   deltas in a new service without LLM. Deterministic, free, faster. Less "AI" in the marketing sense.

### Endpoint Contract Sketch

```
GET /ai/inventory-summary
Authorization: Bearer <manager-token>

Response 200:
{
  "generatedAt": "2026-05-14T10:00:00Z",
  "summary": "15 produktov je pod minimalno zalogo...",
  "alerts": [
    { "productId": "...", "productName": "...", "warehouseId": "...", "currentQty": 5, "minQty": 20 }
  ],
  "reorderSuggestions": [
    { "productId": "...", "suggestedQty": 50 }
  ]
}

Response 503: { "error": "AI service unavailable" }
```

**Streaming vs single-response:** Single response for initial implementation (simpler error
handling). Upgrade to SSE streaming for long LLM responses.

**Error handling for AI timeouts:** Client shows spinner for max 10 seconds, then falls back
to the last cached response with a "Zastareli podatki" banner. Backend: 30s timeout on LLM call,
return 503 if exceeded.

**Mobile screen (shell this pass):**
- Loading state: skeleton card with spinner
- Data state: summary text + alert cards + one-tap reorder button per alert
- Error state: "AI analiza trenutno ni na voljo" with retry button

---

## Push Notifications — Out-of-App (Phase 3)

### Problem

WebSocket only delivers notifications when the app is foregrounded. The spec implies drivers
and workers should be alerted even when the app is in the background.

### Design

**expo-notifications + APNS/FCM:**

```typescript
// Register on login
const token = await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig.extra.eas.projectId });
await api.auth.registerPushToken(token.data);  // POST /users/push-token (new endpoint)
```

**Backend change required:** New endpoint `POST /auth/users/push-token` to store the Expo push
token against the user ID. Notification-service sends push via Expo Push API when a Kafka event
fires, targeting the relevant user's stored token.

**Notification → deep link flow:**
```
FCM/APNS delivers notification
  → Notifications.addNotificationResponseReceivedListener
  → data.screen = 'orders' | 'stock' | 'notifications'
  → router.push(`/(tabs)/${data.screen}`)
```

---

## Role-Based UI Extension — How to Add a New Role in 3 Files

When ADMIN and DRIVER roles are added to the backend:

**File 1: `constants/roles.ts`**
```typescript
export enum Role { MANAGER = 'MANAGER', WORKER = 'WORKER', ADMIN = 'ADMIN', DRIVER = 'DRIVER' }

export const FEATURE_MATRIX: Record<Role, Set<FeatureKey>> = {
  [Role.ADMIN]:   new Set([...ALL_FEATURES]),
  [Role.MANAGER]: new Set(['AUTH', 'PRODUCTS', 'WAREHOUSES', 'INVENTORY', 'ORDERS', 'NOTIFICATIONS', 'SCANNER', 'OFFLINE', 'FLEET', 'AI']),
  [Role.WORKER]:  new Set(['AUTH', 'INVENTORY', 'ORDERS', 'NOTIFICATIONS', 'SCANNER', 'OFFLINE']),
  [Role.DRIVER]:  new Set(['AUTH', 'ORDERS', 'NOTIFICATIONS', 'FLEET_SELF']),
};
```

**File 2: `stores/authStore.ts`**
```typescript
// Add ADMIN and DRIVER to the Role type union — no other change needed
```

**File 3: `lib/http/client.ts` (mobile-gateway auth middleware)**
```typescript
// mobile-gateway/src/middleware/auth.middleware.ts
// Add ADMIN | DRIVER to JwtPayload.role union
// Update requireManager to also allow ADMIN
```

No screen-level changes needed if `<RoleGate>` and `useHasFeature()` are already used consistently.
