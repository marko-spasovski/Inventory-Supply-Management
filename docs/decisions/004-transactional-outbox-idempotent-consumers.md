# ADR 004: Transactional outbox for producers; idempotent consumers with a dead-letter topic

- Status: Accepted
- Date: 2026-11-03

## Context
Events are published directly from service code. If the publish fails after the database commit,
the event is lost (an approved order without its stock update). If it happens before the commit,
an event can describe a change that was rolled back (consumption events, R22). Consumers do not
deduplicate, so a redelivered stock event increases warehouse capacity twice (R06).

## Decision
- **Producers** (order, inventory, warehouse) write events to an `outbox` table in the same
  transaction as the business change. A relay in the same service publishes unsent rows to Kafka,
  marks them sent, and retries with backoff.
- **Consumers** (warehouse, notification) store each processed event `id` in a
  `processed_events` table, in the same transaction as their own change, and skip ids they have
  already seen. The Kafka offset is committed only after that transaction.
- After a fixed number of failed attempts a message goes to `<topic>.dlq` with the error, and the
  consumer moves on.

## Alternatives considered
- **Kafka transactions / exactly-once.** Does not cover the database write in the same transaction,
  and is not supported the same way in all three client libraries.
- **Debezium change data capture.** A clean outbox relay, but another heavy component on the VPS.

## Consequences
- Delivery is at least once with duplicate suppression, so it is effectively exactly once for state changes.
- Events are delayed by the relay's polling interval (target under one second).
- Each producer and consumer needs two small tables and a migration.
