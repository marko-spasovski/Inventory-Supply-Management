using Microsoft.EntityFrameworkCore;
using order_service.Application.Interfaces;
using order_service.Domain;

namespace order_service.Infrastructure.Persistence;

public class OrderRepository : IOrderRepository
{
    private readonly OrderDbContext _dbContext;
    
    public OrderRepository(OrderDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Order> SaveAsync(Order order)
    {
        _dbContext.Orders.Add(order);
        await _dbContext.SaveChangesAsync();
        return order;
    }

    public async Task<List<Order>> GetAllAsync()
    {
        return await _dbContext.Orders.ToListAsync();
    }

    public async Task<List<Order>> GetByDriverIdAsync(Guid driverId)
    {
        return await _dbContext.Orders.Where(o => o.DriverId == driverId).ToListAsync();
    }

    public async Task<Order?> GetByIdAsync(Guid id)
    {
        return await _dbContext.Orders.FindAsync(id);
    }

    public async Task<Order> UpdateAsync(Order order)
    {
        _dbContext.Orders.Update(order);
        await _dbContext.SaveChangesAsync();
        return order;
    }
}