# inventory-service — Changelog

## 2026-05-17 — Min/max stock thresholds (closes Gap 13)

`Inventory` now carries optional `minQuantity` / `maxQuantity` columns. The
mobile low-stock badge becomes data-driven and the AI service uses real
thresholds for its alert and reorder logic.

### Domain + persistence

| File | Change |
|---|---|
| `domain/model/Inventory.java`                                       | adds `Integer minQuantity`, `Integer maxQuantity` (nullable). Second ctor + `create(..., min, max)` factory. `setThresholds(min, max)` and `isLowStock()`. |
| `infrastructure/persistence/entity/InventoryJpaEntity.java`         | adds nullable `Integer` columns + getters/setters. Two-arg ctor preserved for back-compat. |
| `application/mapper/InventoryMapper.java`                           | round-trips thresholds in `toDomain` / `toEntity` / `toResponse`. |
| `application/dto/InventoryResponse.java`                            | record extended with `Integer minQuantity, Integer maxQuantity`. |
| `application/dto/CreateInventoryRequest.java`                       | same — both optional in JSON. |
| `application/command/AddStockCommand.java`                          | carries the thresholds; 3-arg compact ctor kept for existing callers. |
| `application/command/handler/AddStockCommandHandler.java`           | applies thresholds on create; `setThresholds` (non-null wins) when present even for existing rows. |
| `presentation/controller/InventoryController.java`                  | forwards the new fields from request DTO into the command. |

### Migration

Because Hibernate `ddl-auto: update` is on (see `application-dev.yaml`), the
two new columns are added automatically on first restart. Existing rows
keep `NULL` thresholds — the AI service defaults to 10 in that case so the
"low stock" badge keeps working until a manager edits the thresholds.

### Restart

```bash
# from services/inventory-service/
mvn clean package -DskipTests
# kill the running inventory-service process, then:
java -jar target/inventory-service-*.jar
```

### Verify

```bash
# Create stock with thresholds (via gateway):
curl -X POST http://localhost:8090/stock \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{"warehouseId":"<wh>","productId":"<p>","quantity":50,"minQuantity":20,"maxQuantity":200}'

# Read back — thresholds round-trip:
curl http://localhost:8090/stock -H "Authorization: Bearer <jwt>"
```
