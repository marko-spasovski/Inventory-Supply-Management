package com.marko.logistics.inventory.application.port.in;

import com.marko.logistics.inventory.application.dto.InventoryResponse;

import java.util.List;

public interface GetInventoryUseCase {
    List<InventoryResponse> getByWarehouseId(String warehouseId);
}
