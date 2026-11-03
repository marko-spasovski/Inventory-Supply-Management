package com.marko.logistics.warehouse.application.event;

public record InventoryLowEvent(
        String warehouseId,
        int capacityLeft
) {}
