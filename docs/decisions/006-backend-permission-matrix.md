# ADR 006: One backend permission matrix; the UI only mirrors it

- Status: Accepted
- Date: 2026-11-03

## Context
Permissions existed in three disagreeing places: a frontend feature matrix, mobile-gateway guards,
and a few service annotations. One broad "change order status" permission let any role approve
orders. ADMIN could not edit warehouses while MANAGER could (R11). Drivers chose which orders to
see through a query parameter (R10).

## Decision
- The permission matrix in `docs/requirements.md` is the single source of truth for who may do what.
- Each service enforces its rows of the matrix in code (method or route policies). Gateways enforce
  the same rows as a first filter.
- Ownership rules (`own`) are resolved on the server from the token. A driver's id comes from
  fleet-service's mapping of the token's `sub`, never from the request.
- `@erp/domain` mirrors the matrix for showing and hiding UI, and a test checks that the mirror
  matches the matrix.
- Not allowed → 403. Exists but not yours → 404.
- The system is single-tenant. Companies are partner records, not access boundaries.

## Consequences
- A generated test runs every role against every endpoint, through both gateways and directly
  against each service.
- Adding an endpoint means adding a matrix row first.
