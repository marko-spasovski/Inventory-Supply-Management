using product_service.Application.DTOs;

namespace product_service.Application.Ports.In.Product;

public interface IGetByCategoryUseCase
{
    Task<IEnumerable<ProductResponse>> GetAllByCategoryIdOrName(Guid? categoryId = null, string? categoryName = null);
}