package com.marko.logistics.inventory.application.service;

import com.marko.logistics.inventory.application.command.ReduceStockCommand;
import com.marko.logistics.inventory.application.command.handler.ReduceStockCommandHandler;
import com.marko.logistics.inventory.application.dto.ConsumeItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Orchestrates a manual stock-consumption ("issue") event:
 *  - reduces stock for every selected item (atomic — one transaction)
 *  - persists the client-generated consumption record PDF plus an optional
 *    proof PDF under a per-consumption folder on disk.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConsumptionService {

    private final ReduceStockCommandHandler reduceStockHandler;

    @Value("${inventory.documents.base-path:./Documents/consumptions}")
    private String basePath;

    public record ConsumptionResult(String consumptionId, List<String> savedDocuments) {}

    @Transactional
    public ConsumptionResult consume(List<ConsumeItem> items,
                                     MultipartFile document,
                                     MultipartFile proof) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("At least one item is required.");
        }

        // 1. Reduce every item. Any failure rolls back the whole transaction.
        for (ConsumeItem item : items) {
            reduceStockHandler.handle(new ReduceStockCommand(
                    item.productId(), item.warehouseId(), item.quantity()));
        }

        // 2. Persist documents.
        String consumptionId = UUID.randomUUID().toString();
        Path folder = Paths.get(basePath, consumptionId);
        List<String> saved = new ArrayList<>();
        try {
            Files.createDirectories(folder);
            String stamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

            if (document != null && !document.isEmpty()) {
                saved.add(saveFile(folder, "consumption_" + stamp + ".pdf", document));
            }
            if (proof != null && !proof.isEmpty()) {
                saved.add(saveFile(folder, "proof_" + stamp + ".pdf", proof));
            }
        } catch (IOException e) {
            // Rolls back the stock reduction too — we don't want to consume
            // stock without a saved record.
            throw new RuntimeException("Failed to save consumption document: " + e.getMessage(), e);
        }

        log.info("Consumption {} recorded: {} item(s), {} document(s)",
                consumptionId, items.size(), saved.size());
        return new ConsumptionResult(consumptionId, saved);
    }

    private String saveFile(Path folder, String fileName, MultipartFile file) throws IOException {
        Path target = folder.resolve(fileName);
        try (var in = file.getInputStream()) {
            Files.copy(in, target);
        }
        log.info("Saved consumption document at {}", target);
        return target.toString();
    }
}
