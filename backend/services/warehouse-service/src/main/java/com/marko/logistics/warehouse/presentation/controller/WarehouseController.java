package com.marko.logistics.warehouse.presentation.controller;

import com.marko.logistics.warehouse.application.dto.CreateWarehouseRequest;
import com.marko.logistics.warehouse.application.dto.TotalWarehousesResponse;
import com.marko.logistics.warehouse.application.dto.UpdateWarehouseRequest;
import com.marko.logistics.warehouse.application.dto.WarehouseResponse;
import com.marko.logistics.warehouse.application.service.WarehouseService;
import com.marko.logistics.warehouse.infrastructure.security.RequestContext;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/warehouses")
@RequiredArgsConstructor
@Slf4j
public class WarehouseController {

    private final WarehouseService warehouseService;
    private final RequestContext requestContext;

    @PostMapping
    public WarehouseResponse create(@RequestBody CreateWarehouseRequest request) {
        log.info("Creating warehouse: {}", request.name());
        var response = warehouseService.createWarehouse(request);
        log.info("Created warehouse with ID: {}", response.id());
        return response;
    }

    @PutMapping("/{id}")
    public WarehouseResponse update(
            @PathVariable UUID id,
            @RequestBody UpdateWarehouseRequest request,
            HttpServletRequest httpRequest) {
        String role = requestContext.getUserRole(httpRequest);

        if(!"MANAGER".equalsIgnoreCase(role)){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Managers only");
        }

        log.info("Updating warehouse {} with data: {}", id, request.name());
        var response = warehouseService.updateWarehouse(id, request);
        log.info("Updated warehouse {} successfully", id);
        return response;
    }

    @GetMapping
    public List<WarehouseResponse> getAll() {
        log.info("Fetching all warehouses");
        var response = warehouseService.getAllWarehouses();
        log.info("Fetched {} warehouses", response.size());
        return response;
    }

    @GetMapping("/{id}")
    public WarehouseResponse getById(@PathVariable UUID id) {
        log.info("Fetching warehouse by ID: {}", id);
        var response = warehouseService.getWarehouseById(id);
        log.info("Fetched warehouse {}: {}", id, response.name());
        return response;
    }

    @GetMapping("/total")
    public TotalWarehousesResponse countAllWarehouses() {
        log.info("Fetching number of warehouses");
        return warehouseService.countAllWarehouses();
    }

    @DeleteMapping("/{id}")
    public void deleteById(
            @PathVariable UUID id,
            HttpServletRequest request) {
        String role = requestContext.getUserRole(request);

        if(!"MANAGER".equalsIgnoreCase(role)){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Managers only");
        }

        log.info("Deleting warehouse with ID: {}", id);
        warehouseService.deleteWarehouseById(id);
        log.info("Deleted warehouse {}", id);
    }
}