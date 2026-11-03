package com.marko.logistics.warehouse.domain.exception;

import java.util.UUID;

public class WarehouseNotFoundException extends RuntimeException {
    public WarehouseNotFoundException(UUID warehouseId) {
        super("Warehouse with id " + warehouseId + " not found.");
    }
}
