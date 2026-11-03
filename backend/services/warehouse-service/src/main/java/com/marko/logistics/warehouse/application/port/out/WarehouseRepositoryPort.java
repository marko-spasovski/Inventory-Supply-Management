package com.marko.logistics.warehouse.application.port.out;

import com.marko.logistics.warehouse.domain.model.Warehouse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WarehouseRepositoryPort {
    Warehouse save(Warehouse warehouse);
    Optional<Warehouse> findById(UUID id);
    List<Warehouse> findAll();
    void deleteById(UUID id);
}
