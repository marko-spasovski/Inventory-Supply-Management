# ADR 007: Server-side order state machine; stock is received on Close

- Status: Accepted
- Date: 2026-11-03

## Context
`Order.UpdateStatus` assigned any status. Stock was added on every request that set Approved, so
approving twice added stock twice (R04). The gRPC result was ignored, so an order could be approved
without its stock (R05). Capacity could be exceeded, and the UI's "document required to close" rule
was not enforced by the API.

## Decision
- The transitions, and who may make them, are fixed in the domain (see docs/requirements.md).
  Every other transition is `409 invalid_transition`.
- **Approve** checks warehouse capacity and does not touch stock.
- **Close** is the goods receipt. It requires a delivery PDF and calls `AddStock` with
  `operationId = orderId`. inventory-service applies an operation id once only.
- If the call fails, the order stays Delivered with `receiptStatus = PENDING`. A background job
  retries until it succeeds, and only then sets Closed.
- Capacity can never be exceeded. It is checked at approval and again at receipt.
- Orders carry a row version for optimistic concurrency.

## Alternatives considered
- **Keep stock on Approve, with a reversal on cancel.** Stock would represent goods that have not
  arrived, and every cancellation would need a compensation step.
- **Reserve capacity on Approve and receive stock on Close.** More accurate, but needs a second
  quantity type (reserved). Moved to the BACKLOG.

## Consequences
- Stock and capacity reflect physical goods.
- The test that asserted stock on Close (quarantined in phase 0) becomes the first test of this ADR.
