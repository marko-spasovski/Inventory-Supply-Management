using order_service.Domain;

namespace order_service.Application.Interfaces;

public interface IOrderRepository
{
    Task<Order> SaveAsync(Order order);
    Task<List<Order>> GetAllAsync();
    Task<List<Order>> GetByDriverIdAsync(Guid driverId);
    Task<Order?> GetByIdAsync(Guid id);
    Task<Order> UpdateAsync(Order order);
}