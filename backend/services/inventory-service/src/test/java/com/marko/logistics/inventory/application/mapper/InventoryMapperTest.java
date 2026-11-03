package com.marko.logistics.inventory.application.mapper;

import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.domain.model.Inventory;
import com.marko.logistics.inventory.infrastructure.persistence.entity.InventoryJpaEntity;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class InventoryMapperTest {

    @Test
    void toResponse_mapsAllFields_includingThresholds() {
        Inventory i = Inventory.create("p-1", "w-1", 50, 10, 100);
        InventoryResponse r = InventoryMapper.toResponse(i);

        assertEquals(i.getId(), r.id());
        assertEquals("p-1", r.productId());
        assertEquals("w-1", r.warehouseId());
        assertEquals(50, r.quantity());
        assertEquals(10, r.minQuantity());
        assertEquals(100, r.maxQuantity());
    }

    @Test
    void toResponse_nullsPreserved_whenThresholdsUnset() {
        Inventory i = Inventory.create("p-1", "w-1", 50);
        InventoryResponse r = InventoryMapper.toResponse(i);
        assertNull(r.minQuantity());
        assertNull(r.maxQuantity());
    }

    @Test
    void roundTrip_throughEntity_preservesAllFields() {
        Inventory original = Inventory.create("p", "w", 30, 5, 50);
        InventoryJpaEntity entity = InventoryMapper.toEntity(original);
        Inventory back = InventoryMapper.toDomain(entity);

        assertEquals(original.getId(), back.getId());
        assertEquals(original.getProductId(), back.getProductId());
        assertEquals(original.getWarehouseId(), back.getWarehouseId());
        assertEquals(original.getQuantity(), back.getQuantity());
        assertEquals(original.getMinQuantity(), back.getMinQuantity());
        assertEquals(original.getMaxQuantity(), back.getMaxQuantity());
    }
}
