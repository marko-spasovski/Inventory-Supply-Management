# fleet-service — Changelog

## 2026-05-17 — Driver self-view (closes Gap 3 — fleet side)

### `GET /drivers/me`

Resolves the driver whose email matches the `X-User-Email` header forwarded
by mobile-gateway. Used by the mobile DRIVER role to fetch their own
record without needing to know any driver id up front.

| File | Change |
|---|---|
| `Application/Ports/Out/IDriverRepositoryPort.cs`       | + `Task<Driver?> GetByEmail(string email)` |
| `Infrastructure/Repositories/DriverRepositoryAdapter.cs` | implementation — case-insensitive `FirstOrDefaultAsync` |
| `Application/Ports/In/Driver/IGetDriverByEmailUseCase.cs` | new use case port |
| `Application/Services/DriverService.cs`                  | implements `GetDriverByEmail` |
| `Presentation/Controllers/DriverController.cs`           | new `[HttpGet("me")]` — must precede `[HttpGet("{id:guid}")]` |
| `Program.cs`                                             | DI registration for `IGetDriverByEmailUseCase` |

Restart: `dotnet build && dotnet run`

### Verify

```bash
# Assumes the JWT email belongs to a driver record:
curl -i http://localhost:8083/drivers/me \
  -H "X-User-Email: driver@example.com"
```

(Via the gateway, the `X-User-*` headers are added automatically from the
JWT — just `curl http://localhost:8090/drivers/me -H "Authorization: Bearer <jwt>"`.)
