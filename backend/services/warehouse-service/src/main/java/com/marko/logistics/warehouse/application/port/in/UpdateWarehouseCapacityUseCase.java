package com.marko.logistics.warehouse.application.port.in;

import java.util.UUID;

public interface UpdateWarehouseCapacityUseCase {
    void increaseUsedCapacity(UUID warehouseId, int quantity);
}
