using fleet_service.Application.Mappers;
using fleet_service.Domain.Entities;
using Xunit;

namespace FleetService.Tests.Application.Mappers;

public class VehicleMapperTest
{
    [Fact]
    public void ToResponse_MapsFields()
    {
        var v = Vehicle.Create("AB-123");
        var r = VehicleMapper.ToResponse(v);

        Assert.Equal(v.Id, r.Id);
        Assert.Equal("AB-123", r.RegistrationPlate);
    }

    [Fact]
    public void RoundTrip_PreservesData()
    {
        var original = Vehicle.Create("XYZ");
        var back = VehicleMapper.ToDomain(VehicleMapper.ToEntity(original));

        Assert.Equal(original.Id, back.Id);
        Assert.Equal(original.RegistrationPlate, back.RegistrationPlate);
    }
}
