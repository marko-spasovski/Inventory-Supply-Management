# Run the mobile app over tunnels (cloudflared)

Concise recipe for running Expo Go on a phone that is **not** on the same
LAN as your laptop (cellular, iOS Personal Hotspot, café Wi-Fi). For the
ngrok variant and deep troubleshooting, see `ngrok-expo-ios.md`.

## Why two tunnels

`npx expo --tunnel` and a gateway tunnel solve **two different problems**:

```
phone ──exp.direct (Expo tunnel)──► Metro on laptop        # downloads the JS bundle
phone ──trycloudflare (cloudflared)──► mobile-gateway:8090 # all REST + WS calls
                                            └─► auth/product/order/... services
                                            └─► /ws ──► notification-service:9091
```

- **Expo `--tunnel`** only ships the JS bundle to Expo Go. It does **not**
  expose your backend. With only this, the app loads but every API call
  fails with `Network Error` — the phone can't reach `localhost:8090`.
- **cloudflared** publishes the gateway so the phone can reach it over the
  internet. You point `EXPO_PUBLIC_API_URL` at that URL.
- **WebSocket needs no extra tunnel.** The gateway proxies WS at `/ws`
  (`mobile-gateway/src/index.ts`), so it rides the same cloudflared origin.
  cloudflared upgrades WebSockets automatically. The mobile WS URL is
  *derived* from `EXPO_PUBLIC_API_URL` (`lib/http/client.ts`): `http→ws` +
  `/ws`. You only set `EXPO_PUBLIC_WS_URL` if you tunnel WS separately.

## One-time setup

```bash
# Fedora
sudo dnf install cloudflared
# or: download the binary from
# https://github.com/cloudflare/cloudflared/releases
cloudflared --version
```

`trycloudflare` quick tunnels need **no account and no login**.

## Each session

```bash
# 1. Backend up (from ../Inventory-Supply-Management-Backend)
docker compose up -d            # or: up -d mobile-gateway notification-service ...
curl http://localhost:8090/health   # {"status":"ok","service":"mobile-gateway",...}

# 2. Tunnel the gateway — leave this terminal open
cloudflared tunnel --url http://localhost:8090
# prints:  https://<random-words>.trycloudflare.com   ← copy this

# 3. Point the app at it (mobile/.env)
#    EXPO_PUBLIC_API_URL=https://<random-words>.trycloudflare.com
#    (no trailing slash, no path — the client adds /stock, /orders, /ws itself)

# 4. Start Expo with its own tunnel (separate terminal)
npx expo start --tunnel --port 19000 --clear
# scan the QR with Expo Go (Android) / Camera (iOS)
```

`EXPO_PUBLIC_*` vars are inlined at bundle time, so after editing `.env`
**restart Expo with `--clear`** — a hot reload won't pick it up.

## Notes & gotchas

- **Ephemeral URL.** Each `cloudflared tunnel --url ...` restart gives a new
  `trycloudflare.com` host → update `.env` and restart Expo `--clear`.
  For a stable host, use a named tunnel (`cloudflared tunnel create`) bound
  to a Cloudflare-managed domain.
- **Network Error after bundle loads** → almost always `.env` not picked up
  (forgot `--clear`) or gateway/tunnel down. `curl https://<host>.trycloudflare.com/health`.
- **WS status** shows in the app footer: `V živo` (connected) vs
  `Posodobitve vsakih 30 s` (polling fallback). Polling keeps notifications
  working even if WS is blocked, so the app stays usable.
- For WS specifically, `notification-service` (:9091) must be running so the
  gateway's `/ws` proxy has an upstream.
- The client already sends `ngrok-skip-browser-warning: 1`
  (`lib/http/client.ts`) — harmless on cloudflared, needed if you switch to
  ngrok.

## Same LAN? Skip the tunnels

If laptop and phone share a Wi-Fi router, just set
`EXPO_PUBLIC_API_URL=http://<laptop-LAN-IP>:8090` and run `npx expo start`
(no `--tunnel`, no cloudflared).
