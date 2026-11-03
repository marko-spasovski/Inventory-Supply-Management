using product_service.Application.Mappers;
using product_service.Domain.Entities;
using Xunit;

namespace ProductSvc.Tests.Application.Mappers;

public class ProductMapperTest
{
    [Fact]
    public void ToResponse_MapsAllFields()
    {
        var catId = Guid.NewGuid();
        var p = Product.Create("Widget", "SKU-1", "d", 1.5m, catId);

        var r = ProductMapper.ToResponse(p);

        Assert.Equal(p.Id, r.Id);
        Assert.Equal("Widget", r.Name);
        Assert.Equal("SKU-1", r.SKU);
        Assert.Equal(1.5m, r.Weight);
        Assert.Equal(catId, r.CategoryId);
    }

    [Fact]
    public void RoundTrip_PreservesData()
    {
        var original = Product.Create("X", "S", "d", 2m, Guid.NewGuid());
        var back = ProductMapper.ToDomain(ProductMapper.ToEntity(original));

        Assert.Equal(original.Id, back.Id);
        Assert.Equal(original.Name, back.Name);
        Assert.Equal(original.SKU, back.SKU);
        Assert.Equal(original.Weight, back.Weight);
        Assert.Equal(original.CategoryId, back.CategoryId);
    }
}
