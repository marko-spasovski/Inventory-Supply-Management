namespace fleet_service.Application.Ports.In;

public interface IDeleteDriverUseCase
{
    Task DeleteById(Guid id);
}