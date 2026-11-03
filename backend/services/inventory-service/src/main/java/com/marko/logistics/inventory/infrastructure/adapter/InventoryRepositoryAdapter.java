package com.marko.logistics.inventory.infrastructure.adapter;

import com.marko.logistics.inventory.application.mapper.InventoryMapper;
import com.marko.logistics.inventory.application.port.out.InventoryRepositoryPort;
import com.marko.logistics.inventory.domain.model.Inventory;
import com.marko.logistics.inventory.infrastructure.persistence.entity.InventoryJpaEntity;
import com.marko.logistics.inventory.infrastructure.repository.JpaInventoryRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;


@Component
public class InventoryRepositoryAdapter implements InventoryRepositoryPort {
    private final JpaInventoryRepository repository;

    public InventoryRepositoryAdapter(JpaInventoryRepository repository) {
        this.repository = repository;
    }

    public Inventory save(Inventory inventory) {
        InventoryJpaEntity entity = InventoryMapper.toEntity(inventory);
        repository.save(entity);
        return inventory;
    }

    public List<Inventory> findAll(){
        var inventory = repository.findAll();

        return inventory
                .stream()
                .map(InventoryMapper::toDomain)
                .collect(Collectors.toList());
    }

    public Optional<Inventory> findByProductIdAndWarehouseId(String productId, String warehouseId) {
        return repository.findByProductIdAndWarehouseId(productId, warehouseId).map(InventoryMapper::toDomain);
    }

    public List<Inventory> findAllByWarehouseId(String warehouseId) {
        return repository.findAllByWarehouseId(warehouseId).stream().map(InventoryMapper::toDomain).toList();
    }

}
