package com.marko.logistics.inventory.application.mapper;

import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.domain.model.Inventory;
import com.marko.logistics.inventory.infrastructure.persistence.entity.InventoryJpaEntity;

public class InventoryMapper {
    public static InventoryResponse toResponse(Inventory i) {
        return new InventoryResponse(
                i.getId(),
                i.getProductId(),
                i.getWarehouseId(),
                i.getQuantity(),
                i.getMinQuantity(),
                i.getMaxQuantity()
        );
    }

    public static Inventory toDomain(InventoryJpaEntity e) {
        return new Inventory(
                e.getId(),
                e.getProductId(),
                e.getWarehouseId(),
                e.getQuantity(),
                e.getMinQuantity(),
                e.getMaxQuantity()
        );
    }

    public static InventoryJpaEntity toEntity(Inventory i) {
        return new InventoryJpaEntity(
                i.getId(),
                i.getProductId(),
                i.getWarehouseId(),
                i.getQuantity(),
                i.getMinQuantity(),
                i.getMaxQuantity()
        );
    }
}
