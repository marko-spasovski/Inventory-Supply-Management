package com.marko.logistics.inventory.presentation.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marko.logistics.inventory.application.command.AddStockCommand;
import com.marko.logistics.inventory.application.command.UpdateThresholdsCommand;
import com.marko.logistics.inventory.application.command.handler.AddStockCommandHandler;
import com.marko.logistics.inventory.application.command.handler.UpdateThresholdsCommandHandler;
import com.marko.logistics.inventory.application.dto.ConsumeItem;
import com.marko.logistics.inventory.application.dto.CreateInventoryRequest;
import com.marko.logistics.inventory.application.dto.InventoryResponse;
import com.marko.logistics.inventory.application.dto.UpdateThresholdsRequest;
import com.marko.logistics.inventory.application.query.GetAllInventoryQuery;
import com.marko.logistics.inventory.application.query.GetInventoryByWarehouseQuery;
import com.marko.logistics.inventory.application.query.handler.GetAllInventoryQueryHandler;
import com.marko.logistics.inventory.application.query.handler.GetInventoryByWarehouseQueryHandler;
import com.marko.logistics.inventory.application.service.ConsumptionService;
import com.marko.logistics.inventory.domain.exception.InventoryNotFoundException;
import com.marko.logistics.inventory.infrastructure.security.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * CQRS: write requests are dispatched to command handlers,
 *       read requests are dispatched to query handlers.
 */
@RestController
@RequestMapping("/inventory")
public class InventoryController {

    private final AddStockCommandHandler addStockHandler;
    private final UpdateThresholdsCommandHandler updateThresholdsHandler;
    private final GetAllInventoryQueryHandler getAllHandler;
    private final GetInventoryByWarehouseQueryHandler getByWarehouseHandler;
    private final ConsumptionService consumptionService;
    private final RequestContext requestContext;
    private final ObjectMapper objectMapper;

    public InventoryController(
            AddStockCommandHandler addStockHandler,
            UpdateThresholdsCommandHandler updateThresholdsHandler,
            GetAllInventoryQueryHandler getAllHandler,
            GetInventoryByWarehouseQueryHandler getByWarehouseHandler,
            ConsumptionService consumptionService,
            RequestContext requestContext,
            ObjectMapper objectMapper) {
        this.addStockHandler = addStockHandler;
        this.updateThresholdsHandler = updateThresholdsHandler;
        this.getAllHandler = getAllHandler;
        this.getByWarehouseHandler = getByWarehouseHandler;
        this.consumptionService = consumptionService;
        this.requestContext = requestContext;
        this.objectMapper = objectMapper;
    }

    // ── Commands (write side) ──────────────────────────────────────────────

    @PostMapping
    public InventoryResponse createInventory(@RequestBody CreateInventoryRequest request) {
        return addStockHandler.handle(
                new AddStockCommand(
                        request.productId(),
                        request.warehouseId(),
                        request.quantity(),
                        request.minQuantity(),
                        request.maxQuantity()));
    }

    /** Update only the min/max reorder thresholds for an existing item. */
    @PutMapping("/thresholds")
    public ResponseEntity<?> updateThresholds(@RequestBody UpdateThresholdsRequest request) {
        try {
            InventoryResponse updated = updateThresholdsHandler.handle(
                    new UpdateThresholdsCommand(
                            request.productId(),
                            request.warehouseId(),
                            request.minQuantity(),
                            request.maxQuantity()));
            return ResponseEntity.ok(updated);
        } catch (InventoryNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Not Found", "message", e.getMessage()));
        }
    }

    /**
     * Manual stock consumption ("issue"). Reduces stock for every selected item
     * and stores the client-generated consumption record (and optional proof) as PDFs.
     */
    @PostMapping(value = "/consume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> consume(
            @RequestParam("items") String itemsJson,
            @RequestParam(value = "purpose",     required = false) String purpose,
            @RequestParam(value = "dateOfUsage", required = false) String dateOfUsage,
            @RequestParam(value = "description", required = false) String description,
            @RequestPart(value = "document", required = false) MultipartFile document,
            @RequestPart(value = "proof",    required = false) MultipartFile proof) {
        try {
            List<ConsumeItem> items = objectMapper.readValue(
                    itemsJson, new TypeReference<List<ConsumeItem>>() {});

            var result = consumptionService.consume(items, document, proof);

            return ResponseEntity.ok(Map.of(
                    "consumptionId", result.consumptionId(),
                    "documents",     result.savedDocuments(),
                    "purpose",       purpose == null ? "" : purpose,
                    "dateOfUsage",   dateOfUsage == null ? "" : dateOfUsage,
                    "description",   description == null ? "" : description));
        } catch (InventoryNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Not Found", "message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        }
    }

    // ── Queries (read side) ───────────────────────────────────────────────

    @GetMapping
    public List<InventoryResponse> getAll() {
        return getAllHandler.handle(new GetAllInventoryQuery());
    }

    @GetMapping("/{id}")
    public List<InventoryResponse> getByWarehouseId(@PathVariable String id) {
        return getByWarehouseHandler.handle(new GetInventoryByWarehouseQuery(id));
    }
}
