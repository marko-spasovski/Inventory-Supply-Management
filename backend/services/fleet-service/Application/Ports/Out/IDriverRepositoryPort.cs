using fleet_service.Domain.Entities;

namespace fleet_service.Application.Ports.Out;

public interface IDriverRepositoryPort
{
    Task<Driver> Save(Driver driver);
    Task<List<Driver>> GetAll();
    Task<Driver?> GetById(Guid id);
    Task<Driver?> GetByEmail(string email);
    Task<Driver?> DeleteById(Guid id);
    //TODO Add Update
}