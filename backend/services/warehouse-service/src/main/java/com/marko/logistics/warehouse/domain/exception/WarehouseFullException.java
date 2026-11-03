package com.marko.logistics.warehouse.domain.exception;

import java.util.UUID;

public class WarehouseFullException extends RuntimeException {
    public WarehouseFullException(UUID warehouseId, int totalCapacity, int requestedCapacity) {

        super("Warehouse with id "
                + warehouseId + " has total capacity "
                + totalCapacity + " and the requested total capacity is "
                + requestedCapacity);

    }
}
