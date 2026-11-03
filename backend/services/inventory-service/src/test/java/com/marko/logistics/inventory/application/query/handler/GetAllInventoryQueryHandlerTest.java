package com.marko.logistics.inventory.application.query.handler;

import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.application.port.out.InventoryRepositoryPort;
import com.marko.logistics.inventory.application.query.GetAllInventoryQuery;
import com.marko.logistics.inventory.domain.model.Inventory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GetAllInventoryQueryHandlerTest {

    private InventoryRepositoryPort repository;
    private GetAllInventoryQueryHandler handler;

    @BeforeEach
    void setUp() {
        repository = mock(InventoryRepositoryPort.class);
        handler = new GetAllInventoryQueryHandler(repository);
    }

    @Test
    void handle_returnsAllInventoryMapped() {
        Inventory i1 = Inventory.create("prod-1", "wh-1", 10);
        Inventory i2 = Inventory.create("prod-2", "wh-2", 20);
        when(repository.findAll()).thenReturn(List.of(i1, i2));

        List<InventoryResponse> result = handler.handle(new GetAllInventoryQuery());

        assertEquals(2, result.size());
        assertEquals("prod-1", result.get(0).productId());
        assertEquals(10, result.get(0).quantity());
        assertEquals("prod-2", result.get(1).productId());
        assertEquals(20, result.get(1).quantity());
        verify(repository).findAll();
    }

    @Test
    void handle_returnsEmptyList_whenNoInventory() {
        when(repository.findAll()).thenReturn(List.of());

        List<InventoryResponse> result = handler.handle(new GetAllInventoryQuery());

        assertTrue(result.isEmpty());
        verify(repository).findAll();
    }
}
