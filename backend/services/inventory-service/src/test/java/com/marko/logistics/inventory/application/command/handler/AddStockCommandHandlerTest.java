package com.marko.logistics.inventory.application.command.handler;

import com.marko.logistics.inventory.application.command.AddStockCommand;
import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.application.port.out.InventoryRepositoryPort;
import com.marko.logistics.inventory.domain.model.Inventory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AddStockCommandHandlerTest {

    private InventoryRepositoryPort repository;
    private AddStockCommandHandler handler;

    @BeforeEach
    void setUp() {
        repository = mock(InventoryRepositoryPort.class);
        handler = new AddStockCommandHandler(repository);
    }

    @Test
    void handle_createsNewInventory_whenNoneExists() {
        when(repository.findByProductIdAndWarehouseId("prod-1", "wh-1")).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        InventoryResponse response = handler.handle(new AddStockCommand("prod-1", "wh-1", 10));

        assertEquals("prod-1", response.productId());
        assertEquals("wh-1", response.warehouseId());
        assertEquals(10, response.quantity());
        verify(repository).save(any());
    }

    @Test
    void handle_increasesQuantity_whenInventoryExists() {
        Inventory existing = Inventory.create("prod-1", "wh-1", 5);
        when(repository.findByProductIdAndWarehouseId("prod-1", "wh-1")).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        InventoryResponse response = handler.handle(new AddStockCommand("prod-1", "wh-1", 10));

        assertEquals(15, response.quantity());
        verify(repository).save(existing);
    }

    @Test
    void handle_throwsIllegalArgumentException_whenQuantityIsZero() {
        Inventory existing = Inventory.create("prod-1", "wh-1", 5);
        when(repository.findByProductIdAndWarehouseId("prod-1", "wh-1")).thenReturn(Optional.of(existing));

        assertThrows(IllegalArgumentException.class,
                () -> handler.handle(new AddStockCommand("prod-1", "wh-1", 0)));

        verify(repository, never()).save(any());
    }

    @Test
    void handle_throwsIllegalArgumentException_whenQuantityIsNegative() {
        Inventory existing = Inventory.create("prod-1", "wh-1", 5);
        when(repository.findByProductIdAndWarehouseId("prod-1", "wh-1")).thenReturn(Optional.of(existing));

        assertThrows(IllegalArgumentException.class,
                () -> handler.handle(new AddStockCommand("prod-1", "wh-1", -3)));

        verify(repository, never()).save(any());
    }
}
