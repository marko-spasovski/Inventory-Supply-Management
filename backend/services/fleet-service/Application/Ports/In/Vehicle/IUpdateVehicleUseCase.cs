using fleet_service.Application.DTOs;

namespace fleet_service.Application.Ports.In;

public interface IUpdateVehicleUseCase
{
    Task<VehicleResponse> UpdateVehicle(Guid id, UpdateVehicleRequest request);
}