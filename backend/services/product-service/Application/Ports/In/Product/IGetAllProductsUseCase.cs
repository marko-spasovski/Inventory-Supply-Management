using product_service.Application.DTOs;

namespace product_service.Application.Ports.In.Product;

public interface IGetAllProductsUseCase
{
    Task<IEnumerable<ProductResponse>> GetAllProducts();
}