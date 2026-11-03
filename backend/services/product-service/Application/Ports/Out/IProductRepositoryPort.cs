using product_service.Domain.Entities;

namespace product_service.Application.Ports.Out;

public interface IProductRepositoryPort
{
    Task<Product> Save(Product category);
    Task<List<Product>> GetAll();
    Task<Product?> GetById(Guid id);
    Task<Product?> GetBySku(string sku);
    Task<Product?> DeleteById(Guid id);
    Task<IEnumerable<Product>> GetByFilterAsync(Guid? categoryId = null, string? name = null);
}