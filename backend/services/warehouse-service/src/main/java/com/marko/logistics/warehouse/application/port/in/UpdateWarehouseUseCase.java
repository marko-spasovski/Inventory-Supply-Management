package com.marko.logistics.warehouse.application.port.in;

import com.marko.logistics.warehouse.application.dto.UpdateWarehouseRequest;
import com.marko.logistics.warehouse.application.dto.WarehouseResponse;

import java.util.UUID;

public interface UpdateWarehouseUseCase {
    WarehouseResponse updateWarehouse(UUID id, UpdateWarehouseRequest request);
}
