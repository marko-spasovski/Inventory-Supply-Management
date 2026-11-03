package com.marko.logistics.inventory.application.service;

import com.marko.logistics.inventory.application.dto.CreateInventoryRequest;
import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.application.mapper.InventoryMapper;
import com.marko.logistics.inventory.application.port.in.*;
import com.marko.logistics.inventory.application.port.out.InventoryRepositoryPort;
import com.marko.logistics.inventory.domain.model.Inventory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class InventoryService implements
        AddStockUseCase,
        GetInventoryUseCase,
        GetAllInventoryUseCase
{

    private final InventoryRepositoryPort inventoryRepository;

    public InventoryService(InventoryRepositoryPort inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    public List<InventoryResponse> getAllInventory() {
        log.info("Fetching all inventory records");
        var inventory = inventoryRepository.findAll();
        log.debug("Found {} inventory records", inventory.size());
        return inventory.stream()
                .map(InventoryMapper::toResponse)
                .collect(Collectors.toList());
    }

    public List<InventoryResponse> getByWarehouseId(String warehouseId) {
        log.info("Fetching inventory for warehouseId={}", warehouseId);
        var result = inventoryRepository.findAllByWarehouseId(warehouseId)
                .stream()
                .map(InventoryMapper::toResponse)
                .toList();
        log.debug("Found {} inventory entries for warehouseId={}", result.size(), warehouseId);
        return result;
    }

    public InventoryResponse addStock(CreateInventoryRequest request) {
        log.info("Adding stock: productId={}, warehouseId={}, quantity={}",
                request.productId(), request.warehouseId(), request.quantity());

        var inventoryOps = inventoryRepository.findByProductIdAndWarehouseId(
                request.productId(), request.warehouseId());

        Inventory inventory;

        if (inventoryOps.isPresent()) {
            inventory = inventoryOps.get();
            log.debug("Existing inventory found (id={}), increasing by {}", inventory.getId(), request.quantity());
            inventory.increase(request.quantity());
        } else {
            log.debug("No existing inventory found, creating new entry");
            inventory = Inventory.create(request.productId(), request.warehouseId(), request.quantity());
        }

        inventoryRepository.save(inventory);
        log.info("Stock updated successfully for productId={}, warehouseId={}, newQuantity={}",
                request.productId(), request.warehouseId(), inventory.getQuantity());

        return InventoryMapper.toResponse(inventory);
    }
}