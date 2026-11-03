package com.marko.logistics.warehouse.infrastructure.messaging;

import com.marko.logistics.warehouse.application.event.InventoryUpdatedEvent;
import com.marko.logistics.warehouse.application.port.in.UpdateWarehouseCapacityUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryEventConsumer {
    private static final String TOPIC = "inventory.stock.updated";

    private final UpdateWarehouseCapacityUseCase updateWarehouseCapacityUseCase;

    @KafkaListener(topics = TOPIC, groupId = "warehouse-service")
    public void onInventoryUpdated(InventoryUpdatedEvent event) {
        log.info("📦 Kafka event received — warehouseId={}, quantity={}",
                event.warehouseId(), event.quantity());
        try {
            UUID warehouseId = UUID.fromString(event.warehouseId());
            updateWarehouseCapacityUseCase.increaseUsedCapacity(warehouseId, event.quantity());
        } catch (IllegalArgumentException e) {
            // Bad UUID format — log and discard, don't crash the consumer
            log.error("Invalid warehouseId in Kafka event: {}", event.warehouseId(), e);
        }
    }
}
