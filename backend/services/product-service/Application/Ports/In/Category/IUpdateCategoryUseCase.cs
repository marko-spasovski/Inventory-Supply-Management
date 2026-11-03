using product_service.Application.DTOs;

namespace product_service.Application.Ports.In.Category;

public interface IUpdateCategoryUseCase
{
    Task<CategoryResponse> UpdateCategory(Guid id, UpdateCategoryRequest request);
}