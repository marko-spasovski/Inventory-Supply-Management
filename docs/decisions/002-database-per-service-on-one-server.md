# ADR 002: Database per service on one PostgreSQL server, schema changes only through migrations

- Status: Accepted
- Date: 2026-11-03

## Context
Each service had its own PostgreSQL container (8 servers), which costs about 1.5 GB RAM more than
needed. The Java services changed their schema with Hibernate `ddl-auto=update`, which cannot be
reviewed, rolled back or run in a controlled order.

## Decision
- One PostgreSQL server. One **database per service**, each with an **owner role** (runs migrations)
  and a **runtime role** (data access only). A service's roles have no rights on other databases.
  Created by `db/init/` locally and a bootstrap Job in Kubernetes.
- Migrations: **Flyway** for Java services, **EF Core migrations** for .NET services,
  **node-pg-migrate** for notification-service. Migrations run before the service starts
  (init container or Job). `ddl-auto` is `validate`.

## Alternatives considered
- **One server per service.** The strongest isolation, but the RAM does not fit the 8 GB VPS
  alongside Kafka and four JVMs.
- **One database with a schema per service.** Also fine. Rejected because the services already use
  separate databases and connection strings, so this is the smaller change.

## Consequences
- Data ownership is still enforced by the database (role grants), not just by convention.
- One server is a single point of failure. Accepted for a single-VPS deployment, with nightly
  backups and a tested restore (docs/operations).
- The Java services need baseline Flyway migrations generated from the current schema (phase 1).
