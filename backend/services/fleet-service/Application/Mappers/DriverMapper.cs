using fleet_service.Application.DTOs;
using fleet_service.Domain.Entities;
using fleet_service.Infrastructure.Persistence.Entities;

namespace fleet_service.Application.Mappers;

public static class DriverMapper
{
    public static Driver ToDomain(DriverEntity entity)
    {
        return new Driver(
            entity.Id,
            entity.Name,
            entity.Phone,
            entity.Email,
            entity.VehicleId,
            entity.CompanyId
        );
    }

    public static DriverEntity ToEntity(Driver domain)
    {
        return new DriverEntity(
            domain.Id,
            domain.Name,
            domain.Phone,
            domain.Email,
            domain.VehicleId,
            domain.CompanyId
        );
    }

    public static DriverResponse ToResponse(Driver domain)
    {
        return new DriverResponse(
            domain.Id,
            domain.Name,
            domain.Phone,
            domain.Email,
            domain.VehicleId,
            domain.CompanyId
            );
    }
}