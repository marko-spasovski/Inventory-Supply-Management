using Microsoft.Extensions.Logging;
using Moq;
using order_service.Application.DTOs;
using order_service.Application.Interfaces;
using order_service.Application.Services;
using order_service.Domain;
using order_service.Domain.Enums;
using Xunit;

namespace OrderService.Tests.Application.Service;

public class OrderServiceTest
{
    private readonly Mock<IOrderRepository> _repositoryMock;
    private readonly Mock<IInventoryGrpcClient> _grpcClientMock;
    private readonly Mock<IDocumentStorageService> _documentStorageServiceMock;
    private readonly Mock<IKafkaProducer> _kafkaProducerMock;
    private readonly order_service.Application.Services.OrderService _service;
    private readonly Mock<ILogger<order_service.Application.Services.OrderService>> _loggerMock;
 
    public OrderServiceTest()
    {
        _repositoryMock = new Mock<IOrderRepository>();
        _grpcClientMock = new Mock<IInventoryGrpcClient>();
        _documentStorageServiceMock = new Mock<IDocumentStorageService>();
        _kafkaProducerMock = new Mock<IKafkaProducer>();
        _loggerMock = new Mock<ILogger<order_service.Application.Services.OrderService>>();
        _service = new order_service.Application.Services.OrderService(
            _repositoryMock.Object,
            _grpcClientMock.Object,
            _loggerMock.Object,
            _documentStorageServiceMock.Object,
            _kafkaProducerMock.Object
        );
    }
 
    [Fact]
    public async Task CreateOrderAsync_ReturnsOrderResponse()
    {
        var request = new CreateOrderRequest
        {
            ProductId = Guid.NewGuid(),
            CompanyId = Guid.NewGuid(),
            WarehouseId = Guid.NewGuid(),
            DriverId = Guid.NewGuid(),
            Quantity = 5
        };
 
        _repositoryMock
            .Setup(r => r.SaveAsync(It.IsAny<Order>()))
            .ReturnsAsync((Order o) => o);
        _kafkaProducerMock
            .Setup(k => k.PublishOrderCreatedAsync(It.IsAny<OrderCreatedEvent>()))
            .Returns(Task.CompletedTask);
 
        var response = await _service.CreateOrderAsync(request);
 
        Assert.Equal(request.ProductId, response.ProductId);
        Assert.Equal(request.Quantity, response.Quantity);
        Assert.Equal(Status.Requested, response.Status);
        _repositoryMock.Verify(r => r.SaveAsync(It.IsAny<Order>()), Times.Once);
    }
 
    [Fact]
    public async Task GetOrdersAsync_ReturnsAllOrders()
    {
        var orders = new List<Order>
        {
            new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 3),
            new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 7)
        };
 
        _repositoryMock.Setup(r => r.GetAllAsync()).ReturnsAsync(orders);
 
        var result = await _service.GetOrdersAsync();
 
        Assert.Equal(2, result.Count);
        _repositoryMock.Verify(r => r.GetAllAsync(), Times.Once);
    }
 
    [Fact]
    public async Task UpdateStatusAsync_UpdatesStatus_AndReturnsResponse()
    {
        var order = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 10);
 
        _repositoryMock.Setup(r => r.GetByIdAsync(order.Id)).ReturnsAsync(order);
        _repositoryMock.Setup(r => r.UpdateAsync(It.IsAny<Order>())).ReturnsAsync((Order o) => o);
        _kafkaProducerMock
            .Setup(k => k.PublishOrderStatusChangedAsync(It.IsAny<OrderStatusChangedEvent>()))
            .Returns(Task.CompletedTask);
 
        var response = await _service.UpdateStatusAsync(order.Id, Status.Approved);
 
        Assert.Equal(Status.Approved, response.Status);
        _repositoryMock.Verify(r => r.UpdateAsync(order), Times.Once);
    }
 
    // Goods receipt on Close (decision D1). Was quarantined in phase 0 until the code matched.
    [Fact]
    public async Task UpdateStatusAsync_WhenStatusIsClosed_CallsGrpcClient()
    {
        var order = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 4);
        order.UpdateStatus(Status.Approved);
        order.UpdateStatus(Status.Delivered);
 
        _repositoryMock.Setup(r => r.GetByIdAsync(order.Id)).ReturnsAsync(order);
        _repositoryMock.Setup(r => r.UpdateAsync(It.IsAny<Order>())).ReturnsAsync((Order o) => o);
        _grpcClientMock
            .Setup(g => g.SendInventoryAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<int>()))
            .Returns(Task.CompletedTask);
        _kafkaProducerMock
            .Setup(k => k.PublishOrderStatusChangedAsync(It.IsAny<OrderStatusChangedEvent>()))
            .Returns(Task.CompletedTask);
 
        await _service.UpdateStatusAsync(order.Id, Status.Closed);
 
        _grpcClientMock.Verify(
            g => g.SendInventoryAsync(order.ProductId, order.WarehouseId, order.Quantity),
            Times.Once
        );
    }
 
    [Fact]
    public async Task UpdateStatusAsync_WhenStatusIsNotClosed_DoesNotCallGrpcClient()
    {
        var order = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 2);
 
        _repositoryMock.Setup(r => r.GetByIdAsync(order.Id)).ReturnsAsync(order);
        _repositoryMock.Setup(r => r.UpdateAsync(It.IsAny<Order>())).ReturnsAsync((Order o) => o);
        _kafkaProducerMock
            .Setup(k => k.PublishOrderStatusChangedAsync(It.IsAny<OrderStatusChangedEvent>()))
            .Returns(Task.CompletedTask);
 
        await _service.UpdateStatusAsync(order.Id, Status.Approved);
 
        _grpcClientMock.Verify(
            g => g.SendInventoryAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<int>()),
            Times.Never
        );
    }
 
    [Fact]
    public async Task UpdateStatusAsync_ThrowsException_WhenOrderNotFound()
    {
        var missingId = Guid.NewGuid();
        _repositoryMock.Setup(r => r.GetByIdAsync(missingId)).ReturnsAsync((Order?)null);
 
        await Assert.ThrowsAsync<order_service.Domain.Exceptions.OrderNotFoundException>(() =>
            _service.UpdateStatusAsync(missingId, Status.Approved)
        );
    }

    // R04: approving twice must fail and must not touch inventory.
    [Fact]
    public async Task UpdateStatusAsync_RepeatedApproval_IsRefused_AndInventoryIsUntouched()
    {
        var order = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 3);
        order.UpdateStatus(Status.Approved);
        _repositoryMock.Setup(r => r.GetByIdAsync(order.Id)).ReturnsAsync(order);

        await Assert.ThrowsAsync<order_service.Domain.Exceptions.InvalidStatusTransitionException>(
            () => _service.UpdateStatusAsync(order.Id, Status.Approved));

        _grpcClientMock.Verify(g => g.SendInventoryAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<int>()), Times.Never);
        _repositoryMock.Verify(r => r.UpdateAsync(It.IsAny<Order>()), Times.Never);
    }

    // R05: if inventory-service does not confirm, the order is not saved as Closed.
    [Fact]
    public async Task UpdateStatusAsync_WhenInventoryFails_OrderIsNotSaved()
    {
        var order = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 5);
        order.UpdateStatus(Status.Approved);
        order.UpdateStatus(Status.Delivered);
        _repositoryMock.Setup(r => r.GetByIdAsync(order.Id)).ReturnsAsync(order);
        _grpcClientMock
            .Setup(g => g.SendInventoryAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<int>()))
            .ThrowsAsync(new order_service.Domain.Exceptions.InventoryUnavailableException("down"));

        await Assert.ThrowsAsync<order_service.Domain.Exceptions.InventoryUnavailableException>(
            () => _service.UpdateStatusAsync(order.Id, Status.Closed));

        _repositoryMock.Verify(r => r.UpdateAsync(It.IsAny<Order>()), Times.Never);
    }

    [Theory]
    [InlineData(Status.Requested, Status.Closed)]
    [InlineData(Status.Requested, Status.Delivered)]
    [InlineData(Status.Approved, Status.Requested)]
    [InlineData(Status.Rejected, Status.Approved)]
    [InlineData(Status.Closed, Status.Approved)]
    public void Order_RefusesTransitionsOutsideTheStateMachine(Status from, Status to)
    {
        Assert.False(Order.CanTransition(from, to));
    }
}
