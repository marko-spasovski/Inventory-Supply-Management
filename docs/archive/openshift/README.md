# OpenShift Deployment (Task 8 — Orchestration)

Deploys the inventory/supply microservice system to **RedHat OpenShift**
(Developer Sandbox or any OpenShift 4.x cluster).

**Excluded from this deployment:** the Expo mobile app and the `ai-service`
(the `mobile-gateway` *is* included — its `/ai/*` routes simply return errors).

## What gets deployed (~12 pods)

| Component | Image | Port(s) | Notes |
|---|---|---|---|
| postgres | `quay.io/sclorg/postgresql-15-c9s` | 5432 | One instance, **8 logical DBs** (init hook) |
| kafka | `apache/kafka:3.8.0` | 9092 | Single-node **KRaft** (no Zookeeper), ephemeral |
| auth-service | `…/auth-service` | 8081 | Java/Spring |
| company-service | `…/company-service` | 8082 | Java/Spring |
| warehouse-service | `…/warehouse-service` | 8084 | Java/Spring |
| inventory-service | `…/inventory-service` | 8086 + **9090 gRPC** | Java/Spring |
| order-service | `…/order-service` | 8087 | .NET |
| fleet-service | `…/fleet-service` | 8083 | .NET |
| product-service | `…/product-service` | 8085 | .NET |
| notification-service | `…/notification-service` | 8088 + 9091 WS | Node |
| web-gateway | `…/web-gateway` | 8080 | Spring Cloud Gateway (+ Route) |
| mobile-gateway | `…/mobile-gateway` | 8090 | Express BFF (+ Route) |
| web-frontend | `…/web-frontend` | 8080 | shell + all MFs + nginx (+ **public Route**) |

The **web-frontend** Route is the main entry point. Its nginx serves the shell
and every micro-frontend (under `/mf/<name>/`) and reverse-proxies `/api → web-gateway`
and `/ws → notification-service`, so the whole UI is one origin (no CORS issues).

## Prerequisites

- A container engine: `docker` (or `podman`)
- A **Docker Hub** account, with `docker login` done
- The `oc` CLI, logged into your sandbox (`oc login …` — copy the command from
  the OpenShift console → top-right → *Copy login command*)
- This backend repo and the frontend repo checked out **side by side**:
  ```
  Projects/
    Inventory-Supply-Management-Backend/    <- you are here
    Inventory-Supply-Management-Frontend/
  ```

## 1. Build & push the images

```bash
# DOCKERHUB_USER defaults to "marko222"; override it only if you use another account.
docker login                       # podman login docker.io  (if using podman)
./openshift/build-and-push.sh      # CONTAINER_ENGINE=podman  to use podman
```

This builds 11 images (8 services + 2 gateways + 1 combined frontend) from the
`Dockerfile.openshift` files and pushes them to `docker.io/$DOCKERHUB_USER/…`.

> **Make the Docker Hub repos public** (Docker Hub → each repo → Settings →
> Make public) so OpenShift can pull them with no pull secret. To keep them
> private instead, create a pull secret and link it to the `default` service
> account:
> ```bash
> oc create secret docker-registry dockerhub \
>   --docker-server=docker.io --docker-username=$DOCKERHUB_USER \
>   --docker-password='********' --docker-email=you@example.com
> oc secrets link default dockerhub --for=pull
> ```

## 2. Deploy

```bash
oc login ...                       # your sandbox (DOCKERHUB_USER defaults to marko222)
./openshift/deploy.sh
```

`deploy.sh` rewrites the `DOCKERHUB_USER/` image prefix and applies the
manifests in dependency order (config → postgres → kafka → services → gateways
→ frontend). Watch the rollout:

```bash
oc get pods -w
```

First start takes a few minutes: postgres initialises the 8 DBs, Kafka formats
its KRaft storage, and the JVM/.NET services wait for both. The .NET services
auto-apply their EF Core migrations on startup; the Java services auto-create
their schema (`ddl-auto: update`).

## 3. Open the app

```bash
oc get route web-frontend  -o jsonpath='{.spec.host}{"\n"}'   # web UI
oc get route mobile-gateway -o jsonpath='{.spec.host}{"\n"}'  # mobile API
```

Open `https://<web-frontend host>` and log in. Pick SL/EN on the login screen.

## Scaling, networking, security (the task's "configure OpenShift" bits)

- **Scaling** — bump replicas or add an autoscaler:
  ```bash
  oc scale deployment/warehouse-service --replicas=2
  oc autoscale deployment/order-service --min=1 --max=3 --cpu-percent=80
  ```
- **Networking** — east-west traffic uses in-cluster Service DNS
  (`auth-service:8081`, `kafka:9092`, `postgres:5432`, `inventory-service:9090`).
  Only the web-frontend, web-gateway and mobile-gateway are exposed via Routes
  (TLS edge-terminated, HTTP→HTTPS redirect).
- **Security** — credentials live in the `app-secrets` Secret (DB creds + JWT
  HMAC key); non-secret wiring is in the `app-config` ConfigMap. Images run
  under OpenShift's restricted (non-root, arbitrary UID) SCC. To restrict
  east-west traffic further, add NetworkPolicies (optional).
- **Resource limits** — every Deployment sets requests/limits sized for the
  sandbox (~2.7Gi requested, ~5.8Gi limits total).

## Troubleshooting

- **A pod is `Pending` with a quota error** — the sandbox quota is exceeded.
  Lower replicas, or temporarily scale a non-critical service to 0
  (`oc scale deployment/notification-service --replicas=0`).
- **`postgres` CrashLoopBackOff** — check `oc logs deploy/postgres`. The sclorg
  image is built for arbitrary UIDs; if your cluster differs, deploy Postgres
  from the Developer Catalog instead and point `app-config`/secrets at it.
- **`kafka` not ready** — KRaft formatting/advertised-listener issues show in
  `oc logs deploy/kafka`. As a fallback you can install the **AMQ Streams**
  (Strimzi) operator and create a single-node `Kafka` CR named `kafka`.
- **Frontend loads but a section is blank** — a Module Federation remote failed
  to load; confirm `/mf/<name>/assets/remoteEntry.js` returns 200 on the Route.
- **`/api` calls 404/502** — check `oc logs deploy/web-gateway` and that the
  downstream service pod is Ready.

## Local dev is unchanged

The `Dockerfile.openshift` files and `openshift/` manifests are additive. The
original `compose.yaml` and dev Dockerfiles still work for local development;
the code changes (env-driven gRPC URL, env-driven notification DB, env-driven
MF remote URLs, prod-only WebSocket path, EF migrate-on-start) all keep their
previous localhost defaults.
