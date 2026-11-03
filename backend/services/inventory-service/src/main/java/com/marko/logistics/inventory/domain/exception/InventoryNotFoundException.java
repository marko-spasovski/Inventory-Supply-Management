package com.marko.logistics.inventory.domain.exception;

public class InventoryNotFoundException extends RuntimeException {

    public InventoryNotFoundException(String message){
        super(message);
    }

    public InventoryNotFoundException(String productId, String warehouseId){
        super("Inventory not found for product=" + productId + " warehouse=" + warehouseId);
    }
}
