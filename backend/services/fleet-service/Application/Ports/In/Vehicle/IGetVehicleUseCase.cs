using fleet_service.Application.DTOs;

namespace fleet_service.Application.Ports.In;

public interface IGetVehicleUseCase
{
    Task<VehicleResponse> GetById(Guid id);
}