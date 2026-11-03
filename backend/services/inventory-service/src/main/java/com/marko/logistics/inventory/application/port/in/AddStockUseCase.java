package com.marko.logistics.inventory.application.port.in;

import com.marko.logistics.inventory.application.dto.CreateInventoryRequest;
import com.marko.logistics.inventory.application.dto.InventoryResponse;

public interface AddStockUseCase {
    InventoryResponse addStock(CreateInventoryRequest request);
}
