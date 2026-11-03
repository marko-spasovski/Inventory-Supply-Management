using fleet_service.Domain.Entities;
using Xunit;

namespace FleetService.Tests.Domain;

public class VehicleTest
{
    [Fact]
    public void Create_AssignsRandomId_AndCopiesPlate()
    {
        var v = Vehicle.Create("AB-123-CD");

        Assert.NotEqual(Guid.Empty, v.Id);
        Assert.Equal("AB-123-CD", v.RegistrationPlate);
    }

    [Fact]
    public void Create_GeneratesUniqueIds()
    {
        var a = Vehicle.Create("X");
        var b = Vehicle.Create("X");
        Assert.NotEqual(a.Id, b.Id);
    }

    [Fact]
    public void Update_OverridesPlate()
    {
        var v = Vehicle.Create("OLD-PLATE");
        v.Update("NEW-PLATE");
        Assert.Equal("NEW-PLATE", v.RegistrationPlate);
    }
}
