package com.marko.logistics.warehouse.application.port.in;

import com.marko.logistics.warehouse.application.dto.CreateWarehouseRequest;
import com.marko.logistics.warehouse.application.dto.WarehouseResponse;

public interface CreateWarehouseUseCase {
    WarehouseResponse createWarehouse(CreateWarehouseRequest request);
}
