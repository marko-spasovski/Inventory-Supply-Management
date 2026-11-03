package com.marko.logistics.warehouse.presentation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marko.logistics.warehouse.application.dto.*;
import com.marko.logistics.warehouse.application.service.WarehouseService;
import com.marko.logistics.warehouse.infrastructure.security.RequestContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public class WarehouseControllerTest {
    private MockMvc mockMvc;
    private WarehouseService warehouseService;
    private ObjectMapper mapper;
    private RequestContext context;

    @BeforeEach
    void setup() {
        warehouseService = mock(WarehouseService.class);
        context = mock(RequestContext.class);
        when(context.getUserRole(any())).thenReturn("MANAGER");
        mockMvc = MockMvcBuilders.standaloneSetup(new WarehouseController(warehouseService, context)).build();
        mapper = new ObjectMapper();
    }

    @Test
    void getAll_shouldReturnList() throws Exception {
        WarehouseResponse w = new WarehouseResponse(UUID.randomUUID(), "W1", null, null, 100, 0);
        when(warehouseService.getAllWarehouses()).thenReturn(List.of(w));

        mockMvc.perform(get("/warehouses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("W1"));
    }

    @Test
    void create_shouldReturnWarehouse() throws Exception {
        CreateWarehouseRequest request = new CreateWarehouseRequest("New", null, null, 50);
        WarehouseResponse response = new WarehouseResponse(UUID.randomUUID(), "New", null, null, 50, 0);

        when(warehouseService.createWarehouse(request)).thenReturn(response);

        mockMvc.perform(post("/warehouses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("New"));
    }

    @Test
    void update_shouldReturnWarehouse() throws Exception {
        UpdateWarehouseRequest request = new UpdateWarehouseRequest("Updated", null, null, 60, 0);
        UUID id = UUID.randomUUID();
        WarehouseResponse response = new WarehouseResponse(id, "Updated", null, null, 60, 0);

        when(warehouseService.updateWarehouse(id, request)).thenReturn(response);

        mockMvc.perform(put("/warehouses/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated"));
    }

    @Test
    void delete_shouldCallService() throws Exception {
        UUID id = UUID.randomUUID();

        doNothing().when(warehouseService).deleteWarehouseById(id);

        mockMvc.perform(delete("/warehouses/" + id))
                .andExpect(status().isOk());

        verify(warehouseService, times(1)).deleteWarehouseById(id);
    }
}
