# notification-service — Changelog

## 2026-05-17 (b) — Push-notification scaffold

### `device_tokens` table

New table in the notifications DB:

```
device_tokens(
  token       TEXT         PRIMARY KEY,
  user_id     VARCHAR(100) NOT NULL,
  user_email  VARCHAR(255) NOT NULL,
  platform    VARCHAR(20)  NOT NULL,        -- ios | android | web
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_seen   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX device_tokens_user_idx ON device_tokens(user_id);
```

Provisioned automatically on first start by `infrastructure/persistence/db.ts`.

### Endpoints

- `POST /notifications/device-tokens` — body `{ token, platform }`. Reads
  user identity from `X-User-Id` / `X-User-Email` headers (gateway adds them
  from the JWT). Upserts on `token` so re-registration is idempotent.
- `DELETE /notifications/device-tokens/:token` — removes one row; used by
  the mobile client on logout.

### Out of scope (intentional)

The fan-out worker that translates a Kafka notification event into an Expo
push send (`POST https://exp.host/--/api/v2/push/send`) is **not** in this
pass. The shape is ready: `SELECT token FROM device_tokens WHERE user_id = ?`
gives you the recipient list per event. Wire it as a separate Kafka
subscriber when push delivery becomes a priority.

### Restart

```bash
# from services/notification-service/
npm install   # no new deps this pass, but safe to run
npm run build
# kill running, then:
npm start
```

### Verify

```bash
# Via gateway with a logged-in JWT:
curl -i -X POST http://localhost:8090/notifications/device-tokens \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{"token":"ExponentPushToken[xxx]","platform":"ios"}'
# 201 { "status":"registered" }
```

---



## 2026-05-17 — WebSocket JWT validation (closes Gap 8, severity HIGH)

Until today, any client that could reach `ws://host:9091` received every
notification broadcast — no token check, no per-user scoping. This was a
data-leak risk for any non-LAN deployment.

### Changes

- `src/infrastructure/config/config.ts` — added `ws.jwtSecret` (same secret
  auth-service signs tokens with — raw UTF-8 bytes, matches the gateway's
  fix) and `ws.requireAuth` (default `true`, set
  `WS_REQUIRE_AUTH=false` to opt out for offline dev).
- `src/infrastructure/websocket/ws-server.ts` — rebuilt around
  `WebSocketServer({ port, verifyClient })`. The verify callback extracts
  the `?token=…` query parameter and runs `jwt.verify` against the shared
  secret. Missing or invalid tokens close the connection with status 4001
  ("Unauthorized"). Verified claims are stashed on the upgrade request and
  logged on `connection` so we can see *which* user is connected.
- `package.json` — added `jsonwebtoken` + `@types/jsonwebtoken`.

### Per-user message filtering

Out of scope for this pass — the broadcaster still sends every event to
every authenticated client. Now that the connection carries verified
claims (`req.auth = { sub, role, userId }`), per-user filtering is a small
follow-up in `ws-broadcaster.ts` (filter recipients before `ws.send`).

### Restart instructions

```bash
# from services/notification-service/
npm install            # picks up jsonwebtoken
npm run build          # tsc
# kill the running notification-service process, then:
npm start              # or: npm run dev
```

### Verification

```bash
# Should be rejected (close 4001):
websocat ws://localhost:9091

# Should connect (replace TOKEN with a fresh JWT from /auth/login):
TOKEN=...; websocat "ws://localhost:9091/?token=$TOKEN"
```

(Or use the mobile app — `lib/realtime/wsClient.ts` now appends the JWT
automatically; the notifications tab's connection-state indicator should
turn green.)
