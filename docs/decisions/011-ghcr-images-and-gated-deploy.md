# ADR 011: Images in GHCR pinned by digest; deploy from CI behind a manual approval

- Status: Accepted
- Date: 2026-11-03

## Context
Images were pushed to Docker Hub with mutable `:latest` tags, which needed a personal token and
made a deployment impossible to reproduce.

## Decision
- `release.yml` builds every image on push to `main`, scans it with Trivy (fails on CRITICAL), and
  pushes it to `ghcr.io/marko-spasovski/polyglot-erp-microservices/<name>` using the workflow's
  own `GITHUB_TOKEN`.
- The deploy job writes the image digests into the VPS overlay and runs `kubectl apply -k`.
- It uses a namespace-scoped kubeconfig stored as a secret of the GitHub `production`
  environment, which requires manual approval.

## Consequences
- No long-lived registry credentials.
- Rollback is re-applying the previous digests (runbook).
- The kubeconfig can only touch the app namespace, not the cluster.
