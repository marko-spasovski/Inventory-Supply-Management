# product-service — Changelog

## 2026-05-17 — SKU lookup endpoint

### `GET /products/by-sku?sku=…` (closes Gap 5)

The mobile barcode scanner used to load the full product list and walk it
client-side. Replaced with a dedicated server-side lookup.

| File | Change |
|---|---|
| `Application/Ports/Out/IProductRepositoryPort.cs` | + `Task<Product?> GetBySku(string sku)` |
| `Infrastructure/Repositories/ProductRepositoryAdapter.cs` | implementation — `FirstOrDefaultAsync(p => p.SKU == sku)`, case-sensitive exact match |
| `Application/Ports/In/Product/IGetProductBySkuUseCase.cs` | new use case port |
| `Application/Services/ProductService.cs` | adds `GetBySku` to the impl |
| `Presentation/Controllers/ProductController.cs` | new `[HttpGet("by-sku")]` action — returns 400 if sku is missing/blank, 404 if no match, 200 + ProductResponse if found. Declared *before* `[HttpGet("{id:guid}")]` to remove route ambiguity |
| `Program.cs` | DI registration for `IGetProductBySkuUseCase` |

### Restart instructions

product-service runs as a `dotnet` process on the host. After pulling:

```bash
# from services/product-service/
dotnet build
# kill the running product-service process, then:
dotnet run
```

### Verification

```bash
curl -i "http://localhost:8085/products/by-sku?sku=SMK-001" \
  -H "Authorization: Bearer <jwt>"
# 200 with ProductResponse, 404 with { error, message } if no match
```
