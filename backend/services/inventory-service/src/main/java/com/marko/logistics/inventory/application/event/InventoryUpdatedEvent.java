package com.marko.logistics.inventory.application.event;

// Sent to Kafka after a successful stock update.
// Warehouse service deserializes this to update usedCapacity.
public record InventoryUpdatedEvent(
        String warehouseId,
        int quantity
) {}