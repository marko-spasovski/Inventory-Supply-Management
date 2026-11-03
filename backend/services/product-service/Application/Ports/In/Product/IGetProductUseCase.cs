using product_service.Application.DTOs;

namespace product_service.Application.Ports.In.Product;

public interface IGetProductUseCase
{
    Task<ProductResponse> GetById(Guid id);
}