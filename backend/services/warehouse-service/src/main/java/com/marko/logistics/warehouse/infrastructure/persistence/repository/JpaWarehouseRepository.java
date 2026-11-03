package com.marko.logistics.warehouse.infrastructure.persistence.repository;

import com.marko.logistics.warehouse.infrastructure.persistence.entity.WarehouseJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface JpaWarehouseRepository extends JpaRepository<WarehouseJpaEntity, UUID> {
}
