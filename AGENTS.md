# Inventory & Supply ERP

Web and mobile platform for inventory, procurement (supply orders), warehouse and fleet management.
Single-tenant: one organisation, four roles (ADMIN, MANAGER, WORKER, DRIVER). Companies are
supplier/partner records, not tenants (ADR 006).

Read docs/product.md, docs/requirements.md, docs/architecture.md and /contracts before coding.
The current programme of work is docs/plans/remediation-plan.md (phases 0–10).

## Stack
- Java services: Java 21, Spring Boot 3.5 (moving to 4, see the plan), Spring Data JPA, Flyway, Spring Security resource server
  (auth, company, warehouse, inventory) and Spring Cloud Gateway (web-gateway)
- .NET services: .NET 9, ASP.NET Core, EF Core migrations, JwtBearer (fleet, product, order)
- Node services: Node 24 LTS, TypeScript strict, Express (notification, ai, mobile-gateway)
- Messaging: Kafka (KRaft) for events, gRPC for the synchronous stock command (order → inventory)
- Database: PostgreSQL, one server, one database and one owner + runtime role per service (ADR 002)
- Web: React 19.1 (one React version in the whole workspace) + Vite 5 + Module Federation (shell + 7 remotes), shared packages in frontend/packages
- Mobile: Expo 54 (React Native 0.81), expo-router
- Infra: Docker, Kubernetes (Kustomize; kind in CI, k3s on the VPS), GitHub Actions, GHCR

## Repo layout
backend/services/<9 services>, backend/gateways/{web-gateway,mobile-gateway}, frontend/ (npm
workspace: packages/, web/, mobile/), contracts/ (OpenAPI, proto, event schemas), db/init/,
deploy/ (local launcher compose, k8s base and overlays, vps scripts), tests/ (e2e), docs/,
scripts/ (local launcher), .github/workflows/.

## Commands (keep this section accurate; update when scripts change)
- Host tools are optional: every command below also runs in the pinned container image used by CI
  (`maven:3.9-eclipse-temurin-21`, `mcr.microsoft.com/dotnet/sdk:9.0`, `node:24`).
- Whole stack for development: `./run-local.sh` (infrastructure in Docker, apps on the host; see
  docs/LOCAL_DEVELOPMENT.md). Stop with `q`.
- Java service: `./mvnw test`, `./mvnw verify` (in the service folder).
- .NET service: `dotnet test` (fleet and product: in `<service>.Tests/`; order:
  `dotnet test order-service.Tests/order-service.Tests.csproj`).
- Node service: `npm ci`, `npm test`, `npm run build`.
- Frontend (in `frontend/`): `npm ci`, `npm run lint --workspace=@erp/mobile`, `npm test --workspaces --if-present`,
  `npm run build --workspaces --if-present`; web shell dev server `npm run shell`; mobile `npm run mobile`.
- Launcher tests: `python3 -m unittest discover -s scripts/tests`.
- Scans (as CI runs them, pinned images in .github/workflows/): `gitleaks git .` (known historic
  findings in `.gitleaksignore`), Semgrep with explicit rule packs, `trivy image` (fails on a fixable
  CRITICAL; time-limited exceptions in `.trivyignore`), `npm audit --omit=dev --audit-level=critical`,
  actionlint.

## Non-negotiables
1. A service owns its data. Never read or write another service's database. Talk only through the
   APIs in /contracts, the gRPC contract, or Kafka events.
2. Every service verifies the access token itself (signature, expiry, audience, token type).
   Gateways check too, but "it came through the gateway" is never a reason to trust a request.
3. Authorization is enforced on the server, from the permission matrix in docs/requirements.md.
   Hiding a button is not security. A driver's identity comes from the token, never from a query
   parameter or body.
4. Role and user id come only from the verified token, never from the body, URL or headers set
   by a client.
5. API, proto and event changes start in /contracts and are updated in the same PR as the code.
6. No secrets in code, commits, logs or docs. `.env` locally (gitignored); Kubernetes Secrets
   created from an uncommitted file on the server.
7. All SQL parameterized. All input validated. Error responses use the shared error body and never
   leak stack traces, SQL or file paths.
8. Every endpoint has tests: success, 401 without a token, 403 for a role that may not act (404 for
   a resource the caller may not see), and 400 for invalid input.
9. Events are written with a transactional outbox and published after commit. Consumers are
   idempotent (processed-event table) and failures go to a dead-letter topic.
10. Network calls have timeouts and retries with backoff; a failed call leaves a recoverable state,
    never a half-done one.
11. Schema changes only through migrations (Flyway, EF Core, node-pg-migrate). Never
    `ddl-auto=update` outside throwaway tests. No destructive migration without a written plan.
12. Containers run as non-root with a read-only root filesystem; images are pinned by digest when
    deployed.

## Workflow
- Plan first for large changes; follow the remediation plan phase by phase.
- One branch and one PR per slice: contract → migration → domain/service → endpoint → tests →
  frontend → docs.
- Run lint, typecheck, tests and scans for the changed service before calling a task done.
- Update docs, contracts and BACKLOG.md in the same change.
- New ideas go into BACKLOG.md. Do not build them unprompted.
- Do not add a new service or a shared library with business logic without asking.

## Git rules
- Never commit to main. One branch per task: feat/..., fix/..., chore/..., docs/..., test/..., ci/...
- Small commits with Conventional Commit messages (feat:, fix:, docs:, test:, chore:, refactor:, ci:),
  with a scope when one service is touched, for example `fix(order): ...`.
- Never run git push --force, git reset --hard, or delete branches without asking.
- Never commit secrets, `.env`, runtime uploads (`*/Documents/`) or build output.
- A PR has: summary, how it was tested, risks, and which docs changed. It is merged when CI is green.
- Never weaken an assertion to make CI green. A test that asserts approved behaviour the code does
  not have yet is quarantined with `Skip`/`skip` and a reason, and listed in docs/testing/baseline.md.

## Definition of Done
Acceptance criteria met; permission and failure cases tested; contracts updated; lint, types, tests
and CI green (SAST, dependency, secret and image scans); migrations run in CI; docs and BACKLOG
updated; PR merged.
