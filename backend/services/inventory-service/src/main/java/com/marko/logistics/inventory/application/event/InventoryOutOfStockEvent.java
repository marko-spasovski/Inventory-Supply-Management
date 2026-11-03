package com.marko.logistics.inventory.application.event;

public record InventoryOutOfStockEvent(
        String warehouseId,
        String productId
) {}
