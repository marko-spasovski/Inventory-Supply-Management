package com.marko.logistics.warehouse.infrastructure.persistence.adapter;

import com.marko.logistics.warehouse.application.mapper.WarehouseMapper;
import com.marko.logistics.warehouse.application.port.out.WarehouseRepositoryPort;
import com.marko.logistics.warehouse.domain.model.Warehouse;
import com.marko.logistics.warehouse.infrastructure.persistence.repository.JpaWarehouseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
@Slf4j
public class WarehouseRepositoryAdapter implements WarehouseRepositoryPort {

    private final JpaWarehouseRepository repository;

    @Override
    public Warehouse save(Warehouse warehouse){
        log.debug("Saving warehouse: {}", warehouse.getName());
        var entity = WarehouseMapper.toJpaEntity(warehouse);
        var saved = repository.save(entity);
        log.debug("Warehouse saved with ID: {}", saved.getId());
        return WarehouseMapper.toDomain(saved);
    }

    @Override
    public Optional<Warehouse> findById(UUID id){
        log.debug("Finding warehouse by ID: {}", id);
        return repository
                .findById(id)
                .map(entity -> {
                    log.debug("Warehouse found: {}", entity.getName());
                    return WarehouseMapper.toDomain(entity);
                });
    }

    @Override
    public List<Warehouse> findAll(){
        log.debug("Fetching all warehouses");
        var warehouses = repository.findAll()
                .stream()
                .map(WarehouseMapper::toDomain)
                .collect(Collectors.toList());
        log.debug("Fetched {} warehouses", warehouses.size());
        return warehouses;
    }

    @Override
    public void deleteById(UUID id){
        log.debug("Deleting warehouse ID: {}", id);
        repository.deleteById(id);
        log.debug("Warehouse ID {} deleted", id);
    }
}