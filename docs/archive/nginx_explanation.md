# nginx.conf Explanation

There are two separate nginx configuration files in this project, each serving a different container with a different role.

---

## 1. `nginx.conf` (root of the project)

**Container:** `nginx` (defined in `compose.yaml`)
**Accessible at:** `http://localhost:8888`
**Status:** Currently unused / dead

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://172.20.10.3:4200;
        ...
    }

    location /api/ {
        proxy_pass http://172.20.10.3:8080/;
        ...
    }
}
```

### What it does
This was the **original single entry point** for the whole application. The browser would hit port 80 (or 8888 as mapped in Docker) and nginx would route traffic to two destinations:

| Location | Destination | What it is |
|---|---|---|
| `/` | `172.20.10.3:4200` | Old Angular monolithic frontend (`ng serve`) |
| `/api/` | `172.20.10.3:8080` | Web gateway (Spring Cloud Gateway) |

### Why it's dead
- `172.20.10.3` is a hardcoded local network IP from a hotspot/shared network used during development. It no longer points to anything.
- Port `4200` was Angular's dev server. The Angular app has been replaced by the React micro-frontends.
- Nobody currently accesses `localhost:8888`.

### The WebSocket headers
The `location /` block has extra headers (`Upgrade`, `Connection`, `proxy_cache_bypass`) because Angular's dev server uses WebSockets for live reload. These are not needed for a production build.

---

## 2. `micro-frontends/shell/nginx.conf`

**Container:** `shell` (built from `micro-frontends/shell/Dockerfile`)
**Accessible at:** `http://localhost:3000`
**Status:** Active — this is the real entry point

```nginx
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### What it does

| Location | Destination | What it is |
|---|---|---|
| `/api/` | `127.0.0.1:8080` | Web gateway (Spring Cloud Gateway) |
| `/` | Static files in `/usr/share/nginx/html` | Built React shell app |

### Key details

- **`listen 3000`** — nginx listens on port 3000 inside the container. The container runs with `network_mode: host` so port 3000 is directly exposed on the host machine.
- **`root /usr/share/nginx/html`** — serves the compiled React build (the output of `npm run build` copied in by the Dockerfile).
- **`try_files $uri $uri/ /index.html`** — standard SPA fallback. If the browser navigates to `/orders` or any client-side route, nginx serves `index.html` and lets React Router handle the routing. Without this, a page refresh on any route other than `/` would return a 404.
- **`proxy_pass http://127.0.0.1:8080/`** — API calls from the browser go to `/api/something`, nginx strips `/api/` and forwards the rest to the web gateway. This means the browser only ever talks to port 3000 — it never needs to know the gateway exists on port 8080.

---

## Summary

| | `nginx.conf` (root) | `shell/nginx.conf` |
|---|---|---|
| Container | `nginx` | `shell` |
| Port | 8888 (host) → 80 (container) | 3000 (host network) |
| Serves | Nothing (dead) | React shell app |
| Proxies `/api/` to | `172.20.10.3:8080` (broken) | `127.0.0.1:8080` (working) |
| Frontend target | Angular :4200 (gone) | Built React static files |
| Status | Unused | Active entry point |
