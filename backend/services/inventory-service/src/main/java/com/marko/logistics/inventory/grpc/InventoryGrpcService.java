package com.marko.logistics.inventory.grpc;

import com.marko.logistics.inventory.application.command.AddStockCommand;
import com.marko.logistics.inventory.application.command.handler.AddStockCommandHandler;
import com.marko.logistics.inventory.infrastructure.messaging.InventoryKafkaProducer;
import io.grpc.stub.StreamObserver;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;

import com.marko.logistics.inventory.grpc.InventoryServiceGrpc;
import com.marko.logistics.inventory.grpc.InventoryRequest;
import com.marko.logistics.inventory.grpc.InventoryResponse;

/**
 * gRPC entry point — writes are dispatched through the CQRS command side.
 */
@GrpcService
@Slf4j
public class InventoryGrpcService extends InventoryServiceGrpc.InventoryServiceImplBase {

    private final AddStockCommandHandler addStockHandler;
    private final InventoryKafkaProducer kafkaProducer;

    public InventoryGrpcService(AddStockCommandHandler addStockHandler, InventoryKafkaProducer kafkaProducer) {
        this.addStockHandler = addStockHandler;
        this.kafkaProducer = kafkaProducer;
    }

    @Override
    public void updateInventory(InventoryRequest request, StreamObserver<InventoryResponse> responseObserver) {
        try {
            log.info("gRPC updateInventory: productId={}, warehouseId={}, quantity={}",
                    request.getProductId(), request.getWarehouseId(), request.getQuantity());

            addStockHandler.handle(new AddStockCommand(
                    request.getProductId(),
                    request.getWarehouseId(),
                    request.getQuantity()));

            kafkaProducer.sendStockUpdatedEvent(request.getWarehouseId(), request.getQuantity());

            responseObserver.onNext(InventoryResponse.newBuilder()
                    .setSuccess(true)
                    .setMessage("Inventory updated successfully")
                    .build());
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("gRPC updateInventory failed: {}", e.getMessage());
            responseObserver.onNext(InventoryResponse.newBuilder()
                    .setSuccess(false)
                    .setMessage(e.getMessage())
                    .build());
            responseObserver.onCompleted();
        }
    }
}
