using product_service.Application.DTOs;
using product_service.Domain.Entities;
using product_service.Infrastructure.Entities;

namespace product_service.Application.Mappers;

public static class CategoryMapper
{
    public static CategoryEntity ToEntity(Category category)
    {
        return new CategoryEntity(
            id: category.Id,
            name: category.Name,
            description: category.Description
        );
    }
    
    public static Category ToDomain(CategoryEntity entity)
    {
        return new Category(
            id: entity.Id,
            name: entity.Name,
            description: entity.Description
        );
    }

    public static CategoryResponse ToResponse(Category category)
    {
        return new CategoryResponse(
            category.Id,
            category.Name,
            category.Description
        );
    }
}