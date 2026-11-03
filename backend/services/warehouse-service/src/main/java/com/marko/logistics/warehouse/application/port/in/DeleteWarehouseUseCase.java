package com.marko.logistics.warehouse.application.port.in;

import java.util.UUID;

public interface DeleteWarehouseUseCase {
    void deleteWarehouseById(UUID id);
}
