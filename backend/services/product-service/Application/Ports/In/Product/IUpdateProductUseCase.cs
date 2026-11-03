using product_service.Application.DTOs;

namespace product_service.Application.Ports.In.Product;

public interface IUpdateProductUseCase
{
    Task<ProductResponse> UpdateProduct(Guid id, UpdateProductRequest request);
}