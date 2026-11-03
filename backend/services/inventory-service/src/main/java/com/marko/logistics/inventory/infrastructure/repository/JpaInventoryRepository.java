package com.marko.logistics.inventory.infrastructure.repository;

import com.marko.logistics.inventory.infrastructure.persistence.entity.InventoryJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JpaInventoryRepository extends JpaRepository<InventoryJpaEntity, String> {
    Optional<InventoryJpaEntity> findByProductIdAndWarehouseId(String productId, String warehouseId);
    List<InventoryJpaEntity> findAllByWarehouseId(String warehouseId);
}
