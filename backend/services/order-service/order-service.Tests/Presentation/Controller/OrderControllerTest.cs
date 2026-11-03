using Microsoft.AspNetCore.Mvc;
using Moq;
using order_service.Application.DTOs;
using order_service.Application.Interfaces;
using order_service.Controllers;
using order_service.Domain.Enums;
using Xunit;

namespace OrderService.Tests.Presentation.Controller;

public class OrdersControllerTest
{
    private readonly Mock<IOrderService> _serviceMock;
    private readonly Mock<IDocumentStorageService> _documentStorageServiceMock;
    private readonly OrdersController _controller;
 
    public OrdersControllerTest()
    {
        _serviceMock = new Mock<IOrderService>();
        _documentStorageServiceMock = new Mock<IDocumentStorageService>();
        _controller = new OrdersController(_serviceMock.Object, _documentStorageServiceMock.Object);
    }
 
    [Fact]
    public async Task Create_ReturnsOk_WithOrderResponse()
    {
        var request = new CreateOrderRequest
        {
            ProductId = Guid.NewGuid(),
            CompanyId = Guid.NewGuid(),
            WarehouseId = Guid.NewGuid(),
            DriverId = Guid.NewGuid(),
            Quantity = 5
        };
 
        var response = new OrderResponse
        {
            Id = Guid.NewGuid(),
            ProductId = request.ProductId,
            CompanyId = request.CompanyId,
            WarehouseId = request.WarehouseId,
            DriverId = request.DriverId,
            Quantity = 5,
            Status = Status.Requested
        };
 
        _serviceMock.Setup(s => s.CreateOrderAsync(request)).ReturnsAsync(response);
 
        var result = await _controller.Create(request);
 
        var ok = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsType<OrderResponse>(ok.Value);
        Assert.Equal(request.ProductId, body.ProductId);
        Assert.Equal(Status.Requested, body.Status);
    }
 
    [Fact]
    public async Task GetOrdersAsync_ReturnsOk_WithListOfOrders()
    {
        var orders = new List<OrderResponse>
        {
            new OrderResponse { Id = Guid.NewGuid(), Quantity = 1, Status = Status.Requested },
            new OrderResponse { Id = Guid.NewGuid(), Quantity = 2, Status = Status.Approved }
        };
 
        _serviceMock.Setup(s => s.GetOrdersAsync()).ReturnsAsync(orders);
 
        var result = await _controller.GetOrdersAsync(null);
 
        var ok = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsType<List<OrderResponse>>(ok.Value);
        Assert.Equal(2, body.Count);
    }
 
    [Fact]
    public async Task UpdateStatus_ReturnsOk_WithUpdatedOrder()
    {
        var orderId = Guid.NewGuid();
        var request = new UpdateOrderStatusRequest { OrderId = orderId, Status = Status.Approved };
 
        var response = new OrderResponse
        {
            Id = orderId,
            Status = Status.Approved,
            Quantity = 3
        };
 
        _serviceMock.Setup(s => s.UpdateStatusAsync(orderId, Status.Approved)).ReturnsAsync(response);
 
        var result = await _controller.UpdateStatus(request);
 
        var ok = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsType<OrderResponse>(ok.Value);
        Assert.Equal(Status.Approved, body.Status);
        _serviceMock.Verify(s => s.UpdateStatusAsync(orderId, Status.Approved), Times.Once);
    }
 
    [Fact]
    public async Task Create_CallsServiceOnce()
    {
        var request = new CreateOrderRequest
        {
            ProductId = Guid.NewGuid(),
            CompanyId = Guid.NewGuid(),
            WarehouseId = Guid.NewGuid(),
            DriverId = Guid.NewGuid(),
            Quantity = 1
        };
 
        _serviceMock.Setup(s => s.CreateOrderAsync(It.IsAny<CreateOrderRequest>()))
            .ReturnsAsync(new OrderResponse { Id = Guid.NewGuid(), Quantity = 1, Status = Status.Requested });
 
        await _controller.Create(request);
 
        _serviceMock.Verify(s => s.CreateOrderAsync(request), Times.Once);
    }
}
