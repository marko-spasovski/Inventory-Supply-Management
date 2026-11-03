using fleet_service.Domain.Entities;

namespace fleet_service.Application.Ports.Out;

public interface IVehicleRepositoryPort
{
    Task<Vehicle> Save(Vehicle vehicle);
    Task<List<Vehicle>> GetAll();
    Task<Vehicle?> GetById(Guid id);
    Task<Vehicle?> Delete(Guid id);
    
}