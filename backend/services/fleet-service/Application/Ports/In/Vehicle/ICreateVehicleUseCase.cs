using fleet_service.Application.DTOs;

namespace fleet_service.Application.Ports.In;

public interface ICreateVehicleUseCase
{
    Task<VehicleResponse> CreateVehicle(CreateVehicleRequest request);
}