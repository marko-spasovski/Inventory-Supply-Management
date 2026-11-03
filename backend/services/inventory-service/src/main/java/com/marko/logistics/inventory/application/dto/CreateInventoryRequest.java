package com.marko.logistics.inventory.application.dto;

public record CreateInventoryRequest(
        String warehouseId,
        String productId,
        int quantity,
        Integer minQuantity,
        Integer maxQuantity
) {}
