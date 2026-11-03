package com.marko.logistics.inventory.application.dto;

public record ConsumeItem(
        String productId,
        String warehouseId,
        int quantity
) {}
