package com.marko.logistics.inventory.application.event;

/** Per-product low-stock signal: the on-hand quantity for {productId} in
 *  {warehouseId} has dropped below the configured min threshold (or to 0).
 *  The {capacityLeft} field reuses the existing warehouse-service schema so
 *  notification-service can deserialize a single shape for the inventory.low
 *  topic. */
public record InventoryLowStockEvent(
        String warehouseId,
        String productId,
        int capacityLeft
) {}
