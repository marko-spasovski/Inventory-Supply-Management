using fleet_service.Application.DTOs;

namespace fleet_service.Application.Ports.In;

public interface ICreateDriverUseCase
{
    Task<DriverResponse> CreateDriver(CreateDriverRequest request); 
}