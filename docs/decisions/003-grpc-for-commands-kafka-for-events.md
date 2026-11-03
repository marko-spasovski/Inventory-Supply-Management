# ADR 003: gRPC for the synchronous stock command, Kafka for events, one contract each

- Status: Accepted
- Date: 2026-11-03

## Context
order-service calls inventory-service over gRPC, and the proto file is copied into both services.
Kafka carries order and stock events, but payloads have no schema, `inventory.low` means two
different things (low product stock and nearly full warehouse), and one subscribed topic has no producer.

## Decision
- gRPC only where the caller needs the answer to decide what to do next: `AddStock` during goods
  receipt. The proto lives once, in `contracts/proto/inventory.proto`, and both services generate
  code from it at build time. `buf lint` and `buf breaking` run in CI.
- Everything else that crosses a service boundary after the fact is a Kafka event. Each topic has a
  JSON Schema in `contracts/events/`, and all messages share one envelope:
  `{ id, type, version, occurredAt, source, payload }`.
- Topics are named `<entity>.<fact>` and mean one thing: `inventory.stock.low` for products,
  `warehouse.capacity.low` for warehouses.
- Kafka runs in KRaft mode (no ZooKeeper), on a persistent volume.

## Alternatives considered
- **REST for the stock command.** Workable. Rejected because gRPC already exists and the typed
  contract is part of the project's learning goal.
- **Schema registry with Avro.** More robust evolution, but another service to run. JSON Schema in
  the repo, checked in tests, is enough at this size.

## Consequences
- Contract drift becomes a build or test failure instead of a runtime surprise.
- Events gain a version field, so consumers can handle old and new shapes during a change.
