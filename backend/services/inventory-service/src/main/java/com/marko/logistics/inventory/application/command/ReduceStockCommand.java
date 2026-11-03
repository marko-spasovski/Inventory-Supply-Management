package com.marko.logistics.inventory.application.command;

public record ReduceStockCommand(String productId, String warehouseId, int quantity) {}
