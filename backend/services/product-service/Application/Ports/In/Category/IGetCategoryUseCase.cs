using product_service.Application.DTOs;

namespace product_service.Application.Ports.In.Category;

public interface IGetCategoryUseCase
{
    Task<CategoryResponse> GetById(Guid id);
}