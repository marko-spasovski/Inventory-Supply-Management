using product_service.Domain.Entities;

namespace product_service.Application.Ports.Out;

public interface ICategoryRepositoryPort
{
    Task<Category> Save(Category category);
    Task<List<Category>> GetAll();
    Task<Category?> GetById(Guid id);
    Task<Category?> DeleteById(Guid id);
}