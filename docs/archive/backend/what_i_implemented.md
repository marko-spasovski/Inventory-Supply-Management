# Nalog 7 — Implemented Microservice Patterns

## Patterns already present before Nalog 7

| Pattern | Where |
|---|---|
| API Gateway / BFF | `gateway-service` (Spring), `mobile-gateway` (Express/TS) |
| Database per Service | Every service has its own PostgreSQL DB |
| Messaging (Kafka) | `order-service` → Kafka topics `order.created`, `order.status.changed`; `inventory-service` → `inventory.stock.updated` |
| Domain Events | `OrderCreatedEvent`, `OrderStatusChangedEvent`, `InventoryUpdatedEvent` |
| Access Token (JWT) | `gateway-service` validates JWT; all services read `X-User-*` headers |
| Remote Procedure Call (gRPC) | `inventory-service` serves gRPC; `order-service` calls it when closing an order |
| Client-side UI Composition (Micro-frontends) | `micro-frontends/shell` + 7 independent MF apps |
| Hexagonal Architecture (Ports & Adapters) | `inventory-service`, `company-service` |

---

## Pattern 1 — CQRS (Ločevanje odgovornosti poizvedbenih ukazov)

### Where
`services/inventory-service` (Java 21 / Spring Boot)

### Why it makes sense
The inventory service handles two fundamentally different concerns:
- **Writes** — increasing or reducing stock (triggered by the HTTP API or gRPC from order-service). These are infrequent but critical and go through business-rule validation.
- **Reads** — listing all inventory or filtering by warehouse. These are frequent (every frontend page load) and need no validation.

Before CQRS everything ran through the single `InventoryService`, mixing the two concerns. With CQRS the two sides can evolve, scale, and be cached independently.

### What was added

| File | Role |
|---|---|
| `application/command/AddStockCommand.java` | Immutable record carrying add-stock intent |
| `application/command/ReduceStockCommand.java` | Immutable record carrying reduce-stock intent |
| `application/command/handler/AddStockCommandHandler.java` | **Command side** — validates and applies the add-stock business rule |
| `application/command/handler/ReduceStockCommandHandler.java` | **Command side** — validates and applies the reduce-stock business rule |
| `application/query/GetAllInventoryQuery.java` | Marker record for "give me all inventory" query |
| `application/query/GetInventoryByWarehouseQuery.java` | Marker record for "give me inventory for warehouse X" query |
| `application/query/handler/GetAllInventoryQueryHandler.java` | **Query side** — read-only, no side effects |
| `application/query/handler/GetInventoryByWarehouseQueryHandler.java` | **Query side** — read-only, no side effects |

### What was modified

| File | Change |
|---|---|
| `presentation/controller/InventoryController.java` | `POST /inventory` dispatches an `AddStockCommand`; `GET` endpoints dispatch queries — controller no longer imports `InventoryService` at all |
| `grpc/InventoryGrpcService.java` | gRPC entry point now dispatches `AddStockCommand` through the same command handler instead of calling `InventoryService` directly |
| `domain/model/Inventory.java` | Added `reduce(int amount)` method so `ReduceStockCommandHandler` has a domain operation to invoke |

### How it looks in practice

```
POST /inventory          →  AddStockCommandHandler  →  InventoryRepositoryPort (write)
GET  /inventory          →  GetAllInventoryQueryHandler  →  InventoryRepositoryPort (read)
GET  /inventory/{id}     →  GetInventoryByWarehouseQueryHandler  →  InventoryRepositoryPort (read)
gRPC updateInventory     →  AddStockCommandHandler  →  InventoryRepositoryPort (write) + Kafka
```

---

## Pattern 2 — Circuit Breaker (Odklopnik)

### Where
`services/order-service` (C# / .NET 9)

### Why it makes sense
When an order is **closed**, the order-service makes a synchronous gRPC call to inventory-service to update stock. Without a circuit breaker:
- If inventory-service is down, every "close order" request blocks until timeout, then fails.
- After enough timeouts the thread pool saturates and the order-service becomes unresponsive too — a cascade failure.

With a circuit breaker:
1. After a certain failure threshold the circuit **opens**: subsequent calls are short-circuited immediately (no timeout wait).
2. After 30 seconds the circuit goes **half-open** and sends one probe request.
3. If the probe succeeds the circuit **closes** and normal operation resumes.
4. The order status update itself **still succeeds** even when the circuit is open, because the gRPC failure is caught and logged as a warning, not rethrown — stock reconciliation can happen later.

### What was added

| File | Role |
|---|---|
| `Infrastructure/Resilience/InventoryCircuitBreaker.cs` | Factory that builds a Polly v8 `ResiliencePipeline` — configures failure ratio, sampling window, break duration, and lifecycle logging |

### What was modified

| File | Change |
|---|---|
| `order-service.csproj` | Added `Polly 8.4.1` and `Polly.Extensions 8.4.1` NuGet packages |
| `Infrastructure/Grpc/InventoryGrpcClient.cs` | Constructor now accepts `ResiliencePipeline` (injected); gRPC call is wrapped in `circuitBreaker.ExecuteAsync()`; `BrokenCircuitException` is caught and logged as a warning so order-closure is not blocked |
| `Program.cs` | Registers `ResiliencePipeline` as a singleton (one shared circuit state for the whole process) via `InventoryCircuitBreaker.Create(logger)` |

### Circuit breaker settings

| Parameter | Value | Meaning |
|---|---|---|
| `FailureRatio` | 0.5 | Opens when ≥ 50 % of calls fail |
| `SamplingDuration` | 30 s | Window over which the ratio is measured |
| `MinimumThroughput` | 3 | At least 3 calls needed before it can open |
| `BreakDuration` | 30 s | Stays open for 30 s before going half-open |

---

---

## Tests

### Pattern 1 — CQRS (`inventory-service`, Java / Spring Boot)

**How to run:**
```bash
cd services/inventory-service
./mvnw test
```

**Expected result:** `Tests run: 26, Failures: 0, Errors: 0, Skipped: 0`

**Test files and what they demonstrate:**

| File | Tests | Demonstrates |
|---|---|---|
| `application/command/handler/AddStockCommandHandlerTest` | 4 | Command side — creates new inventory when none exists; increases existing stock; rejects quantity ≤ 0 |
| `application/command/handler/ReduceStockCommandHandlerTest` | 3 | Command side — reduces stock correctly; throws `InventoryNotFoundException` when product+warehouse missing; throws `IllegalArgumentException` on insufficient stock |
| `application/query/handler/GetAllInventoryQueryHandlerTest` | 2 | Query side — returns all inventory mapped to responses; returns empty list when none exist |
| `application/query/handler/GetInventoryByWarehouseQueryHandlerTest` | 2 | Query side — returns only records for the requested warehouse; returns empty list when none exist |
| `presentation/controller/InventoryControllerTest` | 4 | Controller dispatches `POST /inventory` to `AddStockCommandHandler` and `GET` endpoints to query handlers — `InventoryService` is no longer referenced |

**What to look for when they pass:**
- `AddStockCommandHandlerTest` — two separate code paths (create vs. increase) are exercised independently, proving the command side has isolated write logic.
- `ReduceStockCommandHandlerTest` — the `InventoryNotFoundException(String)` constructor fix is directly exercised by the not-found test.
- `InventoryControllerTest` — the controller talks only to handlers, never to `InventoryService`, confirming the CQRS split is complete.

---

### Pattern 2 — Circuit Breaker (`order-service`, C# / .NET 9)

**How to run:**
```bash
cd services/order-service
dotnet test order-service.Tests/order-service.Tests.csproj
```

**Expected result:** `Passed! - Failed: 0, Passed: 17, Skipped: 0, Total: 17`

**Test files and what they demonstrate:**

| File | Tests | Demonstrates |
|---|---|---|
| `Infrastructure/Grpc/InventoryGrpcClientTest` | 2 | Circuit open → `SendInventoryAsync` catches `BrokenCircuitException` and does **not** rethrow, so the order status update still succeeds |

**What to look for when they pass:**
- `SendInventoryAsync_DoesNotThrow_WhenCircuitIsOpen` — a pre-opened `ResiliencePipeline` is injected; the call returns without exception, proving graceful degradation works.
- `SendInventoryAsync_DoesNotThrow_WhenCircuitIsOpen_CalledMultipleTimes` — calling the method three times in a row against an open circuit never throws, proving the guard is stable across repeated failures.

The existing `OrderServiceTest.UpdateStatusAsync_WhenStatusIsClosed_CallsGrpcClient` (in `Application/Service/OrderServiceTest`) also belongs here — it proves the service layer triggers the gRPC call exactly once when an order is closed.

---

## Summary

Two previously absent microservice patterns were added to the system:

1. **CQRS** — `inventory-service` now has a clearly separated command side (write) and query side (read), making the intent of every operation explicit and both sides independently evolvable.

2. **Circuit Breaker** — `order-service` now uses a Polly-based circuit breaker around its gRPC call to `inventory-service`, preventing cascade failures when inventory-service is unavailable while still allowing orders to be closed successfully.
