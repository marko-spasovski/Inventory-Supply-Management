package com.marko.logistics.inventory.application.query.handler;

import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.application.mapper.InventoryMapper;
import com.marko.logistics.inventory.application.port.out.InventoryRepositoryPort;
import com.marko.logistics.inventory.application.query.GetAllInventoryQuery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class GetAllInventoryQueryHandler {

    private final InventoryRepositoryPort inventoryRepository;

    public List<InventoryResponse> handle(GetAllInventoryQuery query) {
        log.info("GetAllInventoryQuery executed");
        var result = inventoryRepository.findAll().stream()
                .map(InventoryMapper::toResponse)
                .toList();
        log.debug("Query returned {} inventory records", result.size());
        return result;
    }
}
