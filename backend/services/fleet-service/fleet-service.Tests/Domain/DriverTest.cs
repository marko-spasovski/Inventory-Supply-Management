using fleet_service.Domain.Entities;
using Xunit;

namespace FleetService.Tests.Domain;

public class DriverTest
{
    [Fact]
    public void Create_AssignsRandomId_AndCopiesFields()
    {
        var vId = Guid.NewGuid();
        var cId = Guid.NewGuid();
        var d = Driver.Create("Alice", "555", "a@x.com", vId, cId);

        Assert.NotEqual(Guid.Empty, d.Id);
        Assert.Equal("Alice", d.Name);
        Assert.Equal("555", d.Phone);
        Assert.Equal("a@x.com", d.Email);
        Assert.Equal(vId, d.VehicleId);
        Assert.Equal(cId, d.CompanyId);
    }

    [Fact]
    public void Create_GeneratesUniqueIds()
    {
        var d1 = Driver.Create("A", "1", "a@a.com", Guid.NewGuid(), Guid.NewGuid());
        var d2 = Driver.Create("A", "1", "a@a.com", Guid.NewGuid(), Guid.NewGuid());
        Assert.NotEqual(d1.Id, d2.Id);
    }

    [Fact]
    public void Update_OverridesAllMutableFields()
    {
        var d = Driver.Create("Old", "111", "old@x.com", Guid.NewGuid(), Guid.NewGuid());
        var newV = Guid.NewGuid();
        var newC = Guid.NewGuid();

        d.Update("New", "222", "new@x.com", newV, newC);

        Assert.Equal("New", d.Name);
        Assert.Equal("222", d.Phone);
        Assert.Equal("new@x.com", d.Email);
        Assert.Equal(newV, d.VehicleId);
        Assert.Equal(newC, d.CompanyId);
    }

    [Fact]
    public void Ctor_ThrowsOnNullName()
    {
        Assert.Throws<ArgumentNullException>(() =>
            new Driver(Guid.NewGuid(), null!, "1", "a@x.com", Guid.NewGuid(), Guid.NewGuid()));
    }

    [Fact]
    public void Ctor_ThrowsOnNullPhone()
    {
        Assert.Throws<ArgumentNullException>(() =>
            new Driver(Guid.NewGuid(), "A", null!, "a@x.com", Guid.NewGuid(), Guid.NewGuid()));
    }

    [Fact]
    public void Ctor_ThrowsOnNullEmail()
    {
        Assert.Throws<ArgumentNullException>(() =>
            new Driver(Guid.NewGuid(), "A", "1", null!, Guid.NewGuid(), Guid.NewGuid()));
    }

    [Fact]
    public void Update_ThrowsOnNullName()
    {
        var d = Driver.Create("A", "1", "a@x.com", Guid.NewGuid(), Guid.NewGuid());
        Assert.Throws<ArgumentNullException>(() => d.Update(null!, "1", "a@x.com", Guid.NewGuid(), Guid.NewGuid()));
    }
}
