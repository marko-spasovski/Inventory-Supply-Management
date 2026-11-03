using order_service.Application.DTOs;
using order_service.Domain.Enums;

namespace order_service.Application.Interfaces;

public interface IOrderService
{
    Task<OrderResponse> CreateOrderAsync(CreateOrderRequest request);
    Task<List<OrderResponse>> GetOrdersAsync();
    Task<List<OrderResponse>> GetOrdersByDriverAsync(Guid driverId);
    Task<OrderResponse?> GetOrderByIdAsync(Guid orderId);
    Task<OrderResponse> UpdateStatusAsync(Guid orderId, Status newStatus);
}

