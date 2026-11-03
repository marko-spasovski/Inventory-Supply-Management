package com.marko.logistics.inventory.domain.model;

import java.util.UUID;

public class Inventory {

    private final String id;
    private final String warehouseId;
    private final String productId;
    private int quantity;
    // Nullable so existing rows without thresholds keep working unchanged.
    private Integer minQuantity;
    private Integer maxQuantity;


    public Inventory(String id, String productId, String warehouseId,
                     int quantity) {
        this(id, productId, warehouseId, quantity, null, null);
    }

    public Inventory(String id, String productId, String warehouseId,
                     int quantity, Integer minQuantity, Integer maxQuantity) {
        this.id = id;
        this.productId = productId;
        this.quantity = quantity;
        this.warehouseId = warehouseId;
        this.minQuantity = minQuantity;
        this.maxQuantity = maxQuantity;
    }

    public String getId() { return id; }
    public String getProductId() { return productId; }
    public String getWarehouseId(){ return warehouseId; }
    public int getQuantity() { return quantity; }
    public Integer getMinQuantity() { return minQuantity; }
    public Integer getMaxQuantity() { return maxQuantity; }

    public static Inventory create(String productId, String warehouseId, int quantity){
        return new Inventory(
                UUID.randomUUID().toString(),
                productId,
                warehouseId,
                quantity
        );
    }

    public static Inventory create(String productId, String warehouseId, int quantity,
                                   Integer minQuantity, Integer maxQuantity){
        return new Inventory(
                UUID.randomUUID().toString(),
                productId,
                warehouseId,
                quantity,
                minQuantity,
                maxQuantity
        );
    }

    public void increase(int amount){
        validate(amount);
        quantity += amount;
    }

    public void reduce(int amount) {
        validate(amount);
        if (this.quantity < amount) {
            throw new IllegalArgumentException(
                    "Insufficient stock: available=" + this.quantity + ", requested=" + amount);
        }
        quantity -= amount;
    }

    /** Update thresholds without touching quantity. Null values leave the
     *  current threshold in place — pass an explicit 0 to clear it. */
    public void setThresholds(Integer min, Integer max) {
        if (min != null) this.minQuantity = min;
        if (max != null) this.maxQuantity = max;
    }

    public void validate(int amount){
        if(amount <= 0){
            throw new IllegalArgumentException("Amount must be > 0");
        }
    }

    /** True iff a min threshold is set and the current quantity is below it. */
    public boolean isLowStock() {
        return minQuantity != null && quantity < minQuantity;
    }
}
