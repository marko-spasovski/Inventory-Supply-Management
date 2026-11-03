package com.marko.logistics.inventory.application.dto;

public record UpdateThresholdsRequest(
        String productId,
        String warehouseId,
        Integer minQuantity,
        Integer maxQuantity
) {}
