using fleet_service.Application.DTOs;
using fleet_service.Domain.Entities;
using fleet_service.Infrastructure.Persistence.Entities;

namespace fleet_service.Application.Mappers;

public static class VehicleMapper
{
    public static Vehicle ToDomain(VehicleEntity entity)
    {
        return new Vehicle(
            entity.Id,
            entity.RegistrationPlate
            );
    }

    public static VehicleEntity ToEntity(Vehicle domain)
    {
        return new VehicleEntity(
            domain.Id,
            domain.RegistrationPlate
        );
    }

    public static VehicleResponse ToResponse(Vehicle vehicle)
    {
        return new VehicleResponse(
            vehicle.Id,
            vehicle.RegistrationPlate
        );
    }
}