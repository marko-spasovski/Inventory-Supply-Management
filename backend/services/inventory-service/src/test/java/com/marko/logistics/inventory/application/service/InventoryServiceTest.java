package com.marko.logistics.inventory.application.service;

import com.marko.logistics.inventory.application.dto.CreateInventoryRequest;
import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.application.port.out.InventoryRepositoryPort;
import com.marko.logistics.inventory.domain.model.Inventory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class InventoryServiceTest {

    private InventoryRepositoryPort repository;
    private InventoryService service;

    @BeforeEach
    void setUp() {
        repository = mock(InventoryRepositoryPort.class);
        service = new InventoryService(repository);
    }

    @Test
    void addStock_createsNewInventory_whenNoneExists() {
        CreateInventoryRequest request = new CreateInventoryRequest("wh-1", "prod-1", 10, null, null);

        when(repository.findByProductIdAndWarehouseId("prod-1", "wh-1")).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        InventoryResponse response = service.addStock(request);

        assertEquals("prod-1", response.productId());
        assertEquals("wh-1", response.warehouseId());
        assertEquals(10, response.quantity());
        verify(repository, times(1)).save(any());
    }

    @Test
    void addStock_increasesQuantity_whenInventoryExists() {
        Inventory existing = Inventory.create("prod-1", "wh-1", 5);
        CreateInventoryRequest request = new CreateInventoryRequest("wh-1", "prod-1", 10, null, null);

        when(repository.findByProductIdAndWarehouseId("prod-1", "wh-1")).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        InventoryResponse response = service.addStock(request);

        assertEquals(15, response.quantity());
        verify(repository, times(1)).save(existing);
    }

    @Test
    void getAllInventory_returnsAll() {
        Inventory i1 = Inventory.create("prod-1", "wh-1", 10);
        Inventory i2 = Inventory.create("prod-2", "wh-1", 20);

        when(repository.findAll()).thenReturn(List.of(i1, i2));

        List<InventoryResponse> result = service.getAllInventory();

        assertEquals(2, result.size());
        verify(repository, times(1)).findAll();
    }

    @Test
    void getByWarehouseId_returnsMatchingInventory() {
        Inventory i1 = Inventory.create("prod-1", "wh-42", 5);
        Inventory i2 = Inventory.create("prod-2", "wh-42", 15);

        when(repository.findAllByWarehouseId("wh-42")).thenReturn(List.of(i1, i2));

        List<InventoryResponse> result = service.getByWarehouseId("wh-42");

        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(r -> r.warehouseId().equals("wh-42")));
    }

    @Test
    void addStock_throwsException_whenQuantityIsZero() {
        Inventory existing = Inventory.create("prod-1", "wh-1", 5);
        CreateInventoryRequest request = new CreateInventoryRequest("wh-1", "prod-1", 0, null, null);

        when(repository.findByProductIdAndWarehouseId("prod-1", "wh-1")).thenReturn(Optional.of(existing));

        assertThrows(IllegalArgumentException.class, () -> service.addStock(request));
        verify(repository, never()).save(any());
    }
}