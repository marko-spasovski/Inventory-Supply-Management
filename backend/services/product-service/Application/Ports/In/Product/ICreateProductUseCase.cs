using product_service.Application.DTOs;

namespace product_service.Application.Ports.In.Product;

public interface ICreateProductUseCase
{
    Task<ProductResponse> CreateProduct(CreateProductRequest request);
}