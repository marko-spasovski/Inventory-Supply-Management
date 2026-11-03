package com.marko.logistics.warehouse.application.port.in;

import com.marko.logistics.warehouse.application.dto.WarehouseResponse;

import java.util.UUID;

public interface GetWarehouseUseCase {
    WarehouseResponse getWarehouseById(UUID id);
}
