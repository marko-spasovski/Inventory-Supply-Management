using Microsoft.EntityFrameworkCore;
using order_service.Domain;
using order_service.Domain.Enums;
using order_service.Infrastructure.Persistence;
using Xunit;

namespace OrderService.Tests.Infrastructure.Persistence;

public class OrderRepositoryTest
{
    private OrderDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<OrderDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()) // fresh DB per test
            .Options;
        return new OrderDbContext(options);
    }
 
    [Fact]
    public async Task SaveAsync_PersistsOrder()
    {
        await using var context = CreateContext();
        var repository = new OrderRepository(context);
 
        var order = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 5);
        var saved = await repository.SaveAsync(order);
 
        Assert.Equal(order.Id, saved.Id);
        Assert.Equal(5, saved.Quantity);
        Assert.Equal(Status.Requested, saved.Status);
    }
 
    [Fact]
    public async Task GetAllAsync_ReturnsAllOrders()
    {
        await using var context = CreateContext();
        var repository = new OrderRepository(context);
 
        await repository.SaveAsync(new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1));
        await repository.SaveAsync(new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 2));
 
        var all = await repository.GetAllAsync();
 
        Assert.Equal(2, all.Count);
    }
 
    [Fact]
    public async Task GetByIdAsync_ReturnsCorrectOrder()
    {
        await using var context = CreateContext();
        var repository = new OrderRepository(context);
 
        var order = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 3);
        await repository.SaveAsync(order);
 
        var found = await repository.GetByIdAsync(order.Id);
 
        Assert.NotNull(found);
        Assert.Equal(order.Id, found!.Id);
    }
 
    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
    {
        await using var context = CreateContext();
        var repository = new OrderRepository(context);
 
        var result = await repository.GetByIdAsync(Guid.NewGuid());
 
        Assert.Null(result);
    }
 
    [Fact]
    public async Task UpdateAsync_PersistsStatusChange()
    {
        await using var context = CreateContext();
        var repository = new OrderRepository(context);
 
        var order = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 10);
        await repository.SaveAsync(order);
 
        order.UpdateStatus(Status.Approved);
        await repository.UpdateAsync(order);
 
        var updated = await repository.GetByIdAsync(order.Id);
        Assert.Equal(Status.Approved, updated!.Status);
    }
}
 