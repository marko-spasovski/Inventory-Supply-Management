package com.marko.logistics.inventory.application.port.out;

import com.marko.logistics.inventory.domain.model.Inventory;

import java.util.List;
import java.util.Optional;

public interface InventoryRepositoryPort {
    Inventory save(Inventory inventory);
    List<Inventory> findAll();
    Optional<Inventory> findByProductIdAndWarehouseId(String productId, String warehouseId);
    List<Inventory> findAllByWarehouseId(String warehouseId);
}
