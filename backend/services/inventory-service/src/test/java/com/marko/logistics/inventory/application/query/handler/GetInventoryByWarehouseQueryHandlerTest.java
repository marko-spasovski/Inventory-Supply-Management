package com.marko.logistics.inventory.application.query.handler;

import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.application.port.out.InventoryRepositoryPort;
import com.marko.logistics.inventory.application.query.GetInventoryByWarehouseQuery;
import com.marko.logistics.inventory.domain.model.Inventory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GetInventoryByWarehouseQueryHandlerTest {

    private InventoryRepositoryPort repository;
    private GetInventoryByWarehouseQueryHandler handler;

    @BeforeEach
    void setUp() {
        repository = mock(InventoryRepositoryPort.class);
        handler = new GetInventoryByWarehouseQueryHandler(repository);
    }

    @Test
    void handle_returnsInventoryForWarehouse() {
        Inventory i1 = Inventory.create("prod-1", "wh-42", 5);
        Inventory i2 = Inventory.create("prod-2", "wh-42", 15);
        when(repository.findAllByWarehouseId("wh-42")).thenReturn(List.of(i1, i2));

        List<InventoryResponse> result = handler.handle(new GetInventoryByWarehouseQuery("wh-42"));

        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(r -> r.warehouseId().equals("wh-42")));
        verify(repository).findAllByWarehouseId("wh-42");
    }

    @Test
    void handle_returnsEmptyList_whenNoInventoryForWarehouse() {
        when(repository.findAllByWarehouseId("wh-99")).thenReturn(List.of());

        List<InventoryResponse> result = handler.handle(new GetInventoryByWarehouseQuery("wh-99"));

        assertTrue(result.isEmpty());
        verify(repository).findAllByWarehouseId("wh-99");
    }
}
