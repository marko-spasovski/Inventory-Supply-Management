# Known issues

What is fixed, and what still needs work. Finding numbers (R01–R24) refer to the
[project review](PROJECT_REVIEW_AND_DOCUMENTATION.md). Last updated 2026-11-03.

The goal of this round was a **working, demonstrable system**: every critical security and data-integrity
bug fixed, everything running in containers and on Kubernetes, and CI that proves it. The open items below
are real, but none of them stops the system from running or the main business flow from working.

## Fixed

| Finding | What was wrong | Fix | Proof |
|---|---|---|---|
| R01 Critical | `POST /auth/register {"role":"admin"}` created an ADMIN | Registration always creates WORKER; first ADMIN from `AUTH_BOOTSTRAP_ADMIN_*` | `AuthServiceTest` (parameterized), e2e `Registration (R01)` |
| R03 High | JWT secret hard-coded in the web gateway (config ignored) and the fallback in two Node services | `JWT_SECRET` required everywhere, no secret in source; launcher generates one | `JwtServiceTest` (gateway), gitleaks in CI |
| R04 High | Any status at any time; every Approve added stock again | Order lifecycle enforced in the domain; repeats are 409 | `OrderServiceTest`, `OrderTest` |
| R05 High | gRPC failure or open circuit ignored → order without stock | Stock received on **Close**, checked before saving; failure → 503, order stays Delivered | `OrderServiceTest`, `InventoryGrpcClientTest` |
| R08 High | No working full-stack recipe | `docker compose up --build --wait`; Kubernetes manifests | e2e workflow on every PR |
| R09 High | Web image build referenced a missing `.npmrc`; OpenShift scripts missing | `.npmrc` restored; one `frontend/web/Dockerfile`; OpenShift replaced by Kustomize (archived) | `frontend` workflow builds the image |
| R16 (part) | order-service wrote documents under a developer's absolute home path | Relative path; persistent volumes in compose and Kubernetes | — |
| R19 | Tests asserted stale behaviour (locale, copy, stock on Approve) | Tests fixed or rewritten to assert the intended rules; [baseline](testing/baseline.md) | CI |
| R20 (most) | No CI; EOL Node 20; two Reacts in one workspace | Per-service CI with SAST and scans; Node 24; React 19.1 everywhere | CI |
| R21 (part) | Ephemeral Kafka and files, TCP-only probes, root containers | Persistent volumes, `/livez` + `/readyz`, non-root images, NetworkPolicies | compose and kind runs |
| New | Mobile products screen crashed (hook called after an early return) | Hooks before returns; `rules-of-hooks` lint is a CI gate | `frontend` workflow |
| New | notification-service exited when PostgreSQL restarted | Pool error handler | `db-pool.test.ts` |
| New | Web gateway (WebFlux) pulled in the servlet stack via springdoc's webmvc starter | webflux starter | build + scan |
| New | Critical CVEs in Tomcat, Netty, Bouncy Castle, gRPC, jsPDF, nginx, Alpine OpenSSL | Patched versions | Trivy gate in CI |
| New | nginx forwarded the client Host header and any Upgrade (h2c smuggling) | Fixed in `frontend/web/nginx.conf` | Semgrep gate |

## Open: security

| # | Issue | Risk | What to do | Where |
|---|---|---|---|---|
| R02 | Services trust `X-User-*` headers and do not check roles themselves; the web gateway authenticates but does not authorize | Anyone who reaches a service port directly (not possible from outside in compose/Kubernetes, where only the gateways are exposed) can act as any role; through the web gateway any logged-in role can call any endpoint | Verify the JWT in every service (Spring resource server, ASP.NET JwtBearer, a Node middleware) and enforce the permission matrix in `docs/requirements.md`; forward `Authorization` instead of `X-User-*` | each service's security config; `JwtAuthenticationFilter` |
| R10 | `?driverId=` is chosen by the caller; drivers can see and change every order | A driver can read and change other drivers' orders | Resolve the driver from the token (fleet `GET /drivers/me`) inside order-service; filter list/detail/update by it | `OrdersController`, `OrderService` |
| R11 | warehouse-service accepts only MANAGER for update/delete; the gateway also lets ADMIN through | ADMIN gets 403 | Accept ADMIN and MANAGER (part of R02) | `WarehouseController` |
| R17 | Access validators do not check a token type; refresh tokens are not revoked on logout | A refresh token can be used as an access token until it expires (7 days) | Add `typ=access` to access tokens and require it in every verifier; store refresh tokens (hashed) and revoke on logout | auth `JwtService`, gateways, notification WS |
| ADR 005 | Tokens use one shared HS256 secret | Every verifier could also mint tokens | ES256 signing in auth-service, JWKS endpoint, verifiers fetch keys | ADR 005 |
| Spring | Spring Boot 3.5 is out of OSS support; 3 Spring Framework CVEs are accepted in `.trivyignore` (not reachable here) until **2026-12-31**, after which CI fails | — | Migrate to Spring Boot 4 / Spring Cloud 2025.1; inventory's gRPC starter (`net.devh`) must move to Spring gRPC | 5 `pom.xml` files |
| Expo | HIGH npm advisories through the Expo 54 toolchain (expo-router, query-string, postcss, image-size) | Mostly build-time | Upgrade the Expo SDK | `frontend/mobile` |
| CSP | The web image sends no Content-Security-Policy | Less protection against injected scripts | Add a CSP and verify Module Federation still loads (browser e2e) | `frontend/web/nginx.conf` |

## Open: business logic and data integrity

| # | Issue | What to do | Where |
|---|---|---|---|
| Close | Closing an order does not yet require an uploaded delivery PDF on the server (the UI requires it) | Check for a stored document before the Delivered → Closed transition (409 `document_required`) | `OrderService.UpdateStatusAsync` |
| Atomicity | Close = gRPC stock call, then save. If the save fails after the stock call, a retry adds stock again | Send the order id as an operation id and make `UpdateInventory` idempotent, or use a transactional outbox (ADR 004) | order + inventory |
| R06 | Warehouse capacity changes only on gRPC stock additions; HTTP additions and consumption do not emit events; the consumer has no de-duplication | Emit a signed-delta event for every stock change; store processed event ids in warehouse-service | inventory handlers, `InventoryEventConsumer` |
| R07 | Negative initial stock and reversed thresholds are accepted; no unique (product, warehouse) row; read-modify-write without locking | Validation in `Inventory.create`; unique constraint; atomic `UPDATE ... SET quantity = quantity + ?` | inventory domain + repository |
| D2 | A warehouse may exceed its capacity | Check capacity at approval and at receipt (409 `capacity_exceeded`) | order + warehouse |
| R22 | Consumption publishes events before its transaction commits | Publish after commit (outbox) | `ConsumptionService` |
| R16 | Documents: no content check (only name or MIME), no metadata table, no download endpoint | Check `%PDF-` magic bytes, store metadata, add an authenticated download | order + inventory |
| Migrations | Java services use `ddl-auto: update` | Flyway baseline migrations, `ddl-auto: validate` (ADR 002) | 4 Spring services |

## Open: notifications, clients and operations

| # | Issue | What to do | Where |
|---|---|---|---|
| R12 | Mobile renders `item.body` but the API sends `message`; the realtime hook switches on a `topic` the envelope does not have | Render `message`; switch on the envelope's type | `frontend/mobile` notifications |
| R13 | `switchMap` drops deliveries in a burst; the Kafka handler acknowledges before storing | `concatMap`, await storage before committing the offset, de-duplicate by event id | `process-kafka-event.usecase.ts` |
| R14 | Notifications are global; "mark all read" marks them read for everyone | Per-user read state table; role-filtered feed (ADR 008) | notification-service |
| R15 | Mobile marks auth ready before storage hydration; logout keeps the query cache and push token | Wait for hydration; clear the QueryClient and unregister the push token on logout; SecureStore | `frontend/mobile` |
| R18 | Local and deployed WebSocket/remote URL layouts differ | One URL layout (the web image's nginx already proxies `/ws`) | `frontend/web/shell` |
| R23 | Mobile gateway CORS does not allow the `ngrok-skip-browser-warning` header; no trusted-proxy setting | Allow the header in development; set `trust proxy` behind the ingress | `mobile-gateway/src/index.ts` |
| R24 | Some web screens show empty lists on API errors; no central 401 handling; no error boundary around remotes | Shared HTTP client with 401 handling; error boundary | `frontend/web/shell` |
| Release | `release.yml` builds and pushes the GHCR images; deploying to the VPS is a manual `kubectl apply` | Add a gated deploy job (ADR 011) | `.github/workflows` |
| Backups | No scheduled database backup in Kubernetes | CronJob with `pg_dump` per database to off-site storage (docs/operations/vps.md) | `deploy/k8s` |
