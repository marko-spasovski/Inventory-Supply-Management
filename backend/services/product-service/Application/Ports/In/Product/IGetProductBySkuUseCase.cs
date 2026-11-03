using product_service.Application.DTOs;

namespace product_service.Application.Ports.In.Product;

public interface IGetProductBySkuUseCase
{
    Task<ProductResponse?> GetBySku(string sku);
}
