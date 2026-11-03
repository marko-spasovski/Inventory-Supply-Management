using fleet_service.Application.Mappers;
using fleet_service.Domain.Entities;
using fleet_service.Infrastructure.Persistence.Entities;
using Xunit;

namespace FleetService.Tests.Application.Mappers;

public class DriverMapperTest
{
    [Fact]
    public void ToResponse_MapsAllFields()
    {
        var vId = Guid.NewGuid();
        var cId = Guid.NewGuid();
        var d = Driver.Create("Alice", "555", "a@x.com", vId, cId);

        var r = DriverMapper.ToResponse(d);

        Assert.Equal(d.Id, r.Id);
        Assert.Equal("Alice", r.Name);
        Assert.Equal("555", r.Phone);
        Assert.Equal("a@x.com", r.Email);
        Assert.Equal(vId, r.VehicleId);
        Assert.Equal(cId, r.CompanyId);
    }

    [Fact]
    public void ToEntity_MapsAllFields()
    {
        var d = Driver.Create("A", "1", "a@x.com", Guid.NewGuid(), Guid.NewGuid());
        var e = DriverMapper.ToEntity(d);

        Assert.Equal(d.Id, e.Id);
        Assert.Equal(d.Name, e.Name);
        Assert.Equal(d.Email, e.Email);
    }

    [Fact]
    public void RoundTrip_PreservesData()
    {
        var original = Driver.Create("Eve", "9", "e@x.com", Guid.NewGuid(), Guid.NewGuid());
        var back = DriverMapper.ToDomain(DriverMapper.ToEntity(original));

        Assert.Equal(original.Id, back.Id);
        Assert.Equal(original.Name, back.Name);
        Assert.Equal(original.Phone, back.Phone);
        Assert.Equal(original.Email, back.Email);
        Assert.Equal(original.VehicleId, back.VehicleId);
        Assert.Equal(original.CompanyId, back.CompanyId);
    }
}
