using product_service.Application.DTOs;
using product_service.Domain.Entities;
using product_service.Infrastructure.Entities;

namespace product_service.Application.Mappers;

public static class ProductMapper
{
    public static ProductEntity ToEntity(Product product)
    {
        return new ProductEntity(
            product.Id,
            product.Name,
            product.SKU,
            product.Description,
            product.Weight,
            product.CategoryId
        );
    }

    public static Product ToDomain(ProductEntity entity)
    {
        return new Product(
            entity.Id,
            entity.Name,
            entity.SKU,
            entity.Description,
            entity.Weight,
            entity.CategoryId
        );
    }

    public static ProductResponse ToResponse(Product product)
    {
        return new ProductResponse(
            product.Id,
            product.Name,
            product.SKU,
            product.Description,
            product.Weight,
            product.CategoryId
        );
    }
}