package com.marko.logistics.warehouse.infrastructure.messaging;

import com.marko.logistics.warehouse.application.event.InventoryLowEvent;
import com.marko.logistics.warehouse.application.event.InventoryOutEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class InventoryKafkaProducer {

    private static final String INVENTORY_LOW_TOPIC = "inventory.low";
    private static final String INVENTORY_OUT_TOPIC = "inventory.out";

    // ONE template typed to Object — works with a single KafkaTemplate<String,Object> bean
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void sendLowInventoryEvent(String warehouseId, int capacityLeft) {
        var event = new InventoryLowEvent(warehouseId, capacityLeft);
        kafkaTemplate.send(INVENTORY_LOW_TOPIC, warehouseId, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send inventory.low for warehouseId={}: {}",
                                warehouseId, ex.getMessage());
                    } else {
                        log.info("→ inventory.low sent: warehouseId={}, capacityLeft={}",
                                warehouseId, capacityLeft);
                    }
                });
    }

    public void sendOutInventoryEvent(String warehouseId) {
        var event = new InventoryOutEvent(warehouseId);
        kafkaTemplate.send(INVENTORY_OUT_TOPIC, warehouseId, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send inventory.out for warehouseId={}: {}",
                                warehouseId, ex.getMessage());
                    } else {
                        log.info("→ inventory.out sent: warehouseId={}", warehouseId);
                    }
                });
    }
}