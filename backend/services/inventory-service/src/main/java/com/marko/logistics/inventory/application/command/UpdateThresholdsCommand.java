package com.marko.logistics.inventory.application.command;

public record UpdateThresholdsCommand(
        String productId,
        String warehouseId,
        Integer minQuantity,
        Integer maxQuantity
) {}
