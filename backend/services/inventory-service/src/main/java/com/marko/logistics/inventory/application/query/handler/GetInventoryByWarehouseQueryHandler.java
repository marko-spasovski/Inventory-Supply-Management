package com.marko.logistics.inventory.application.query.handler;

import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.application.mapper.InventoryMapper;
import com.marko.logistics.inventory.application.port.out.InventoryRepositoryPort;
import com.marko.logistics.inventory.application.query.GetInventoryByWarehouseQuery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class GetInventoryByWarehouseQueryHandler {

    private final InventoryRepositoryPort inventoryRepository;

    public List<InventoryResponse> handle(GetInventoryByWarehouseQuery query) {
        log.info("GetInventoryByWarehouseQuery: warehouseId={}", query.warehouseId());
        var result = inventoryRepository.findAllByWarehouseId(query.warehouseId()).stream()
                .map(InventoryMapper::toResponse)
                .toList();
        log.debug("Query returned {} records for warehouseId={}", result.size(), query.warehouseId());
        return result;
    }
}
