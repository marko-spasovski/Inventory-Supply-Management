using product_service.Application.DTOs;

namespace product_service.Application.Ports.In.Category;

public interface IGetAllCategoriesUseCase
{
    Task<IEnumerable<CategoryResponse>> GetAllCategories();
}