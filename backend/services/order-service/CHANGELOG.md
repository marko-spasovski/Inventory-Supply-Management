# order-service — Changelog

## 2026-05-17 (b) — Driver-scoped filtering (closes Gap 3 — order side)

### `GET /orders?driverId={uuid}` — server-side filter

| File | Change |
|---|---|
| `Application/Interfaces/IOrderService.cs`     | + `Task<List<OrderResponse>> GetOrdersByDriverAsync(Guid driverId)` |
| `Application/Interfaces/IOrderRepository.cs`  | + `Task<List<Order>> GetByDriverIdAsync(Guid driverId)` |
| `Infrastructure/Persistence/OrderRepository.cs` | implements `GetByDriverIdAsync` (one EF `.Where`) |
| `Application/Services/OrderService.cs`        | `GetOrdersByDriverAsync` + extracts shared `MapToResponse` helper |
| `Controllers/OrdersController.cs`             | `GetOrdersAsync` accepts `[FromQuery] Guid? driverId`; if present, dispatches the scoped query |

Restart: `dotnet build && dotnet run`

### Verify

```bash
curl -i "http://localhost:8087/orders?driverId=<uuid>" \
  -H "X-User-Id: ..." -H "X-User-Email: ..." -H "X-User-Role: DRIVER"
```

---

## 2026-05-17 — Single-order endpoint

### `GET /orders/{id}` (closes Gap 11)

Previously the mobile order-detail screen had to fetch the entire list and
filter client-side. Added a direct lookup.

| File | Change |
|---|---|
| `Application/Interfaces/IOrderService.cs` | + `Task<OrderResponse?> GetOrderByIdAsync(Guid orderId)` |
| `Application/Services/OrderService.cs` | reuses the existing `_repository.GetByIdAsync` (already used by `UpdateStatusAsync`), maps to `OrderResponse`, returns null on not-found |
| `Controllers/OrdersController.cs` | new `[HttpGet("{id:guid}")] GetOrderByIdAsync` — 200 + OrderResponse on hit, 404 on miss |

### Restart instructions

```bash
# from services/order-service/
dotnet build
# kill the running order-service process, then:
dotnet run
```

### Verification

```bash
curl -i "http://localhost:8087/orders/<uuid>" \
  -H "Authorization: Bearer <jwt>"
```
