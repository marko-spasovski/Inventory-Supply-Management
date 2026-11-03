# iPhone dev tunneling — Cloudflare (gateway) + Expo tunnel (Metro)

The working two-tunnel setup for testing the mobile app on a real iPhone
when your only internet is the iPhone's Personal Hotspot. Distilled from
the trial-and-error of getting it actually working.

> Companion to `ngrok-expo-ios.md` — that one covers the ngrok-for-gateway
> variant. This one covers the **Cloudflare-for-gateway, Expo-tunnel-for-Metro**
> variant, which is more robust (no ngrok account collision, QR works
> without URL-scheme tricks).

---

## 1. The problem in one diagram

```
                                         ┌── trycloudflare.com ──┐
iPhone (Expo Go) ──── *.exp.direct ───┐  │                       ▼
                                      ▼  │            laptop:8090  (mobile-gateway → 9 microservices)
                                 laptop:19000 (Metro)
```

Two separate things have to be reachable from the iPhone:

| What | What carries it | Why |
|---|---|---|
| **JS bundle** | Metro on `localhost:19000` | First load + every code change |
| **REST + WebSocket** | mobile-gateway on `localhost:8090` | Every API call once the app is running |

On iPhone Personal Hotspot, **client isolation** blocks the phone from reaching
either of those on the laptop's LAN address. Both have to leave the laptop,
hit the public internet, and come back through cellular. Hence two tunnels.

---

## 2. Why one tunnel isn't enough

- **ngrok free tier = 1 simultaneous tunnel per account.** If you use it for
  the gateway, `npx expo start --tunnel` (which spawns `@expo/ngrok` under
  the hood) crashes with
  `TypeError: Cannot read properties of undefined (reading 'body')`
  — that's `@expo/ngrok` mishandling the "you already have a tunnel" 4xx.
- You can't use a single tunnel for both — they listen on different ports.

So **one of the two tunnels must go through a different service**. Cloudflare's
"quick tunnels" (`trycloudflare.com`) are free, account-less, and have no
concurrency cap. Put Cloudflare on the gateway, leave ngrok-via-Expo for
Metro.

---

## 3. One-time install

```bash
# cloudflared (Cloudflare tunnel CLI)
curl -L -o /tmp/cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i /tmp/cloudflared.deb
cloudflared --version
```

- **Apt doesn't have it** by default — `sudo apt install cloudflared` fails.
  The `.deb` above is the path of least resistance.
- ngrok is *not* required for this setup, but if you already have it for
  other things, it doesn't hurt.
- Make sure the `mobile-gateway` Docker container is running on port 8090
  before starting Cloudflare:
  ```bash
  docker compose -f .../Inventory-Supply-Management/compose.yaml up -d mobile-gateway
  curl http://localhost:8090/health
  ```

---

## 4. The daily flow — two terminals

### Terminal 1 — Cloudflare for the gateway

```bash
cloudflared tunnel --url http://localhost:8090
```

Wait ~5 seconds. It prints:

```
INF | Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):
INF | https://random-words-here.trycloudflare.com
```

**Copy that URL.** Leave the terminal running — closing it kills the tunnel.

> The UDP-buffer / ICMP `WRN` lines in cloudflared's output are cosmetic.
> They warn about `cloudflared`'s optional ICMP-proxy feature; HTTP/HTTPS
> tunneling still works perfectly.

### Update `.env`

In `pocket-logistics-pro-expo/.env`:

```
EXPO_PUBLIC_API_URL=https://random-words-here.trycloudflare.com
EXPO_PUBLIC_WS_URL=wss://random-words-here.trycloudflare.com/ws
```

Both lines on the same hostname — `https://` for REST, `wss://` for
WebSocket. The `/ws` path on the WS line is because the gateway proxies
WebSocket upgrades at `/ws` (closes Gap 7 — see the architecture docs).

### Verify the gateway is reachable through the tunnel

```bash
curl -sS https://random-words-here.trycloudflare.com/health
# → {"status":"ok","service":"mobile-gateway","version":"1.0.0",...}
```

If you get that JSON, the phone will too.

### Terminal 2 — Expo with its own tunnel

```bash
cd pocket-logistics-pro-expo
npx expo start --tunnel --port 19000 --clear
```

- `--tunnel` — uses `@expo/ngrok` (your ngrok account, now unused, so it
  succeeds).
- `--port 19000` — pinned to avoid colliding with `auth-service:8081` and
  `notification-service:8088`.
- `--clear` — flushes Metro cache so the new `.env` is picked up.

You'll see:

```
› Metro waiting on exp://<random>.exp.direct
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

### Scan with iOS Camera

Just point the **iPhone Camera** at the QR.

`*.exp.direct` is a Universal Link Expo Go has registered with iOS — so
the OS opens it in Expo Go directly, **never Safari**. No `to-exp`
redirect, no `exp://` scheme manipulation, no QR generators.

App loads → calls the Cloudflare URL for every API request → backend
responds. Done.

---

## 5. Restart / URL rotation

Every time you restart `cloudflared`, the trycloudflare URL changes (free
tier). Routine:

1. `Ctrl-C` Cloudflare → restart `cloudflared tunnel --url http://localhost:8090` → copy new URL.
2. Edit `.env` (both lines).
3. `Ctrl-C` Metro → `npx expo start --tunnel --port 19000 --clear` → re-scan QR.

Expo's `exp.direct` URL also changes per restart, but that's transparent
because you re-scan the QR each session anyway.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `TypeError: Cannot read properties of undefined (reading 'body')` from Expo | Another ngrok tunnel is running, ngrok account at its 1-tunnel limit | `pkill -f "ngrok http"` then retry; or use Cloudflare for the gateway (this guide) |
| Cloudflare URL returns 502 | `mobile-gateway` not actually listening on 8090 | `docker ps` → start the gateway container |
| Cloudflare URL returns 200 from laptop but timeout from phone | Phone has lost cellular connectivity | Reconnect phone to internet; re-check by opening the URL in iPhone Safari |
| iPhone Camera opens Safari for the cloudflared URL instead of Expo Go | You scanned the **gateway** URL, not the **Metro** QR | The cloudflared URL is plain HTTPS — meant for axios, not for opening in Expo Go. Scan the QR from Expo's terminal output, which uses `*.exp.direct` |
| App loads, login succeeds, but data calls fail | `.env` not picked up — Metro was started before `.env` was edited | `Ctrl-C` Metro, `npx expo start --tunnel --port 19000 --clear` (the `--clear` is essential) |
| App opens but WS indicator stays "polling fallback" | `notification-service` not running, or gateway-proxied `/ws` not working | Check `docker ps` for notification-service; in browser: `curl -i -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: x" -H "Sec-WebSocket-Version: 13" https://<cf-url>/ws` should return 101 |
| Cloudflared warns about UDP buffer size or ICMP `ping_group_range` | Linux kernel sysctls — `cloudflared`'s optional ICMP proxy disabled | Ignore; doesn't affect HTTP/HTTPS tunneling |
| Expo Go iOS doesn't have a built-in QR scanner | Apple removed it in recent SDKs for App Store compliance | Use iOS Camera (works because Expo's QR uses `*.exp.direct` Universal Link) |

---

## 7. Why not just one tunnel?

Question we revisited a lot. Why not skip Cloudflare entirely and let the
phone reach the gateway over the hotspot LAN, using only Expo's tunnel for
Metro?

| Setup | Phone → Metro | Phone → Gateway | Verdict |
|---|---|---|---|
| Same Wi-Fi router | LAN IP works | LAN IP works | **No tunnel needed at all.** `npx expo start --port 19000` + `.env` with laptop's LAN IP |
| iPhone Personal Hotspot | LAN blocked (client isolation) | Sometimes works (try `http://172.20.10.x:8090/health` in iPhone Safari) | If gateway is reachable: one tunnel (Expo) — set `.env` to LAN IP. If not: two tunnels (this guide) |
| Public Wi-Fi with isolation | LAN blocked | LAN blocked | Two tunnels (this guide) |
| You want to share with someone off-network | Need tunnel | Need tunnel | Two tunnels (this guide) |

**Test which case you're in:** open `http://<laptop-LAN-IP>:8090/health` in
iPhone Safari. If JSON loads, your phone can talk to the gateway over the
LAN and you only need a tunnel for Metro. If it times out, follow this
guide.

---

## 8. Variant — keep ngrok for the gateway (stable URL)

If you have a **reserved subdomain** on ngrok (e.g.
`catchable-coastline-provoking.ngrok-free.dev`), keeping ngrok on the
gateway means `.env` never needs to change across sessions. Then put
**Cloudflare on Metro** instead:

```bash
# Terminal 1 — gateway via ngrok (stable URL)
ngrok http 8090
# .env already pinned to your reserved subdomain — leave alone

# Terminal 2 — Metro via Cloudflare
cloudflared tunnel --url http://localhost:19000

# Terminal 3 — Expo (no --tunnel flag; Cloudflare exposes the local port)
cd pocket-logistics-pro-expo
npx expo start --port 19000 --clear
```

Downside: the Metro side has no built-in QR mechanism with `*.exp.direct`
— you have to manually open the cloudflared URL in Expo Go (via the
Expo-account login flow described in `ngrok-expo-ios.md` §A, since
recent Expo Go iOS removed the in-app URL field). For pure ease of
QR-scanning, the layout in this guide (Cloudflare on gateway, Expo
tunnel on Metro) is the smoother flow.

---

## 9. When you don't need any of this

Once you deploy the backend to OpenShift (see `naloga8-guidelines.md`),
the gateway lives behind a public OpenShift Route URL — no tunnel needed.
The mobile `.env` then just points at that Route and stays there. You'd
still want Expo's tunnel only if you're testing off-network; on your home
Wi-Fi you can use plain `npx expo start` again.

So this whole tunneling dance is **dev-time only, hotspot-only**. The
production path is:

```
iPhone (App Store / TestFlight build) ──► https://api.yourdomain.com (OpenShift Route)
                                          ──► mobile-gateway ──► microservices
```

---

## 10. TL;DR cheat sheet

```bash
# A — install once
curl -L -o /tmp/cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i /tmp/cloudflared.deb

# B — every dev session
# (1) gateway tunnel
cloudflared tunnel --url http://localhost:8090
# copy https://<random>.trycloudflare.com

# (2) .env
# pocket-logistics-pro-expo/.env:
#   EXPO_PUBLIC_API_URL=https://<random>.trycloudflare.com
#   EXPO_PUBLIC_WS_URL=wss://<random>.trycloudflare.com/ws

# (3) Expo
cd pocket-logistics-pro-expo
npx expo start --tunnel --port 19000 --clear

# (4) iPhone — Camera → scan QR → opens in Expo Go
```

Three commands, one `.env` edit, one QR scan. That's it.
