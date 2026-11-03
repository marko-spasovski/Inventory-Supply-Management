package com.marko.logistics.inventory.application.dto;

public record InventoryResponse(
   String id,
   String productId,
   String warehouseId,
   int quantity,
   Integer minQuantity,
   Integer maxQuantity
) {}
