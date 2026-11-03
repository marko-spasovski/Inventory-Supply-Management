using fleet_service.Application.DTOs;

namespace fleet_service.Application.Ports.In;

public interface IUpdateDriverUseCase
{
    Task<DriverResponse> UpdateDriver(Guid id, UpdateDriverRequest request);
}