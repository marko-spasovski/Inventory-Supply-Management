package com.marko.logistics.warehouse.application.dto;

import com.marko.logistics.warehouse.domain.enums.City;
import com.marko.logistics.warehouse.domain.enums.Country;

public record UpdateWarehouseRequest(
        String name,
        Country country,
        City city,
        Integer totalCapacity,
        Integer usedCapacity
) {
}
