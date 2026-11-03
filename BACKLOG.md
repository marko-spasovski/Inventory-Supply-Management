# Backlog

Ideas and later work. Not built until picked up. The current programme is
[docs/plans/remediation-plan.md](docs/plans/remediation-plan.md); items move from here into a phase or a spec.

## Product
- Capacity by weight or volume, not only units (D3). Needs product dimensions and a conversion rule.
- Reserve warehouse capacity on Approve and release it on Cancel/Reject, as well as receiving stock on
  Close (ADR 007 alternative). Needs a "reserved" quantity next to "on hand".
- Partial deliveries: close an order for fewer units than ordered, with a reason.
- Customer (outbound) orders and stock transfers between warehouses.
- Multi-tenancy: an organisation per tenant, with companies scoped to it (D6 keeps the system single-tenant).
- Audit log of who changed what, viewable by ADMIN.

## Mobile
- Offline writes with a sync queue and conflict handling (D9 allows a read-only cache only).
- Driver navigation link from the order's warehouse address.

## Platform
- Pagination on every list endpoint (requirements: lists are paginated before data grows).
- Prometheus + Grafana on the VPS if RAM allows; until then metrics-server and an uptime checker.
- S3-compatible object storage for documents if order-service needs more than one replica (ADR 009).
- Automated JWT signing-key rotation (phase 3 rotates by runbook).
- Schema registry if event versions multiply (ADR 003).
- Renovate or Dependabot for dependency updates, grouped per stack.

## Developer experience
- Generate OpenAPI from code annotations and diff against /contracts in CI, so neither can drift.
- A seed command that loads a realistic demo data set into any environment.
