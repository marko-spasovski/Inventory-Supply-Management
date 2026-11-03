package com.marko.logistics.warehouse.application.service;

import com.marko.logistics.warehouse.application.dto.CreateWarehouseRequest;
import com.marko.logistics.warehouse.application.dto.TotalWarehousesResponse;
import com.marko.logistics.warehouse.application.dto.UpdateWarehouseRequest;
import com.marko.logistics.warehouse.application.dto.WarehouseResponse;
import com.marko.logistics.warehouse.application.mapper.WarehouseMapper;
import com.marko.logistics.warehouse.application.port.in.*;
import com.marko.logistics.warehouse.application.port.out.WarehouseRepositoryPort;
import com.marko.logistics.warehouse.domain.exception.WarehouseNotFoundException;
import com.marko.logistics.warehouse.domain.model.Warehouse;
import com.marko.logistics.warehouse.infrastructure.messaging.InventoryKafkaProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseService implements
        CreateWarehouseUseCase,
        DeleteWarehouseUseCase,
        GetAllWarehousesUseCase,
        GetWarehouseUseCase,
        UpdateWarehouseUseCase,
        GetTotalNumberOfWarehouses,
        UpdateWarehouseCapacityUseCase
{

    private final WarehouseRepositoryPort repository;
    private final InventoryKafkaProducer _kafkaProducer;

    @Override
    public void increaseUsedCapacity(UUID warehouseId, int quantity){
        log.info("Increasing usedCapacity for warehouseId={} by {}", warehouseId, quantity);

        var warehouse = repository.findById(warehouseId)
                .orElseThrow(() -> {
                    log.warn("Warehouse not found for capacity update, id={}", warehouseId);
                    return new WarehouseNotFoundException(warehouseId);
                });

        int newUsed = warehouse.getUsedCapacity() + quantity;

        // Overflow is allowed: an approved order commits its quantity even when
        // it exceeds the warehouse's total capacity (e.g. total=1000, used=1200).
        // We record the overflow and still emit the "full" event below.
        if (newUsed > warehouse.getTotalCapacity()) {
            log.warn("Capacity overflow accepted for warehouseId={}: used={}, total={}",
                    warehouseId, newUsed, warehouse.getTotalCapacity());
        }

        warehouse.update(
                warehouse.getName(),
                warehouse.getCountry(),
                warehouse.getCity(),
                warehouse.getTotalCapacity(),
                newUsed
        );

        repository.save(warehouse);
        log.info("usedCapacity updated to {} for warehouseId={}", newUsed, warehouseId);

        int capacityLeft = warehouse.getTotalCapacity() - newUsed;

        if (capacityLeft <= 0) {
            log.info("Warehouse {} is full or over capacity ({} left) — sending inventory.out", warehouseId, capacityLeft);
            _kafkaProducer.sendOutInventoryEvent(warehouseId.toString());
        } else if (capacityLeft <= 500) {
            log.info("Warehouse {} is low ({} left) — sending inventory.low", warehouseId, capacityLeft);
            _kafkaProducer.sendLowInventoryEvent(warehouseId.toString(), capacityLeft);
        }
    }

    @Override
    public TotalWarehousesResponse countAllWarehouses() {
        log.info("Counting warehouses...");
        var totalWarehouses = repository.findAll();
        return new TotalWarehousesResponse(totalWarehouses.size());
    }

    @Override
    public WarehouseResponse createWarehouse(CreateWarehouseRequest request){
        log.info("Creating warehouse: {}", request.name());
        Warehouse warehouse = Warehouse.create(
                request.name(),
                request.country(),
                request.city(),
                request.totalCapacity()
        );

        var saved = repository.save(warehouse);
        log.info("Warehouse created with ID: {}", saved.getId());

        return WarehouseMapper.toResponse(saved);
    }

    @Override
    public WarehouseResponse updateWarehouse(UUID id, UpdateWarehouseRequest request){
        log.info("Updating warehouse ID: {}", id);
        var warehouse = repository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Warehouse not found for ID: {}", id);
                    return new WarehouseNotFoundException(id);
                });

        // Null fields in the request mean "leave unchanged" — usedCapacity is
        // managed by capacity-update flows, not by the edit form, so it must
        // never be wiped to null (DB column is NOT NULL).
        warehouse.update(
                request.name()          != null ? request.name()          : warehouse.getName(),
                request.country()       != null ? request.country()       : warehouse.getCountry(),
                request.city()          != null ? request.city()          : warehouse.getCity(),
                request.totalCapacity() != null ? request.totalCapacity() : warehouse.getTotalCapacity(),
                request.usedCapacity()  != null ? request.usedCapacity()  : warehouse.getUsedCapacity()
        );
        repository.save(warehouse);
        log.info("Warehouse ID {} updated successfully", id);

        return WarehouseMapper.toResponse(warehouse);
    }

    @Override
    public List<WarehouseResponse> getAllWarehouses(){
        log.info("Fetching all warehouses");
        var warehouses = repository.findAll();
        log.info("Fetched {} warehouses", warehouses.size());

        return warehouses
                .stream()
                .map(WarehouseMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public WarehouseResponse getWarehouseById(UUID id){
        log.info("Fetching warehouse by ID: {}", id);
        var warehouse = repository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Warehouse not found for ID: {}", id);
                    return new WarehouseNotFoundException(id);
                });
        log.info("Warehouse found: {}", warehouse.getName());

        return WarehouseMapper.toResponse(warehouse);
    }

    @Override
    public void deleteWarehouseById(UUID id){
        log.info("Deleting warehouse ID: {}", id);
        var warehouse = repository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Warehouse not found for ID: {}", id);
                    return new WarehouseNotFoundException(id);
                });

        repository.deleteById(id);
        log.info("Warehouse ID {} deleted", id);
    }

}