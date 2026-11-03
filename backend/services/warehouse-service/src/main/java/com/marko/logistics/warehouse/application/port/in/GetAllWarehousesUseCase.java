package com.marko.logistics.warehouse.application.port.in;

import com.marko.logistics.warehouse.application.dto.WarehouseResponse;

import java.util.List;

public interface GetAllWarehousesUseCase {
    List<WarehouseResponse> getAllWarehouses();
}
