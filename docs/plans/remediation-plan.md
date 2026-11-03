# Remediation plan: from working prototype to a tested, deployable monorepo

- Status: **Approved 2026-11-03** — all recommended answers D1–D13 accepted; PRs are merged
  after CI is green; VPS has 8 GB+ RAM; unused Docker images pruned for disk space.
- Date: 2026-11-03
- Input: [project review](../PROJECT_REVIEW_AND_DOCUMENTATION.md) findings R01–R24, re-checked on
  2026-11-03 against the current source (R01, R02, R03, R04 and R05 confirmed line by line),
  plus the conventions of the Outreach-Platform repository (AGENTS.md, ADRs, specs, contracts,
  per-service CI, Conventional Commits, one PR per slice).
- Target repository: `git@github.com:marko-spasovski/Inventory-Supply-Management.git`
  (public, `main`, admin access confirmed).

## 1. Goal and definition of done

Goal: one repository that contains the whole system, where every business flow works as
intended, every endpoint is tested, CI proves it on every PR, and the stack runs the same way
locally (Docker Compose), in Kubernetes, and on a single VPS.

A phase is **done** when:

1. Its acceptance criteria (listed per phase below) pass as automated tests.
2. Every changed endpoint has tests for: success, unauthenticated (401), wrong role or not the
   owner (403/404), invalid input (400) — the Outreach rule 8, adapted to roles instead of
   workspaces.
3. Lint, typecheck, unit and integration tests are green in CI for every changed service, plus
   the repo checks (secret scan, contract lint, workflow lint) and image scan.
4. Contracts (OpenAPI, proto, event schemas) are updated in the same PR as the code.
5. Docs (README, architecture, the service README, ADRs, specs) and `BACKLOG.md` are updated
   in the same PR.
6. Database migrations run up (and down where the tool supports it) in CI.
7. The PR has a summary, how it was tested, risks, and which docs changed.

## 2. Decisions needed before work starts

These are product decisions. The current code answers several of them inconsistently (UI says
one thing, API another). Each row has a recommended answer; the plan below assumes it.
Changing an answer changes the phase that implements it, not the overall plan.

| # | Question | Recommended answer | Why |
|---|---|---|---|
| D1 | When does stock increase for a supply order? | On **Close** (goods receipt with a delivery note). Approval only checks that the warehouse has room. | Matches the original design (`what_i_implemented.md`), the UI's "upload a document to close" rule, and removes the need to reverse stock when an approved order is cancelled. Today stock is added on approval and can be added twice (R04). |
| D2 | Can a warehouse exceed its capacity? | **No.** Approval and receipt fail with `409 capacity_exceeded`. | A hard invariant is testable; "allowed to overflow" makes capacity meaningless. |
| D3 | Unit of capacity | **Units of product** (same as quantity). Weight/volume goes to BACKLOG. | Current data has no weight/volume. |
| D4 | Order state machine and who may do what | Requested → Approved/Rejected (ADMIN, MANAGER). Approved → Delivered (the **assigned** DRIVER, or ADMIN/MANAGER). Delivered → Closed (ADMIN, MANAGER, WORKER; delivery PDF required). Requested/Approved → Cancelled (ADMIN, MANAGER). Everything else 409 `invalid_transition`. | Replaces the one broad `ORDERS_STATUS_UPDATE` permission (R04, R10). |
| D5 | Who can register? | Public registration **off by default**; when on, it always creates WORKER. ADMIN creates users and assigns roles. First ADMIN is created from environment variables at start-up. | Fixes R01. Same pattern as Outreach (`AUTH_REGISTRATION_ENABLED=false`). |
| D6 | What is a Company? | A **supplier/partner record**, not a tenant. The system is single-tenant. | No code isolates data by company today; pretending it does would be worse. Multi-tenancy goes to BACKLOG. |
| D7 | Notifications | A **shared operations feed filtered by role**, with **per-user read state**. | Keeps the useful "everyone sees low stock" behaviour, fixes "mark all read" for everyone (R14). |
| D8 | Document for stock consumption | **Optional** in both API and app (stored if given). | Today the app requires it and the API does not; pick one rule. |
| D9 | Offline mobile | Read-only cache that survives restart; **no offline writes**. | Offline writes need conflict handling; BACKLOG. |
| D10 | OpenShift | **Replace** with plain Kubernetes manifests (Kustomize). Old manifests move to `docs/archive/`. | One deployment format for both a cluster and the VPS. |
| D11 | Micro-frontends and SL/EN | **Keep** both (they are part of the project's purpose); improve automation. | |
| D12 | Infrastructure footprint | **One PostgreSQL server with one database and one role per service** (instead of 8 servers), **Kafka in KRaft mode** (no ZooKeeper). | Keeps data ownership (no service can read another's database) and cuts ~1.5 GB RAM, which matters on a VPS. Recorded as an ADR. |
| D13 | Token model | auth-service signs **asymmetric** tokens (ES256), publishes **JWKS**; gateways **and every service** verify them. Web: httpOnly Secure cookie. Mobile: Bearer. | Fixes R02, R03, R17; matches Outreach non-negotiable 2 ("internal does not mean trusted"). |

## 3. Target repository structure

Same shape as Outreach-Platform, adapted to a polyglot system:

```text
Inventory-Supply-Management/
├── AGENTS.md / CLAUDE.md        stack, commands, non-negotiables, git rules, definition of done
├── README.md                    what it is, architecture diagram, quick start
├── BACKLOG.md                   ideas and later work (not built until picked up)
├── .env.example                 every variable with fake placeholder values
├── .nvmrc  .tool-versions       pinned Node / Java / .NET versions
├── docker-compose.yml           whole stack locally and on the VPS (profiles: infra, app, tools)
├── contracts/
│   ├── openapi/                 one OpenAPI 3.1 file per service (source of truth for APIs)
│   ├── proto/inventory.proto    single gRPC contract; both services generate code from it
│   ├── events/                  JSON Schema per Kafka topic + envelope.schema.json
│   └── README.md                rules: error format, X-Request-ID, versioning
├── backend/
│   ├── gateways/web-gateway/    Spring Cloud Gateway
│   ├── gateways/mobile-gateway/ Express/TS BFF
│   └── services/<9 services>/   each: Dockerfile, README, tests, migrations, health endpoints
├── frontend/
│   ├── packages/                api-types (generated from contracts), domain, i18n
│   ├── web/shell + 7 remotes
│   └── mobile/
├── db/init/                     creates one database + owner role + runtime role per service
├── deploy/
│   ├── k8s/base/                Kustomize base: namespaces, deployments, services, config
│   ├── k8s/overlays/local/      kind cluster for CI and laptops
│   ├── k8s/overlays/vps/        k3s on the VPS: ingress, TLS, resource limits, PVCs
│   └── vps/                     bootstrap script, backup/restore, runbook
├── tests/
│   ├── e2e-api/                 Playwright API tests through the gateways (all business flows)
│   └── e2e-web/                 Playwright browser tests against the built web image
├── docs/
│   ├── architecture.md          style, structure, rules, runtime, identity, events, pipeline
│   ├── product.md requirements.md   what it does, roles and permission matrix, NFRs
│   ├── decisions/               ADR 001… (see section 4)
│   ├── specs/                   one spec per feature slice (AUTH-01, ORDER-01, …)
│   ├── operations/              runbook, backups, key rotation, incident checklist
│   └── archive/                 historical notes, old review, OpenShift manifests
├── scripts/                     local launcher (run-local) and its tests
└── .github/workflows/
    ├── _java-service.yml  _dotnet-service.yml  _node-service.yml  _web.yml   reusable pipelines
    ├── <one small workflow per service>, path-filtered
    ├── repo-checks.yml          gitleaks (full history), Redocly, actionlint, buf lint (proto)
    ├── e2e.yml                  full stack in kind → Playwright API + browser
    └── release.yml              build, scan, push images to GHCR, deploy to the VPS
```

## 4. Architecture decisions to record (ADRs)

| ADR | Title |
|---|---|
| 001 | Polyglot microservices (9 services + 2 BFF gateways) in one monorepo |
| 002 | Database per service on one PostgreSQL server (D12), Flyway / EF Core / node-pg-migrate migrations, no `ddl-auto=update` |
| 003 | gRPC for synchronous stock commands, Kafka for events; one proto, generated code |
| 004 | Transactional outbox for every event producer; idempotent consumers with a `processed_events` table; dead-letter topics |
| 005 | Asymmetric JWT + JWKS, verified by gateways and every service (D13) |
| 006 | Backend permission matrix as the single source of authorization; UI only mirrors it |
| 007 | Order state machine and goods receipt on Close (D1, D2, D4) |
| 008 | Notifications: role-filtered shared feed, per-user read state, WebSocket fan-out across replicas (D7) |
| 009 | Documents on a persistent volume with metadata rows and authenticated download |
| 010 | Kubernetes with Kustomize; k3s single node on the VPS (D10) |
| 011 | Images in GHCR, pinned by digest; CI deploys with a scoped kube credential |

## 5. Git and repository strategy

1. Work in a **fresh clone** of `marko-spasovski/Inventory-Supply-Management` (the existing local
   clone points at a different remote and has uncommitted deletions; it is not touched).
2. **Keep history.** Branch `chore/monorepo`:
   - `git mv` the current backend files into `backend/`, `deploy/`, `tests/` (history follows).
   - `git subtree add --prefix=frontend` the frontend repository, so its 10 commits stay visible.
   - Copy in the Novo-only work (launcher, docs, CI) as separate commits.
   - Result: a byte-for-byte match with Novo today, before any fix (checked with the same
     file comparison used on 2026-11-03).
3. **Never commit to `main`, never force-push.** One branch and one PR per phase/slice below,
   Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`, `refactor:`).
4. Branch protection on `main` after phase 1: PR required, CI required.
5. The old frontend and Expo repositories get a README note pointing to the monorepo and are
   archived on GitHub (only after you confirm).

## 6. Phases

Each phase is one branch and one PR (large phases are split into several PRs, listed).
Commits shown are the planned commit subjects. Findings fixed are in brackets.

### Phase 0 — Monorepo and honest baseline (no behaviour change)

Branch `chore/monorepo`
- `chore: move backend into backend/, deploy/ and tests/`
- `chore: import frontend repository history under frontend/`
- `chore: add local launcher, compose and docs from Novo`
- `ci: add per-stack CI and image workflows`

Branch `test/baseline`
- `test: run every existing suite in containers and record results`
- `docs: add test baseline report` — a table of every suite: passing, failing, why. **Nothing is
  "fixed" by weakening a test**; failing tests are linked to the phase that fixes the behaviour (R19).

Acceptance: CI runs every existing suite; the baseline report matches CI.

### Phase 1 — Standards scaffolding

Branch `docs/standards`
- `docs: add AGENTS.md and CLAUDE.md with stack, commands, non-negotiables`
- `docs: add architecture, product and requirements with the permission matrix`
- `docs: add ADRs 001–011` (section 4)
- `docs: add BACKLOG.md`
- `chore: pin tool versions (.nvmrc, .tool-versions, global.json) and add .env.example`

Branch `ci/pipelines`
- `ci: add reusable java, dotnet, node and web pipelines` — install, lint, typecheck, migrate,
  test with Testcontainers, coverage report, dependency audit, Semgrep, image build, Trivy
- `ci: add one path-filtered workflow per service`
- `ci: add repo checks (gitleaks, Redocly, actionlint, buf)`

Branch `chore/infra-footprint` [R08, R20, R21]
- `chore: one postgres server with a database and roles per service (db/init)`
- `chore: kafka in KRaft mode, persistent volume, topics created at start-up`
- `feat: docker-compose.yml runs the whole stack with health checks` — every service, both
  gateways, web image; `docker compose up --wait` is the one tested recipe
- `fix: build web remotes from the workspace root` [R08]
- `feat: health and readiness endpoints in every service` (actuator / ASP.NET health checks /
  `/healthz` `/readyz`)

Acceptance: a clean clone starts with `cp .env.example .env && docker compose up --wait`; CI
does the same.

### Phase 2 — Contracts first

Branch `feat/contracts`
- `feat: OpenAPI files for every service and both gateways` — written from the current routes,
  then corrected where phases 3–6 change them
- `feat: single inventory.proto under contracts/, generated in both services` (removes the copy)
- `feat: JSON Schemas for every Kafka topic and a versioned event envelope`
  (`id`, `type`, `version`, `occurredAt`, `payload`) [R12]
- `feat: generate frontend api-types from OpenAPI` — DTO drift becomes a compile error [R12]
- `feat: one error body for all services`: `{ error: { code, message, requestId } }` + `X-Request-ID`

Acceptance: Redocly and buf lint green; generated types compile in web and mobile.

### Phase 3 — Security (critical first)

Branch `fix/registration` [R01]
- `fix(auth): public registration creates WORKER only and is off by default`
- `feat(auth): admin user management (create, change role, deactivate)`
- `feat(auth): bootstrap first admin from environment`
- `test(auth): registration cannot create ADMIN/MANAGER through either gateway`

Branch `feat/asymmetric-jwt` [R03, R17]
- `feat(auth): sign ES256 tokens with kid, publish JWKS, honour configured TTL`
- `feat(auth): refresh token rotation and revocation on logout`
- `fix(web-gateway): verify with JWKS instead of a hard-coded secret` [R03]
- `fix(mobile-gateway): verify with JWKS, require access-token type and audience`
- `fix(notification): WebSocket accepts access tokens only, validates claims`
- `fix(auth): Secure cookies outside development`
- `chore: remove every committed secret; rotate deployment values` (+ gitleaks history check)

Branch `feat/authorization` [R02, R10, R11]
- `feat: permission matrix in docs/requirements.md and contracts` (D4)
- `feat: token verification and role checks inside every service` — Spring Security resource
  server, ASP.NET JwtBearer + policies, Express middleware; gateways keep coarse checks
- `fix(web-gateway): enable role enforcement` [R02]
- `fix(warehouse): ADMIN can update and delete warehouses` [R11]
- `fix(order): drivers see and change only orders assigned to them` — driver id resolved from
  the token on the server, never from `?driverId=` [R10]
- `test: permission matrix tests per endpoint (every role × every action)`

Acceptance: the generated matrix test (role × endpoint) passes through both gateways **and**
directly against each service; forged identity headers are ignored.

### Phase 4 — Order and stock integrity

Branch `feat/order-state-machine` [R04]
- `feat(order): server-side state machine with role per transition` (D4)
- `feat(order): optimistic concurrency (row version) on orders`
- `feat(order): close requires an uploaded delivery PDF`
- `test(order): every allowed and forbidden transition; double approve/close changes stock once`

Branch `feat/goods-receipt` [R05, R06, R22]
- `feat(order): transactional outbox for order events`
- `feat(order): goods receipt on close via gRPC with an operation id; pending/failed state
  and retry job` (D1) [R05]
- `feat(inventory): idempotent AddStock keyed by operation id; check result success` [R05]
- `feat(inventory): outbox for stock events; publish after commit` [R22]
- `feat(warehouse): capacity projection from every stock change, deduplicated, rebuildable` [R06]
- `feat(warehouse): approval/receipt rejected when capacity would be exceeded` (D2)
- `test: inventory down during close → order stays "receipt pending" → recovers once`

Branch `fix/inventory-invariants` [R07]
- `fix(inventory): validate quantity and thresholds on create and update`
- `fix(inventory): unique (product, warehouse) and atomic quantity updates`
- `fix(order): validate quantity and referenced product, warehouse, company, driver`
- `test(inventory): concurrent add/consume keeps the exact quantity (Testcontainers)`

Branch `feat/documents` [R16]
- `feat: document metadata table, content sniffing (real PDF), size limit`
- `feat: persistent storage and authenticated download; no filesystem paths in responses`
- `fix(inventory): consumption documents use the same policy` (D8)

Acceptance: an integration test runs the whole flow (create → approve → deliver → close with PDF
→ stock and capacity correct → consume → low-stock notification) and a failure-injection test
(inventory down, Kafka down, duplicate events) ends in the same correct state.

### Phase 5 — Notifications and realtime

Branch `fix/notifications` [R12, R13, R14, R21]
- `fix(notification): process every event in order, await storage before committing the offset` [R13]
- `feat(notification): dedupe by event id, retry, dead-letter topic`
- `feat(notification): role-filtered feed and per-user read state` (D7) [R14]
- `feat(notification): fan-out across replicas (each pod consumes with its own group for broadcast)` [R21]
- `fix: split inventory.low (product) from warehouse.capacity.low; remove the unused subscription`
- `fix(mobile): render message, react to typed envelopes, invalidate the right queries` [R12]
- `test(notification): slow-write burst stores and delivers one notification per event`

### Phase 6 — Frontend correctness

Branch `fix/web` [R18, R24]
- `feat(web): shared HTTP client with 401 handling, error vs empty states`
- `feat(web): error boundary and retry for remote loading`
- `fix(web): roles and feature matrix from @erp/domain in shell and remotes (4 roles)`
- `fix(web): one URL layout for HTTP, WebSocket and remotes in dev and production` [R18]
- `fix(web): failed deletes and optimistic reads roll back with a message`

Branch `fix/mobile` [R15, R20, R23]
- `fix(mobile): wait for storage hydration before routing; tokens in SecureStore` [R15]
- `fix(mobile): clear query cache and unregister push token on logout` [R15]
- `chore(mobile): align jest, babel and Expo SDK 54 versions` [R20]
- `fix(mobile-gateway): CORS headers and trusted proxy setting` [R23]
- `feat(mobile): order actions follow the server state machine and permissions`

### Phase 7 — Full test suite

Runs alongside phases 3–6 (every PR adds its tests); this phase fills the gaps.

| Layer | Tooling | Scope |
|---|---|---|
| Unit | JUnit 5 + Mockito, xUnit, Vitest/Jest | domain rules, handlers, validators, hooks |
| Integration | Testcontainers (Postgres, Kafka) with Spring Boot Test, WebApplicationFactory, Supertest | each service against a real database and broker; migrations up/down |
| Contract | OpenAPI response validation in integration tests; proto compatibility (buf breaking); event schema validation in producers and consumers | no silent drift between services or clients |
| Security | permission matrix test (role × endpoint) through both gateways and direct | R01, R02, R10, R11 |
| E2E API | Playwright against the full stack in kind | every business flow and failure path |
| E2E browser | Playwright against the built web image | login, CRUD per remote, order lifecycle, notifications, SL/EN |
| Mobile | jest-expo + React Native Testing Library | screens, hooks, auth store, realtime |
| Static | ESLint, tsc, Checkstyle/SpotBugs, dotnet format/analyzers, Semgrep, gitleaks, Trivy, npm audit | every PR |

Coverage target: 80 % lines on domain and application layers per service, reported in CI
(a floor, not a goal in itself).

Not automatable here (stated honestly): running the mobile app on a physical device, and a
human look at visual layout. A manual checklist goes into `docs/operations/release-checklist.md`.

### Phase 8 — Kubernetes

Branch `feat/k8s`
- `feat(k8s): Kustomize base for all services, gateways, web, Postgres, Kafka`
  - Deployments with requests/limits, liveness and readiness probes on real health endpoints,
    non-root, read-only root filesystem, dropped capabilities
  - Services are ClusterIP; only the ingress is public; NetworkPolicies allow only the
    documented calls (gateway → services, order → inventory gRPC, all → Kafka, each → its DB)
  - Postgres StatefulSet with PVC; Kafka KRaft StatefulSet with PVC; documents PVC
  - Migrations as Jobs (or init containers) before each service starts
  - ConfigMaps for config, Secrets for credentials and the JWT signing key
- `feat(k8s): local overlay for kind; CI e2e runs against it`
- `feat(k8s): vps overlay (k3s, Traefik ingress, cert-manager + Let's Encrypt, smaller limits)`
- `docs: archive OpenShift manifests` (D10)

Acceptance: `kubectl apply -k deploy/k8s/overlays/local` on a fresh kind cluster passes the full
e2e suite in CI.

### Phase 9 — VPS hosting

Branch `feat/vps`

**Shape:** one VPS, k3s (single-node Kubernetes, ~500 MB overhead), Traefik ingress (bundled),
cert-manager for Let's Encrypt TLS, images from GHCR pinned by digest.

```text
Internet ─443─> Traefik ingress ─┬─ app.<domain>      → web (nginx: shell + 7 remotes)
                                 ├─ app.<domain>/api  → web-gateway
                                 ├─ api.<domain>      → mobile-gateway (+ /ws)
                                 └─ nothing else is exposed (no DB, Kafka, service ports)
```

**Sizing** (estimates; measured in phase 8 and adjusted):

| Part | RAM |
|---|---|
| 4 Spring services + web gateway (JVM, tuned heap) | ~2.0–2.5 GB |
| 3 .NET services | ~0.5 GB |
| 3 Node services + mobile gateway | ~0.4 GB |
| PostgreSQL (one server, 8 databases) | ~0.5 GB |
| Kafka KRaft (single broker) | ~0.8 GB |
| k3s, Traefik, cert-manager, web nginx | ~0.7 GB |
| **Total** | **~5–5.5 GB** |

Recommended: **8 GB RAM, 4 vCPU, 80 GB SSD** (Hetzner CX32/CPX31 or similar, ~€8–15/month).
4 GB is not enough for this stack with Kafka and four JVMs.

**Steps** (`deploy/vps/`, each a script plus a runbook section):
1. Harden: non-root sudo user, SSH keys only, no password login, `ufw` allowing 22/80/443 only
   (optionally SSH only over Tailscale), unattended security upgrades, fail2ban.
2. Install k3s; install cert-manager; ClusterIssuer for Let's Encrypt.
3. DNS: `app.<domain>` and `api.<domain>` A records to the VPS.
4. Secrets: created on the server from a local `.env.vps` (never committed), or SOPS-encrypted in
   the repo with an age key kept off GitHub.
5. Deploy: `kubectl apply -k deploy/k8s/overlays/vps` with image digests from the release workflow.
6. CD: `release.yml` builds and scans images, pushes to GHCR, then applies the overlay with a
   **namespace-scoped** kubeconfig stored as a GitHub environment secret (manual approval
   required on the `production` environment).
7. Backups: nightly `pg_dump` per database + documents volume to off-site storage (e.g. Hetzner
   Storage Box or S3-compatible bucket), 14-day retention; a **tested restore** in the runbook.
8. Monitoring: k3s metrics-server; uptime check on `/healthz` (e.g. Uptime Kuma or an external
   free checker); log retention via `journald` limits. Prometheus/Grafana goes to BACKLOG
   unless RAM allows.

Alternative if you prefer less to operate: the same VPS running `docker compose` behind Caddy
(automatic TLS). Simpler, but then Kubernetes is only used in CI. Recommended: k3s, because you
asked for Kubernetes and it is the same manifests everywhere.

### Phase 10 — Documentation finish

Branch `docs/final`
- `docs: specs for every feature slice (AUTH, COMPANY, WAREHOUSE, PRODUCT, FLEET, INVENTORY,
  ORDER, NOTIFICATION, AI)`
- `docs: operations runbook (deploy, rollback, backup/restore, key rotation, incidents)`
- `docs: service READMEs (purpose, API, events, config, how to test)`
- `docs: update README, archive the old review with a "resolved by" column per finding`

## 7. Order, size and what I need from you

| Phase | PRs | Depends on |
|---|---|---|
| 0 Monorepo + baseline | 2 | — |
| 1 Standards, CI, infra footprint | 3 | 0 |
| 2 Contracts | 1 | 1 |
| 3 Security | 3 | 2 |
| 4 Order and stock integrity | 4 | 3 |
| 5 Notifications | 1 | 4 |
| 6 Frontend | 2 | 3 (and 4 for order actions) |
| 7 Test gaps | ongoing | each phase |
| 8 Kubernetes | 1 | 1 (e2e gate after 4–6) |
| 9 VPS | 1 | 8 and your VPS |
| 10 Docs | 1 | all |

About 20 PRs. Phases 0–2 are mostly mechanical; 3–6 change behaviour and should be reviewed by
you before merge. This is several working sessions, not one.

**Constraints on this machine (must be solved before phase 0 testing):**
- **Disk: 6.7 GB free** on `/`. The full test baseline needs roughly 15–20 GB (Maven, NuGet and
  npm caches, .NET SDK, Playwright, Kafka/Postgres images). Docker reports ~31 GB of unused
  images and ~4 GB of unused volumes that could be pruned (they may belong to other projects).
- Node, .NET, Maven and kubectl are not installed on the host; everything will run in pinned
  containers (same images as CI), so nothing needs installing.

**From you:**
1. Approve or change decisions D1–D13.
2. How PRs are merged (you review each, or merge myself after CI is green).
3. VPS details: provider, RAM/CPU, OS, domain name (needed for phase 9 only).
4. Free disk space (or permission to prune unused Docker images/volumes).
