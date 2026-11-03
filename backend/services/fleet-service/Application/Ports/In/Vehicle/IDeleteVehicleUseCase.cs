namespace fleet_service.Application.Ports.In;

public interface IDeleteVehicleUseCase
{
    Task DeleteById(Guid id);
}