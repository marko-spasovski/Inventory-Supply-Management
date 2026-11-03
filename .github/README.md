# CI

Every workflow follows the same rules (docs/architecture.md, "Pipeline"):

- GitHub's own actions only, pinned to a commit SHA. Scanners run as Docker images pinned by digest.
- `permissions: contents: read` everywhere; no secrets are needed to test a PR.
- Workflow inputs reach shell scripts only through environment variables, never as `${{ }}` inside `run:`.
- A service's workflow runs only when that service (or its pipeline, or `.trivyignore`) changes.

## Workflows

| File | Runs when | What it does |
|---|---|---|
| `_java-service.yml` | called | `./mvnw verify` (unit + integration tests), Semgrep, image build, Trivy image and Dockerfile scans |
| `_dotnet-service.yml` | called | `dotnet restore/build/test`, Semgrep, image build, Trivy |
| `_node-service.yml` | called | `npm ci --ignore-scripts`, `tsc --noEmit`, lint, test, build, `npm audit`, Semgrep, image build, Trivy |
| `auth-service.yml`, `company-service.yml`, `warehouse-service.yml`, `inventory-service.yml`, `web-gateway.yml` | that folder changes | `_java-service.yml` |
| `fleet-service.yml`, `product-service.yml`, `order-service.yml` | that folder changes | `_dotnet-service.yml` |
| `notification-service.yml`, `ai-service.yml`, `mobile-gateway.yml` | that folder changes | `_node-service.yml` |
| `frontend.yml` | `frontend/**` changes | typecheck (web, packages, mobile), mobile lint, all workspace tests, web builds, audit, Semgrep, web image, Trivy |
| `repo-checks.yml` | every PR and push to main | gitleaks over the full history, actionlint, launcher tests |

Later phases add `e2e.yml` (the full stack in kind, Playwright) and `release.yml` (GHCR images by digest,
gated deploy to the VPS); see docs/plans/remediation-plan.md.

## Gates and accepted exceptions

| Gate | Fails on | Exceptions |
|---|---|---|
| Tests | any failing test | quarantined tests use `Skip` with a reason and are listed in docs/testing/baseline.md |
| Semgrep | any finding in the listed rule packs | `nosemgrep` with a reason on the exact line; rule exclusions are named in the workflow |
| Trivy image | a CRITICAL vulnerability that has a fix | `.trivyignore`: one line per CVE, with the reason and an expiry date |
| npm audit | a critical advisory in production dependencies | none |
| gitleaks | any secret in any commit | `.gitleaksignore`: fingerprints of the known, already-public development secret (rotated in phase 3) |
