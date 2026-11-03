package com.marko.logistics.inventory.application.command.handler;

import com.marko.logistics.inventory.application.command.UpdateThresholdsCommand;
import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.application.mapper.InventoryMapper;
import com.marko.logistics.inventory.application.port.out.InventoryRepositoryPort;
import com.marko.logistics.inventory.domain.exception.InventoryNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class UpdateThresholdsCommandHandler {

    private final InventoryRepositoryPort inventoryRepository;

    public InventoryResponse handle(UpdateThresholdsCommand command) {
        log.info("UpdateThresholdsCommand: productId={}, warehouseId={}, min={}, max={}",
                command.productId(), command.warehouseId(), command.minQuantity(), command.maxQuantity());

        var inventory = inventoryRepository
                .findByProductIdAndWarehouseId(command.productId(), command.warehouseId())
                .orElseThrow(() -> new InventoryNotFoundException(
                        "No inventory for productId=" + command.productId()
                        + " warehouseId=" + command.warehouseId()));

        inventory.setThresholds(command.minQuantity(), command.maxQuantity());
        inventoryRepository.save(inventory);

        return InventoryMapper.toResponse(inventory);
    }
}
