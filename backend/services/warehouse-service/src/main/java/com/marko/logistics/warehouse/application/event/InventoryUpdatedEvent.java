package com.marko.logistics.warehouse.application.event;

// Mirror of the Inventory service's event — same field names for JSON deserialization.
public record InventoryUpdatedEvent(
        String warehouseId,
        int quantity
) {}