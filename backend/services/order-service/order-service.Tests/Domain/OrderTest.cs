using order_service.Domain;
using order_service.Domain.Enums;
using Xunit;

namespace OrderService.Tests.Domain;

public class OrderTest
{
    [Fact]
    public void Ctor_GeneratesRandomId_AndStartsAsRequested()
    {
        var o = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 10);

        Assert.NotEqual(Guid.Empty, o.Id);
        Assert.Equal(Status.Requested, o.Status);
        Assert.Equal(10, o.Quantity);
        Assert.Null(o.DeliveryDate);
    }

    [Fact]
    public void Ctor_PreservesIds()
    {
        var pId = Guid.NewGuid();
        var cId = Guid.NewGuid();
        var wId = Guid.NewGuid();
        var dId = Guid.NewGuid();

        var o = new Order(pId, cId, wId, dId, 5);

        Assert.Equal(pId, o.ProductId);
        Assert.Equal(cId, o.CompanyId);
        Assert.Equal(wId, o.WarehouseId);
        Assert.Equal(dId, o.DriverId);
    }

    [Fact]
    public void Ctor_ConvertsDeliveryDateToUtc()
    {
        var local = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Unspecified);
        var o = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, local);

        Assert.NotNull(o.DeliveryDate);
        Assert.Equal(DateTimeKind.Utc, o.DeliveryDate!.Value.Kind);
    }

    [Fact]
    public void UpdateStatus_ChangesStatus()
    {
        var o = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1);
        o.UpdateStatus(Status.Approved);
        Assert.Equal(Status.Approved, o.Status);
    }

    [Fact]
    public void UpdateStatus_AllowsAnyTransition()
    {
        var o = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1);
        o.UpdateStatus(Status.Delivered);
        Assert.Equal(Status.Delivered, o.Status);
        o.UpdateStatus(Status.Closed);
        Assert.Equal(Status.Closed, o.Status);
    }

    [Fact]
    public void Ctor_GeneratesUniqueIds()
    {
        var a = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1);
        var b = new Order(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1);
        Assert.NotEqual(a.Id, b.Id);
    }
}
