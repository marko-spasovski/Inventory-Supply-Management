package com.marko.logistics.inventory.application.command;

public record AddStockCommand(
        String productId,
        String warehouseId,
        int quantity,
        Integer minQuantity,
        Integer maxQuantity
) {
    public AddStockCommand(String productId, String warehouseId, int quantity) {
        this(productId, warehouseId, quantity, null, null);
    }
}
