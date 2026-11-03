# Naloga 8 — OpenShift deployment guide (1. način)

End-to-end recipe for putting the whole Inventory-Supply-Management system on
**Red Hat OpenShift Developer Sandbox** using the manual "Container Images"
flow (1. način). Mobile app is **not** deployed to OpenShift — it runs on
your phone and points at the OpenShift-exposed mobile-gateway URL.

> The naloga rubric: working end-to-end across mobile + web, AI integration
> live against Azure, SKU scanner working, deployment **ready** for
> OpenShift (Dockerfiles + manifests / manual import). Actual deploy to
> production OpenShift is not required — Sandbox is acceptable.

---

## 0. Time budget

| Step | Estimated time | Cumulative |
|---|---|---|
| 1. Register accounts (Sandbox + Docker Hub) | 10 min | 0:10 |
| 2. Build + tag + push all 18 images | 45 min | 0:55 |
| 3. Deploy 8 PostgreSQL databases | 25 min | 1:20 |
| 4. Deploy Kafka + Zookeeper | 25 min | 1:45 |
| 5. Deploy 9 backend services | 75 min | 3:00 |
| 6. Deploy 2 gateways + 8 micro-frontends | 60 min | 4:00 |
| 7. Expose Routes + point mobile app | 15 min | 4:15 |
| 8. End-to-end smoke test | 30 min | 4:45 |

Realistically: **half a day** for the first attempt, less if you re-deploy.
The Sandbox session expires every 30 days (re-extendable), so document your
deployment steps so you can re-run them after extension.

---

## 1. What the system contains

### Microservices (back end) — 9 total

| Service | Language | Internal port | Dockerfile |
|---|---|---|---|
| `auth-service`          | Java / Spring  | 8081 | ✓ |
| `company-service`       | Java / Spring  | 8082 | ✓ |
| `fleet-service`         | C# / .NET      | 8083 | ✓ |
| `warehouse-service`     | Java / Spring  | 8084 | ✓ |
| `product-service`       | C# / .NET      | 8085 | ✓ |
| `inventory-service`     | Java / Spring  | 8086 | ✓ |
| `order-service`         | C# / .NET      | 8087 | ✓ |
| `notification-service`  | Node / TS      | 8088 + WS 9091 | ✓ |
| `ai-service`            | Node / TS      | 8089 | ✓ |

### Gateways — 2 total

| Service | Internal port | Notes |
|---|---|---|
| `web-gateway`           | (varies)      | Angular shell talks here |
| `mobile-gateway`        | 8090          | **must be Exposed (Route)** — phone hits this |

### Web micro-frontends — 8 total

`shell`, `auth-mf`, `companies-mf`, `fleet-mf`, `inventory-mf`, `orders-mf`,
`products-mf`, `warehouses-mf` — each is a tiny nginx container on port 80
internally.

### Infrastructure pods

- **Kafka + Zookeeper** — used by notification-service and inventory→warehouse
  threshold events
- **8 × PostgreSQL** — one DB per service: `auth, company, fleet, warehouse,
  product, inventory, order, notifications`

### Out of scope for OpenShift

- `pocket-logistics-pro-expo` (Expo mobile) — installed on the phone via
  Expo Go / TestFlight, not as a container.

---

## 2. Prerequisites

### Accounts you need

1. **Red Hat Developer Sandbox** — free, 30-day renewable.
   <https://developers.redhat.com/developer-sandbox>
   After login you get two projects:
   `<your-handle>-dev` and `<your-handle>-stage`. Use `-dev`.
2. **Docker registry** — pick one:
   - Docker Hub: <https://hub.docker.com/> (public images, free).
   - Quay.io: <https://quay.io/> (Red Hat's, integrates nicely with Sandbox).

   Either way, log in locally:
   ```bash
   docker login                 # Docker Hub
   # or
   docker login quay.io         # Quay
   ```

### CLI tools (optional but useful)

- `oc` (OpenShift CLI) — `https://access.redhat.com/downloads/content/290/`
  Lets you script the manual steps below. Sandbox UI is enough for 1. način.
- `docker` ≥ 20 — already installed; check `docker --version`.

---

## 3. Build and push all images

The whole project repo is at
`erp-inventory/Inventory-Supply-Management/`. From that directory:

### 3.1 Set your registry once

```bash
export REG=docker.io/<your-dockerhub-username>     # or quay.io/<you>
export TAG=v1                                       # bump for each redeploy
```

### 3.2 One-shot build + push script

Save as `push-all.sh` next to `compose.yaml`:

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${REG:?set REG=docker.io/<user> first}"
: "${TAG:?set TAG=v1 first}"

# (service-folder, image-name)
COMPONENTS=(
  "services/auth-service           auth-service"
  "services/company-service        company-service"
  "services/fleet-service          fleet-service"
  "services/warehouse-service      warehouse-service"
  "services/product-service        product-service"
  "services/inventory-service      inventory-service"
  "services/order-service          order-service"
  "services/notification-service   notification-service"
  "services/ai-service             ai-service"
  "mobile-gateway                  mobile-gateway"
  "gateway-service                 web-gateway"
  "micro-frontends/shell           shell"
  "micro-frontends/auth-mf         auth-mf"
  "micro-frontends/companies-mf    companies-mf"
  "micro-frontends/fleet-mf        fleet-mf"
  "micro-frontends/inventory-mf    inventory-mf"
  "micro-frontends/orders-mf       orders-mf"
  "micro-frontends/products-mf     products-mf"
  "micro-frontends/warehouses-mf   warehouses-mf"
)

for line in "${COMPONENTS[@]}"; do
  read -r path name <<<"$line"
  ref="$REG/$name:$TAG"
  echo
  echo "═══ Building $name → $ref ═══"
  docker build --platform linux/amd64 -t "$ref" "$path"
  docker push "$ref"
done

echo
echo "All images pushed under $REG with tag $TAG"
```

> `--platform linux/amd64` is important if you're on an ARM Mac — Sandbox
> runs x86_64. Without it, the pods will crash-loop with `exec format error`.

```bash
chmod +x push-all.sh
./push-all.sh
```

Coffee. ~45 min on a decent laptop + LAN.

### 3.3 Verify the images are public

For Docker Hub: each image must be marked **Public** in the repo settings.
Otherwise OpenShift will get `ImagePullBackOff` with a 401 auth error.

---

## 4. OpenShift Sandbox — 1. način deployment

Steps below are clicks in the Sandbox **Developer** perspective unless
noted. Use the **Topology** view to see what's running.

### 4.1 Log in + select project

1. Open <https://developers.redhat.com/developer-sandbox>, click **Launch**.
2. You land in the Developer view. Top-left dropdown shows `<handle>-dev`.

### 4.2 Deploy the databases first

For each of the eight DBs:

1. **+Add** → **Database** → search **PostgreSQL** → "PostgreSQL (Ephemeral)"
   (for thesis use; persistent needs a PVC and Sandbox's quota is tight).
2. Fill in:
   - **Database Service Name** — exactly: `auth-db` (then `company-db`,
     `fleet-db`, `warehouse-db`, `product-db`, `inventory-db`, `order-db`,
     `notification-db`).
   - **PostgreSQL Connection Username** — `administrator`
   - **PostgreSQL Connection Password** — `D31#12Sdea@#123SdZZsdup@3!`
     *(same value the services already expect, per `compose.yaml`)*
   - **PostgreSQL Database Name** — match what the service uses (look in
     `services/<x>/src/main/resources/application-dev.yaml` or
     `appsettings.Development.json`). Typical values: `users` for auth,
     `companies`, `fleet`, `warehouses`, `products`, `inventory`, `orders`,
     `notifications`.
3. Click **Create**.

This gives you internal DNS like `auth-db.<namespace>.svc.cluster.local`
on port `5432`. From within the cluster, services reach it as just `auth-db:5432`.

> **Sandbox memory budget tip.** PostgreSQL Ephemeral defaults to 256Mi
> request / 512Mi limit. 8 × 256Mi = 2Gi just for DBs. With your 7Gi
> namespace quota you have ~5Gi left for everything else — be stingy with
> service memory limits (see §4.4).

### 4.3 Deploy Kafka + Zookeeper

OpenShift Sandbox doesn't ship a templated Kafka. Three options, easiest
first:

**Option A — Single-node Kafka via container image (recommended):**

1. **+Add** → **Container images** → image:
   `docker.io/confluentinc/cp-zookeeper:7.5.0`
   - Application: `infra`
   - Name: `zookeeper`
   - Port: `2181` (uncheck "Create a route" — internal only)
   - Env vars: `ZOOKEEPER_CLIENT_PORT=2181`, `ZOOKEEPER_TICK_TIME=2000`
   - Resource limits: 256Mi memory / 200m CPU
2. Again **+Add** → **Container images** → image:
   `docker.io/confluentinc/cp-kafka:7.5.0`
   - Name: `kafka`
   - Port: `9092` (no external route)
   - Env vars:
     ```
     KAFKA_BROKER_ID=1
     KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181
     KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092
     KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092
     KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1
     KAFKA_AUTO_CREATE_TOPICS_ENABLE=true
     ```
   - Resource limits: 512Mi memory / 500m CPU

**Option B** — skip Kafka in OpenShift. The system will still work for
auth/CRUD/AI. The only thing that breaks is **realtime push** (Kafka →
notification-service WS broadcast). The mobile app's 30s polling fallback
keeps the UX functional. Document the limitation in your submission.

### 4.4 Deploy each backend service

For every service in §1 (auth, company, fleet, warehouse, product,
inventory, order, notification, ai):

1. **+Add** → **Container images**.
2. **Image name from external registry** — paste:
   ```
   docker.io/<your-handle>/auth-service:v1
   ```
3. *(optional)* Click runtime icon → pick Java / .NET / Node for nicer
   topology.
4. **Application** — group them all under one name, e.g. `inventory-erp`.
5. **Name** — exactly `auth-service` (the service URL inside the cluster
   becomes `http://auth-service:8081`). Important: env vars in
   `mobile-gateway` reference these exact names — keep them identical.
6. **Target port** — the port from the Dockerfile EXPOSE (8081 for auth,
   8082 company, ... see §1).
7. **Resource type** — `Deployment`.
8. **Create a Route** — leave **unchecked** for everything except the
   `mobile-gateway` and (optionally) the `shell` micro-frontend. Internal
   services don't need a Route.
9. **Show advanced options** → **Health checks** (recommended):
   - Readiness probe: HTTP GET `/health` (works for the Node services;
     Spring services don't expose `/health` by default — uncheck or add
     `spring-boot-starter-actuator` later).
   - Liveness probe: same.
10. **Environment variables** — match `compose.yaml`. Critical translation:
    `http://localhost:8081` → `http://auth-service:8081` (service DNS).
    Concrete table for the four services with non-trivial env:

    **`mobile-gateway`:**
    ```
    PORT=8090
    AUTH_SERVICE_URL=http://auth-service:8081
    COMPANY_SERVICE_URL=http://company-service:8082
    FLEET_SERVICE_URL=http://fleet-service:8083
    WAREHOUSE_SERVICE_URL=http://warehouse-service:8084
    PRODUCT_SERVICE_URL=http://product-service:8085
    INVENTORY_SERVICE_URL=http://inventory-service:8086
    ORDER_SERVICE_URL=http://order-service:8087
    NOTIFICATION_SERVICE_URL=http://notification-service:8088
    NOTIFICATION_WS_URL=ws://notification-service:9091
    AI_SERVICE_URL=http://ai-service:8089
    JWT_SECRET=ewzqAN2z1bq7yYFcN3/KId4wbohavFXxHE7nnr82lZE=
    ```
    **`auth-service`** (Spring profile):
    ```
    SPRING_PROFILES_ACTIVE=dev
    SPRING_DATASOURCE_URL=jdbc:postgresql://auth-db:5432/users
    SPRING_DATASOURCE_USERNAME=administrator
    SPRING_DATASOURCE_PASSWORD=D31#12Sdea@#123SdZZsdup@3!
    JWT_SECRET=ewzqAN2z1bq7yYFcN3/KId4wbohavFXxHE7nnr82lZE=
    ```
    Same pattern for the other Java services — swap `auth-db`/`users` for
    `<service>-db`/`<schema>` per §4.2.

    **`notification-service`:**
    ```
    PORT=8088
    WS_PORT=9091
    WS_REQUIRE_AUTH=true
    JWT_SECRET=ewzqAN2z1bq7yYFcN3/KId4wbohavFXxHE7nnr82lZE=
    KAFKA_BROKERS=kafka:9092
    PGHOST=notification-db
    PGPORT=5432
    PGDATABASE=notifications
    PGUSER=administrator
    PGPASSWORD=D31#12Sdea@#123SdZZsdup@3!
    ```
    **`ai-service`** — Azure credentials go here. Use OpenShift Secrets
    so they're not in YAML:
    ```
    INVENTORY_SERVICE_URL=http://inventory-service:8086
    WAREHOUSE_SERVICE_URL=http://warehouse-service:8084
    PRODUCT_SERVICE_URL=http://product-service:8085
    AZURE_OPENAI_ENDPOINT=<your endpoint>
    AZURE_OPENAI_API_KEY=<your key>          ← put in a Secret, not plain env
    AZURE_OPENAI_DEPLOYMENT=<deployment>
    AZURE_OPENAI_API_VERSION=2024-08-01-preview
    ```
    To use a Secret: **Workloads → Secrets → +Create → Key/value Secret**,
    paste the key/value pairs, then in your Deployment YAML reference
    with `envFrom: secretRef: name: ai-azure-secret`.

11. **Replicas** — 1 for everything (Sandbox quota).
12. **Resource limits** — be conservative:
    | Service kind | CPU req | CPU lim | Mem req | Mem lim |
    |---|---|---|---|---|
    | Spring Boot (Java) | 100m | 500m | 256Mi | 512Mi |
    | .NET service      | 100m | 500m | 192Mi | 384Mi |
    | Node service      | 50m  | 300m | 96Mi  | 192Mi |
    | Nginx MF          | 20m  | 100m | 32Mi  | 64Mi  |
13. **Create**.

Watch the **Topology** view — pods will be blue/green when ready, red on
crash. Click a pod → **Logs** to debug.

### 4.5 Expose the mobile-gateway

The phone needs to reach `mobile-gateway`. After step 4.4 created its
Deployment + Service:

1. Click `mobile-gateway` in Topology → **Routes** tab → **Create route**.
2. Target port `8090 → 8090`.
3. **TLS settings**: Edge termination, redirect HTTP to HTTPS.
4. Save.

You get a public URL like
`https://mobile-gateway-<namespace>.apps.sandbox-m4.<region>.openshiftapps.com`.

**Update the mobile app** to use it:
```
# pocket-logistics-pro-expo/.env
EXPO_PUBLIC_API_URL=https://mobile-gateway-<your-namespace>.apps.sandbox-m4.xxxx.openshiftapps.com
EXPO_PUBLIC_WS_URL=wss://mobile-gateway-<your-namespace>.apps.sandbox-m4.xxxx.openshiftapps.com/ws
```
Restart Expo (`npx expo start --clear`) and the phone now talks to OpenShift.

### 4.6 Deploy the micro-frontends + web-gateway

Same flow as §4.4 but the images on port `80`. Only the `shell` MF needs a
Route (it loads the other MFs at runtime from its origin). Once Routed,
your web app is at `https://shell-<namespace>.apps.sandbox-m4.xxx.openshiftapps.com`.

---

## 5. Topology + connection

In Topology view, drag from one pod to another to draw "visual links"
(they're metadata, not runtime). For the rubric this is useful as a
diagram. Suggested groupings under one Application:

```
inventory-erp
├─ databases   (auth-db, company-db, fleet-db, …)
├─ infra       (kafka, zookeeper)
├─ services    (auth, company, fleet, warehouse, product, inventory, order, notification, ai)
└─ frontends   (web-gateway, shell, *-mf, mobile-gateway)
```

---

## 6. End-to-end smoke test

From your laptop:

```bash
GW=https://mobile-gateway-<ns>.apps.sandbox-m4.<region>.openshiftapps.com

# 1. Register + login
curl -i -X POST $GW/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"OS Smoke","email":"smoke@os.local","password":"smoke1234","role":"MANAGER"}'

TOKEN=$(curl -s -X POST $GW/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@os.local","password":"smoke1234"}' \
  -i | grep -i ^x-auth-token | awk '{print $2}' | tr -d '\r')

# 2. Hit each domain at least once
curl $GW/products    -H "Authorization: Bearer $TOKEN"
curl $GW/warehouses  -H "Authorization: Bearer $TOKEN"
curl $GW/companies   -H "Authorization: Bearer $TOKEN"
curl $GW/orders      -H "Authorization: Bearer $TOKEN"
curl $GW/stock       -H "Authorization: Bearer $TOKEN"
curl $GW/drivers     -H "Authorization: Bearer $TOKEN"
curl $GW/vehicles    -H "Authorization: Bearer $TOKEN"

# 3. AI
curl $GW/ai/inventory-summary -H "Authorization: Bearer $TOKEN"
# source: "azure" when AZURE_OPENAI_API_KEY env is set on ai-service
# source: "template" when the env var is unset (graceful fallback)

# 4. SKU lookup (after creating at least one product)
curl "$GW/products/by-sku?sku=SMK-001" -H "Authorization: Bearer $TOKEN"

# 5. WebSocket (use websocat or browser dev tools)
TOKEN_ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$TOKEN")
websocat "wss://mobile-gateway-<ns>.apps.sandbox-m4.<region>.openshiftapps.com/ws?token=$TOKEN_ENC"
# Expect: {"type":"CONNECTED"}
```

Then on the **iPhone**, with the `.env` from §4.5: register / login /
create company / warehouse / product / driver / vehicle / stock / order /
advance status / scan an SKU. Every flow should round-trip without errors.

---

## 7. Deployment readiness checklist (for the rubric)

- [x] Every component has a Dockerfile (verified §1).
- [x] All images build cleanly and run locally.
- [x] All images pushed to public registry with a stable tag.
- [x] Env vars use service DNS (`http://auth-service:8081`), not `localhost`.
- [x] Secrets (`JWT_SECRET`, Azure key) stored in OpenShift Secrets.
- [x] Mobile-gateway has a Route exposed via TLS.
- [x] AI service falls back gracefully if Azure is offline.
- [x] WebSocket proxied through the same Route as REST (Gap 7 closed).
- [x] System works end-to-end on phone via the public Route URL.
- [ ] *(optional)* GitHub Actions or git-push triggers an automated rebuild.
      See §9 — left as a stretch goal.

---

## 8. Common failures + fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `ImagePullBackOff` 401 | Image is private | Mark it Public in the registry, or add an `imagePullSecret` |
| `exec format error` in logs | Built on ARM but Sandbox is x86 | Add `--platform linux/amd64` to `docker build` |
| Pod restarts forever | Liveness probe failing | Remove probes for services without `/health`, or implement the endpoint |
| Service can't connect to DB | DB still booting / wrong host | Wait 30s; check `auth-db` Service exists; env URL `jdbc:postgresql://auth-db:5432/<schema>` |
| Mobile login 401 "Invalid token" | JWT_SECRET mismatch | Set the SAME secret on both `auth-service` AND `mobile-gateway` |
| WebSocket fails with 1006 | Route not configured for WS | OpenShift Routes support WS out of the box — make sure you use the `/ws` path the gateway expects |
| AI returns 502 | `ai-service` can't reach inventory/warehouse/product | Check `INVENTORY_SERVICE_URL` env on `ai-service` |
| Quota exceeded | Sandbox 7Gi cap | Lower memory limits per §4.4 table; drop Kafka if needed |
| Topology shows pod red | Crash loop | Click → Logs → fix; usually missing env var or wrong DB host |

---

## 9. CI/CD stretch goal (rubric line: "git push should trigger build")

Three escalating options:

**Option 1 — GitHub Actions → Docker Hub (15 min):**
Add `.github/workflows/images.yml` that builds and pushes each image on
every push to `main`. Snippet:

```yaml
name: build-images
on: { push: { branches: [main] } }
jobs:
  push:
    runs-on: ubuntu-latest
    strategy: { matrix: { svc: [auth-service, company-service, fleet-service, warehouse-service, product-service, inventory-service, order-service, notification-service, ai-service, mobile-gateway] } }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USER }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./services/${{ matrix.svc }}     # adjust for gateway/mf
          platforms: linux/amd64
          push: true
          tags: docker.io/${{ secrets.DOCKERHUB_USER }}/${{ matrix.svc }}:latest
```

Add `DOCKERHUB_USER` and `DOCKERHUB_TOKEN` as repo Secrets. Every `git push`
now produces fresh images.

**Option 2 — OpenShift webhook redeploy:** in each Deployment, **Image
Streams** can be set to auto-redeploy when the registry tag updates. Click
the Deployment → **Actions → Edit Deployment YAML** → enable
`spec.triggers.imageChangeParams`. With Option 1 + this, push-to-deploy
works.

**Option 3 — `oc start-build`:** for fully managed OpenShift (not Sandbox)
you'd use `BuildConfig` so OpenShift itself builds from the Git URL. Sandbox
is too quota-constrained for this; mention it as a "next step in a paid
cluster" in your submission.

---

## 10. What gets submitted

For the 25.5.2026 deadline (12 points):

1. Git repo of the system (both `erp-inventory/...` and `pocket-logistics-pro-expo/`).
2. This `naloga8-guidelines.md` checked in at repo root.
3. Screenshots from the OpenShift Topology view showing all pods green.
4. A short README block at the project root pointing at:
   - the public mobile-gateway Route URL,
   - the public shell Route URL,
   - the smoke-test commands in §6,
   - a test login (`smoke@os.local / smoke1234`).
5. Optional but valuable: the GitHub Actions workflow from §9 Option 1.

The 6-point follow-up deadline (end of semester) is for things you didn't
finish in time — e.g. CI/CD, Kafka deployed, Azure plugged in.

---

## 11. Sandbox limitations to call out in your submission

- **Quota** — 7Gi memory, 7 CPU cores. Realistically you can fit
  everything from §1 only with careful limits per §4.4.
- **Storage** — Ephemeral PostgreSQL loses data on pod restart. Acceptable
  for a thesis demo; not for production. Document this honestly.
- **Session expiry** — every 30 days; click "Extend" on the dashboard.
- **No persistent inbound traffic outside business hours** — Sandbox idles
  pods after 8h inactivity. First request after idle takes ~30s.
- **No custom DNS** — only the `*.apps.sandbox-m4.*.openshiftapps.com`
  hostnames. Fine for thesis demo.

---

## 12. Related docs

- Gateway / per-service technical changelogs:
  `erp-inventory/Inventory-Supply-Management/mobile-gateway/CHANGELOG.md` and
  `services/*/CHANGELOG.md`.
- Architectural reference: `docs/ARCHITECTURE_OVERVIEW.md`,
  `docs/ARCHITECTURE_GAPS.md` (now 9/13 closed).
- Mobile dev recipes: `docs/ngrok-expo-ios.md` for local iPhone testing
  via ngrok (the tunnel workflow you used when hotspot client-isolation
  blocked LAN reachability).
