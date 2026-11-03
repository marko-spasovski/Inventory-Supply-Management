package com.marko.logistics.warehouse.application.port.in;

import com.marko.logistics.warehouse.application.dto.TotalWarehousesResponse;

public interface GetTotalNumberOfWarehouses {
    TotalWarehousesResponse countAllWarehouses();
}
