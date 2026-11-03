# ADR 010: Kubernetes with Kustomize: kind in CI, k3s on the VPS

- Status: Accepted
- Date: 2026-11-03

## Context
Deployment existed as OpenShift manifests with placeholder image names, ephemeral Kafka and
documents, development profiles and TCP-only probes (R09, R21). The only full-stack local recipe
was missing services (R08). The target is one 8 GB VPS, and Kubernetes is a learning goal.

## Decision
- `deploy/k8s/base`: a Kustomize base with every service, both gateways, web, PostgreSQL
  (StatefulSet) and Kafka KRaft (StatefulSet). It includes probes on real health endpoints, resource
  requests and limits, non-root and read-only containers, NetworkPolicies, ConfigMaps and Secrets.
- `overlays/local`: kind, used by the e2e workflow on every PR.
- `overlays/vps`: k3s with Traefik ingress, cert-manager with Let's Encrypt, smaller limits, and
  images pinned by digest.
- The OpenShift manifests move to `docs/archive/`.

## Alternatives considered
- **Docker Compose on the VPS behind Caddy.** Less to operate. Rejected because Kubernetes is a
  goal, and having one manifest set for CI and production is worth the overhead.
- **Helm.** Templating is not needed with only two overlays. Kustomize is built into kubectl.

## Consequences
- k3s uses about 500 MB of the VPS's RAM.
- What CI tests is exactly what gets deployed.
