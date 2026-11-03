using fleet_service.Application.DTOs;

namespace fleet_service.Application.Ports.In;

public interface IGetDriverByEmailUseCase
{
    Task<DriverResponse?> GetDriverByEmail(string email);
}
