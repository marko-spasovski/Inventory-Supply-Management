package com.marko.logistics.inventory.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory")
public class InventoryJpaEntity {

    @Id
    private String id;

    private String productId;
    private String warehouseId;
    private int quantity;
    // Nullable so existing rows pre-Gap-13 migrate seamlessly.
    @Column(nullable = true)
    private Integer minQuantity;
    @Column(nullable = true)
    private Integer maxQuantity;

    private LocalDateTime createdAt;
    private LocalDateTime lastModified;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.lastModified = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.lastModified = LocalDateTime.now();
    }

    public InventoryJpaEntity(String id, String productId, String warehouseId, int quantity) {
        this(id, productId, warehouseId, quantity, null, null);
    }

    public InventoryJpaEntity(String id, String productId, String warehouseId, int quantity,
                               Integer minQuantity, Integer maxQuantity) {
        this.id = id;
        this.productId = productId;
        this.warehouseId = warehouseId;
        this.quantity = quantity;
        this.minQuantity = minQuantity;
        this.maxQuantity = maxQuantity;
    }

    public InventoryJpaEntity() {} // JPA needs this

    public String getId() {
        return id;
    }

    public String getProductId() {
        return productId;
    }

    public String getWarehouseId() {
        return warehouseId;
    }

    public int getQuantity() {
        return quantity;
    }

    public Integer getMinQuantity() {
        return minQuantity;
    }

    public Integer getMaxQuantity() {
        return maxQuantity;
    }

    public void setMinQuantity(Integer minQuantity) {
        this.minQuantity = minQuantity;
    }

    public void setMaxQuantity(Integer maxQuantity) {
        this.maxQuantity = maxQuantity;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getLastModified() {
        return lastModified;
    }
}
