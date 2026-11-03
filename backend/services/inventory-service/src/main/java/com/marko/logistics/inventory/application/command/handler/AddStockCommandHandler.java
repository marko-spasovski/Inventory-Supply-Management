package com.marko.logistics.inventory.application.command.handler;

import com.marko.logistics.inventory.application.command.AddStockCommand;
import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.application.mapper.InventoryMapper;
import com.marko.logistics.inventory.application.port.out.InventoryRepositoryPort;
import com.marko.logistics.inventory.domain.model.Inventory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AddStockCommandHandler {

    private final InventoryRepositoryPort inventoryRepository;

    public InventoryResponse handle(AddStockCommand command) {
        log.info("AddStockCommand: productId={}, warehouseId={}, quantity={}",
                command.productId(), command.warehouseId(), command.quantity());

        var existing = inventoryRepository.findByProductIdAndWarehouseId(
                command.productId(), command.warehouseId());

        Inventory inventory;
        if (existing.isPresent()) {
            inventory = existing.get();
            inventory.increase(command.quantity());
            log.debug("Existing inventory found (id={}), increased by {}", inventory.getId(), command.quantity());
        } else {
            inventory = Inventory.create(
                    command.productId(), command.warehouseId(), command.quantity(),
                    command.minQuantity(), command.maxQuantity());
            log.debug("No existing inventory found — creating new entry");
        }

        // Gap 13: any non-null thresholds in the command win (used to set or
        // update thresholds without changing how quantity is computed).
        if (command.minQuantity() != null || command.maxQuantity() != null) {
            inventory.setThresholds(command.minQuantity(), command.maxQuantity());
        }

        inventoryRepository.save(inventory);
        log.info("Stock updated: productId={}, warehouseId={}, newQuantity={}",
                command.productId(), command.warehouseId(), inventory.getQuantity());

        return InventoryMapper.toResponse(inventory);
    }
}
