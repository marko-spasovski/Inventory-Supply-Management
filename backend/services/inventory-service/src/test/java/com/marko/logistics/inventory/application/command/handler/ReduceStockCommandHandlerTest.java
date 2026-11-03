package com.marko.logistics.inventory.application.command.handler;

import com.marko.logistics.inventory.application.command.ReduceStockCommand;
import com.marko.logistics.inventory.application.port.out.InventoryRepositoryPort;
import com.marko.logistics.inventory.domain.exception.InventoryNotFoundException;
import com.marko.logistics.inventory.domain.model.Inventory;
import com.marko.logistics.inventory.infrastructure.messaging.InventoryKafkaProducer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ReduceStockCommandHandlerTest {

    private InventoryRepositoryPort repository;
    private InventoryKafkaProducer kafkaProducer;
    private ReduceStockCommandHandler handler;

    @BeforeEach
    void setUp() {
        repository = mock(InventoryRepositoryPort.class);
        kafkaProducer = mock(InventoryKafkaProducer.class);
        handler = new ReduceStockCommandHandler(repository, kafkaProducer);
    }

    @Test
    void handle_reducesStockAndSaves() {
        Inventory inventory = Inventory.create("prod-1", "wh-1", 10);
        when(repository.findByProductIdAndWarehouseId("prod-1", "wh-1")).thenReturn(Optional.of(inventory));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        handler.handle(new ReduceStockCommand("prod-1", "wh-1", 4));

        assertEquals(6, inventory.getQuantity());
        verify(repository).save(inventory);
    }

    @Test
    void handle_throwsInventoryNotFoundException_whenNotFound() {
        when(repository.findByProductIdAndWarehouseId("prod-99", "wh-1")).thenReturn(Optional.empty());

        assertThrows(InventoryNotFoundException.class,
                () -> handler.handle(new ReduceStockCommand("prod-99", "wh-1", 1)));

        verify(repository, never()).save(any());
    }

    @Test
    void handle_throwsIllegalArgumentException_whenInsufficientStock() {
        Inventory inventory = Inventory.create("prod-1", "wh-1", 3);
        when(repository.findByProductIdAndWarehouseId("prod-1", "wh-1")).thenReturn(Optional.of(inventory));

        assertThrows(IllegalArgumentException.class,
                () -> handler.handle(new ReduceStockCommand("prod-1", "wh-1", 10)));

        verify(repository, never()).save(any());
    }
}
