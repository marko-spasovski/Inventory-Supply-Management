package com.marko.logistics.warehouse.application.dto;

import com.marko.logistics.warehouse.domain.enums.City;
import com.marko.logistics.warehouse.domain.enums.Country;

import java.util.UUID;

public record WarehouseResponse(
    UUID id,
    String name,
    Country country,
    City city,
    Integer totalCapacity,
    Integer usedCapacity
){}
