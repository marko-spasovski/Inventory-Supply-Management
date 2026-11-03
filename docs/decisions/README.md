# Architecture Decision Records

Each file records one decision: its context, the decision, the alternatives considered, and the
consequences. A merged ADR is not rewritten. A change of mind is a new ADR that supersedes the old one.

| Number | Title | Status |
|---|---|---|
| [001](001-polyglot-microservices-monorepo.md) | Polyglot microservices (9 services + 2 gateways) in one monorepo | Accepted |
| [002](002-database-per-service-on-one-server.md) | Database per service on one PostgreSQL server; migrations only | Accepted |
| [003](003-grpc-for-commands-kafka-for-events.md) | gRPC for the stock command, Kafka for events, one contract each | Accepted |
| [004](004-transactional-outbox-idempotent-consumers.md) | Transactional outbox; idempotent consumers; dead-letter topics | Accepted |
| [005](005-asymmetric-jwt-verified-everywhere.md) | Asymmetric JWTs with JWKS, verified by gateways and every service | Accepted |
| [006](006-backend-permission-matrix.md) | One backend permission matrix; the UI only mirrors it | Accepted |
| [007](007-order-state-machine-goods-receipt.md) | Server-side order state machine; stock received on Close | Accepted |
| [008](008-notification-feed-per-user-read-state.md) | Role-filtered notification feed with per-user read state | Accepted |
| [009](009-documents-on-persistent-volume.md) | Documents on a persistent volume with authenticated download | Accepted |
| [010](010-kubernetes-kustomize-k3s.md) | Kubernetes with Kustomize: kind in CI, k3s on the VPS | Accepted |
| [011](011-ghcr-images-and-gated-deploy.md) | GHCR images pinned by digest; gated deploy from CI | Accepted |

## Adding an ADR
Use the next number and a short kebab-case name, follow the same sections, and add a row to the
table above. A new ADR starts as "Proposed" and becomes "Accepted" when it is approved.

Statuses: Proposed, Accepted, Accepted. Amended by ADR NNN, Superseded by ADR NNN.
