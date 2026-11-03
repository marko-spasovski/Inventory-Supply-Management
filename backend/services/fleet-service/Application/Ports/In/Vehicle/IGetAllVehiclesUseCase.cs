using fleet_service.Application.DTOs;

namespace fleet_service.Application.Ports.In;

public interface IGetAllVehiclesUseCase
{
    Task<List<VehicleResponse>> GetAllVehicles();
}