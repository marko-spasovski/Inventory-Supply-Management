package com.marko.logistics.inventory.infrastructure.messaging;

import com.marko.logistics.inventory.application.event.InventoryLowStockEvent;
import com.marko.logistics.inventory.application.event.InventoryOutOfStockEvent;
import com.marko.logistics.inventory.application.event.InventoryUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryKafkaProducer {
    private static final String STOCK_UPDATED_TOPIC = "inventory.stock.updated";
    private static final String INVENTORY_LOW_TOPIC = "inventory.low";
    private static final String INVENTORY_OUT_TOPIC = "inventory.out";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void sendStockUpdatedEvent(String warehouseId, int quantity) {
        var event = new InventoryUpdatedEvent(warehouseId, quantity);
        kafkaTemplate.send(STOCK_UPDATED_TOPIC, warehouseId, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send {} for warehouseId={}: {}", STOCK_UPDATED_TOPIC, warehouseId, ex.getMessage());
                    } else {
                        log.info("Kafka event sent → topic={}, warehouseId={}, quantity={}",
                                STOCK_UPDATED_TOPIC, warehouseId, quantity);
                    }
                });
    }

    public void sendInventoryLowEvent(String warehouseId, String productId, int remaining) {
        var event = new InventoryLowStockEvent(warehouseId, productId, remaining);
        kafkaTemplate.send(INVENTORY_LOW_TOPIC, warehouseId, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send {} for warehouseId={}, productId={}: {}",
                                INVENTORY_LOW_TOPIC, warehouseId, productId, ex.getMessage());
                    } else {
                        log.info("→ {} sent: warehouseId={}, productId={}, remaining={}",
                                INVENTORY_LOW_TOPIC, warehouseId, productId, remaining);
                    }
                });
    }

    public void sendInventoryOutEvent(String warehouseId, String productId) {
        var event = new InventoryOutOfStockEvent(warehouseId, productId);
        kafkaTemplate.send(INVENTORY_OUT_TOPIC, warehouseId, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send {} for warehouseId={}, productId={}: {}",
                                INVENTORY_OUT_TOPIC, warehouseId, productId, ex.getMessage());
                    } else {
                        log.info("→ {} sent: warehouseId={}, productId={}",
                                INVENTORY_OUT_TOPIC, warehouseId, productId);
                    }
                });
    }
}
