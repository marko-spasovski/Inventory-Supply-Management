using fleet_service.Application.DTOs;

namespace fleet_service.Application.Ports.In;

public interface IGetDriverUseCase
{
    Task<DriverResponse> GetDriverById(Guid id);
}