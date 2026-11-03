using product_service.Application.DTOs;
using product_service.Application.Mappers;
using product_service.Application.Ports.In.Category;
using product_service.Application.Ports.Out;
using product_service.Domain.Entities;
using product_service.Domain.Exceptions;

namespace product_service.Application.Services;

public class CategoryService:
    ICreateCategoryUseCase,
    IUpdateCategoryUseCase,
    IGetAllCategoriesUseCase,
    IGetCategoryUseCase,
    IDeleteCategoryUseCase
{
    private readonly ICategoryRepositoryPort _categoryRepository;

    public CategoryService(ICategoryRepositoryPort categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<CategoryResponse> CreateCategory(CreateCategoryRequest request)
    {
        var category = Category.Create(
            request.Name,
            request.Description
        );

        var saved = await _categoryRepository.Save(category);

        return CategoryMapper.ToResponse(saved);
    }

    public async Task<CategoryResponse> UpdateCategory(Guid id, UpdateCategoryRequest request)
    {
        var category = await _categoryRepository.GetById(id);

        if (category == null)
        {
            throw new CategoryNotFoundException(id);
        }

        category.Update(
            request.Name,
            request.Description
        );
        
        var saved = await _categoryRepository.Save(category);
        return CategoryMapper.ToResponse(saved);
    }

    public async Task<IEnumerable<CategoryResponse>> GetAllCategories()
    {
        var categories = await _categoryRepository.GetAll();

        return categories
            .Select(CategoryMapper.ToResponse)
            .ToList();
    }

    public async Task<CategoryResponse> GetById(Guid id)
    {
        var category = await _categoryRepository.GetById(id);

        if (category == null)
        {
            throw new CategoryNotFoundException(id);
        }
        
        return CategoryMapper.ToResponse(category);
    }

    public async Task DeleteById(Guid id)
    {
        var category = await _categoryRepository.DeleteById(id);
        
        if (category == null)
        {
            throw new CategoryNotFoundException(id);
        }
    }
    
}