package com.marko.logistics.inventory.presentation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marko.logistics.inventory.application.command.AddStockCommand;
import com.marko.logistics.inventory.application.command.handler.AddStockCommandHandler;
import com.marko.logistics.inventory.application.command.handler.UpdateThresholdsCommandHandler;
import com.marko.logistics.inventory.application.dto.CreateInventoryRequest;
import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.application.query.GetAllInventoryQuery;
import com.marko.logistics.inventory.application.query.GetInventoryByWarehouseQuery;
import com.marko.logistics.inventory.application.query.handler.GetAllInventoryQueryHandler;
import com.marko.logistics.inventory.application.query.handler.GetInventoryByWarehouseQueryHandler;
import com.marko.logistics.inventory.application.service.ConsumptionService;
import com.marko.logistics.inventory.infrastructure.security.RequestContext;
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

public class InventoryControllerTest {

    private MockMvc mockMvc;
    private AddStockCommandHandler addStockHandler;
    private GetAllInventoryQueryHandler getAllHandler;
    private GetInventoryByWarehouseQueryHandler getByWarehouseHandler;
    private ObjectMapper mapper;

    @BeforeEach
    void setup() {
        addStockHandler = mock(AddStockCommandHandler.class);
        getAllHandler = mock(GetAllInventoryQueryHandler.class);
        getByWarehouseHandler = mock(GetInventoryByWarehouseQueryHandler.class);
        mapper = new ObjectMapper();
        mockMvc = MockMvcBuilders
                .standaloneSetup(new InventoryController(
                        addStockHandler,
                        mock(UpdateThresholdsCommandHandler.class),
                        getAllHandler,
                        getByWarehouseHandler,
                        mock(ConsumptionService.class),
                        mock(RequestContext.class),
                        mapper))
                .build();
    }

    @Test
    void getAll_shouldReturnListOfInventory() throws Exception {
        InventoryResponse r1 = new InventoryResponse(UUID.randomUUID().toString(), "prod-1", "wh-1", 10, null, null);
        InventoryResponse r2 = new InventoryResponse(UUID.randomUUID().toString(), "prod-2", "wh-1", 20, null, null);

        when(getAllHandler.handle(any(GetAllInventoryQuery.class))).thenReturn(List.of(r1, r2));

        mockMvc.perform(get("/inventory"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].productId").value("prod-1"))
                .andExpect(jsonPath("$[1].quantity").value(20));
    }

    @Test
    void getById_shouldReturnInventoryForWarehouse() throws Exception {
        String warehouseId = "wh-42";
        InventoryResponse r = new InventoryResponse(UUID.randomUUID().toString(), "prod-1", warehouseId, 5, null, null);

        when(getByWarehouseHandler.handle(any(GetInventoryByWarehouseQuery.class))).thenReturn(List.of(r));

        mockMvc.perform(get("/inventory/" + warehouseId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].warehouseId").value(warehouseId))
                .andExpect(jsonPath("$[0].productId").value("prod-1"));
    }

    @Test
    void create_shouldReturnCreatedInventoryResponse() throws Exception {
        CreateInventoryRequest request = new CreateInventoryRequest("wh-1", "prod-1", 30, null, null);
        InventoryResponse response = new InventoryResponse(UUID.randomUUID().toString(), "prod-1", "wh-1", 30, null, null);

        when(addStockHandler.handle(any(AddStockCommand.class))).thenReturn(response);

        mockMvc.perform(post("/inventory")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productId").value("prod-1"))
                .andExpect(jsonPath("$.warehouseId").value("wh-1"))
                .andExpect(jsonPath("$.quantity").value(30));
    }

    @Test
    void create_shouldCallAddStockHandlerOnce() throws Exception {
        CreateInventoryRequest request = new CreateInventoryRequest("wh-2", "prod-2", 10, null, null);
        InventoryResponse response = new InventoryResponse(UUID.randomUUID().toString(), "prod-2", "wh-2", 10, null, null);

        when(addStockHandler.handle(any(AddStockCommand.class))).thenReturn(response);

        mockMvc.perform(post("/inventory")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(addStockHandler, times(1)).handle(any(AddStockCommand.class));
    }
}
