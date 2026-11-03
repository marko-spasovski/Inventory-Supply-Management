# Local dev recipe — iPhone testing via ngrok + Expo tunnel

When your laptop and iPhone are on the same Wi-Fi router, `npx expo start`
and a `.env` with the laptop's LAN IP are enough. When you can't get on a
shared router — coffee shop, conference, **iOS Personal Hotspot** — the
phone can't reach the laptop's services even though both are "online".
This recipe routes both Metro (the JS bundler) and the gateway through
public tunnels so the phone hits them over the internet.

> **Why iOS Personal Hotspot is the worst case.** Apple enables
> *client isolation* on Personal Hotspot. Devices connected to the
> hotspot can reach the internet through the iPhone, but they cannot see
> each other. So your laptop can talk to the world, the iPhone can talk
> to the world, but they can't talk to *each other*. The fix below
> bounces traffic out to ngrok's servers and back.

---

## 1. One-time setup

### Accounts

- **ngrok account** — free tier is plenty.
  <https://dashboard.ngrok.com/signup>
  Copy your **authtoken** from <https://dashboard.ngrok.com/get-started/your-authtoken>.

### Local install

```bash
# ngrok (Linux)
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Or via snap / brew on macOS — whatever you have

# Authenticate (one-time)
ngrok config add-authtoken <token-from-dashboard>
```

Verify:
```bash
ngrok version       # ≥ 3.x
ngrok diagnose      # should print all green
```

### iPhone

- Install **Expo Go** from the App Store.
- Sign in (optional — lets the QR scanner show your projects directly).

---

## 2. The flow at a glance

```
iPhone ──(internet via your hotspot)── Expo Tunnel ──(ngrok)── Metro on laptop
   │
   └──(internet via your hotspot)── your ngrok ──(http)── mobile-gateway on laptop
                                                              │
                                                              └── auth-service, product-service, … (host)
```

Two tunnels, two URLs:
1. **Metro bundler** — Expo runs an embedded tunnel for you when you pass
   `--tunnel`. URL looks like `https://<random>.exp.direct`.
2. **mobile-gateway** — *you* run `ngrok http 8090`. URL looks like
   `https://<random>.ngrok-free.dev`.

---

## 3. Step-by-step

### 3.1 Make sure the backend is up locally

```bash
docker ps    # mobile-gateway should be running on port 8090
curl http://localhost:8090/health
# {"status":"ok","service":"mobile-gateway", ...}
```

If `mobile-gateway` isn't running, start it from the backend repo:
```bash
docker compose -f /path/to/Inventory-Supply-Management/compose.yaml up -d mobile-gateway
```

### 3.2 Start the gateway tunnel

```bash
ngrok http 8090
```

ngrok prints something like:

```
Forwarding   https://catchable-coastline-provoking.ngrok-free.dev -> http://localhost:8090
```

**Copy that HTTPS URL** — you'll paste it into `.env` next. Leave the
terminal open; closing it kills the tunnel.

> **Want to inspect every request the phone makes?** Open
> <http://localhost:4040> in the laptop's browser. ngrok's web inspector
> shows headers, bodies, response codes for every call — invaluable for
> debugging the mobile app.

### 3.3 Update `.env` in the mobile project

`pocket-logistics-pro-expo/.env`:

```
EXPO_PUBLIC_API_URL=https://catchable-coastline-provoking.ngrok-free.dev
EXPO_PUBLIC_WS_URL=wss://catchable-coastline-provoking.ngrok-free.dev/ws
```

Notes:
- `https://` for REST, `wss://` for WebSocket — ngrok terminates TLS.
- Same hostname for both: the mobile-gateway now proxies WS at `/ws` so
  there's no separate port (closed Gap 7).
- The free-tier URL is **ephemeral** — restart ngrok, get a new URL,
  re-edit `.env`.

### 3.4 Start Expo with its tunnel

In a *different* terminal (so ngrok keeps running):

```bash
cd pocket-logistics-pro-expo
npx expo start --tunnel --clear
```

First run installs `@expo/ngrok` automatically (one-time, ~10 s). When it's
ready you'll see:

```
› Metro waiting on exp://<random>.exp.direct
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

The `--clear` flag flushes Metro's cache so the new `.env` is picked up.

### 3.5 Scan + run on the iPhone

- Open the iPhone **Camera** app → point at the QR. Tap the "Open in
  Expo Go" notification banner.
- Expo Go shows "Opening project..." for **2–5 minutes** the first time
  (downloading the JS bundle over the tunnel). Subsequent re-opens are
  instant — the bundle is cached.
- Watch the Metro terminal for `iOS Bundling /app/_layout.tsx ...` —
  that's the confirmation the phone actually connected.

Login with the test account I created earlier: `smoke-mgr@test.local` /
`smoke1234`. Or register a new one in-app.

---

## 4. Troubleshooting

### "Opening project..." never finishes

- **Metro terminal shows only `Web Bundled ...` lines** → the phone never
  connected. Cause is almost always: you forgot `--tunnel`, OR the iPhone
  killed the Expo Go process.
- **Force-quit Expo Go** (swipe up + flick away) and re-scan QR.

### "Network request failed" inside the app

- Open <http://localhost:4040> on the laptop — did the request even reach
  ngrok? If not, the app is still pointed at the old LAN IP. Check
  `.env`, then restart Metro with `--clear`.
- If you see the request reach ngrok but get a 502, the gateway crashed.
  `docker logs mobile-gateway`.

### Random "ngrok browser warning" HTML in your axios responses

You shouldn't see this — the mobile app sends `ngrok-skip-browser-warning: 1`
on every request (set in `lib/http/client.ts`). If you see it from `curl`
or browser direct hits, add the header manually.

### The ngrok URL changed after a restart and now nothing works

ngrok's free tier rotates URLs every restart. Each time you restart
`ngrok http 8090`:
1. Copy the new URL.
2. Paste into `.env`.
3. Ctrl-C Metro, restart with `npx expo start --tunnel --clear`.

For a **stable URL** that survives restarts, ngrok offers reserved
domains on the Personal tier (€8/mo at time of writing). Not needed for
thesis work.

### Login works but data calls return 401 "Invalid token"

That means the gateway's `JWT_SECRET` doesn't match what `auth-service`
signs with. See `mobile-gateway/CHANGELOG.md` entry **2026-05-17 (a)** —
make sure both use the same UTF-8 string (not base64-decoded).

### WebSocket fails

- The mobile UI's bottom-of-screen indicator shows red/grey/green:
  `V živo` (connected) / `Posodobitve vsakih 30 s` (polling fallback
  active) / loading.
- Polling fallback always works — even when WS is down, the notifications
  list refreshes every 30 s, so the app is still usable.
- If you need WS specifically: `notification-service` has to be running
  locally AND the gateway has to be rebuilt with the WS proxy
  (`docker compose up -d --build mobile-gateway`).

### Expo Go shows a red error screen with a stack trace

The `ErrorBoundary` (top-level component) catches render-time crashes and
shows app slug / version / platform on the recovery screen. Tap "Poskusi
znova" to reset. Real crashes also show in the Metro terminal — copy the
stack from there.

---

## 5. Daily flow once it's set up

```bash
# Terminal 1 — start backend (if not already running)
docker compose -f /path/to/compose.yaml up -d

# Terminal 2 — gateway tunnel
ngrok http 8090
# → copy https://<new-url>.ngrok-free.dev

# Update .env if URL changed (free-tier rotates)
# pocket-logistics-pro-expo/.env
EXPO_PUBLIC_API_URL=https://<new-url>.ngrok-free.dev
EXPO_PUBLIC_WS_URL=wss://<new-url>.ngrok-free.dev/ws

# Terminal 3 — Expo with tunnel
cd pocket-logistics-pro-expo
npx expo start --tunnel --clear

# Scan QR on iPhone → wait for bundle → use the app
```

---

## 6. When you DON'T need this dance

| Scenario | What works |
|---|---|
| Laptop + iPhone on the same Wi-Fi router (home, office) | LAN IP + `npx expo start` (no tunnel, no ngrok) |
| iPhone Personal Hotspot | This guide |
| Public Wi-Fi with client isolation | This guide |
| You only care about the web target | `npx expo start --web` → browser at `localhost:8088`, no tunnel needed |
| You're testing against the OpenShift deployment | Point `.env` at the public Route URL (see `naloga8-guidelines.md`), no ngrok needed |
| You want to test on a friend's iPhone over the internet | This guide — they install Expo Go, you share the Expo tunnel URL |

---

## 7. Why the gateway tunnels (not a per-service tunnel)

Every backend call from the phone goes through `mobile-gateway` on port
8090. The gateway hides the 9-service backend behind a single endpoint.
**One tunnel is enough.** You never need separate ngrok tunnels for
`auth-service`, `product-service`, etc. — the phone never talks to them
directly.

Same for WebSockets — once Gap 7 closed (gateway proxies WS at `/ws` on
8090), there's no separate notification-service port to expose.

---

## 8. Cost / quota note (ngrok free tier)

- **1 simultaneous tunnel** per account.
- **40 connections / minute** sustained, **120 / minute** burst — fine for
  one phone testing one app.
- **URL rotates** on every `ngrok http ...` restart.
- **TLS** included; you always get an `https://` URL.

For 8€/mo Personal tier you get reserved subdomains, multiple simultaneous
tunnels, and higher throughput. Not necessary for thesis dev work.
