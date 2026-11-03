# ADR 008: Notifications are a role-filtered shared feed with per-user read state

- Status: Accepted
- Date: 2026-11-03

## Context
Notifications were global: everyone saw everything, and "mark all read" marked them read for
everyone (R14). The consumer used `switchMap`, which drops deliveries in a burst, and acknowledged
Kafka messages before they were stored (R13). With more than one replica, a WebSocket client only
heard events consumed by its own pod.

## Decision
- One notification row per event. Recipients are defined by topic and role (the matrix), and
  drivers get only notifications for their own orders.
- Read state lives in `notification_reads (notification_id, user_id)`. "Mark all read" applies to the caller only.
- Events are processed one at a time per partition, and stored before the offset is committed,
  with deduplication by event id (ADR 004).
- Fan-out across replicas: each pod also consumes an internal `notification.created` topic with
  its own consumer group, so every pod can push to its own WebSocket clients.
- The WebSocket envelope is typed and versioned and matches `contracts/events`. Clients
  invalidate caches by `type`.

## Consequences
- The feed stays useful as a shared operations board, while each person has their own read status.
- One extra topic, plus a small per-user table.
