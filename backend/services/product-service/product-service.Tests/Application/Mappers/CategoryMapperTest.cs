using product_service.Application.Mappers;
using product_service.Domain.Entities;
using Xunit;

namespace ProductSvc.Tests.Application.Mappers;

public class CategoryMapperTest
{
    [Fact]
    public void ToResponse_MapsAllFields()
    {
        var c = Category.Create("Electronics", "d");

        var r = CategoryMapper.ToResponse(c);

        Assert.Equal(c.Id, r.Id);
        Assert.Equal("Electronics", r.Name);
        Assert.Equal("d", r.Description);
    }

    [Fact]
    public void RoundTrip_PreservesData()
    {
        var original = Category.Create("Cat", "desc");
        var back = CategoryMapper.ToDomain(CategoryMapper.ToEntity(original));

        Assert.Equal(original.Id, back.Id);
        Assert.Equal(original.Name, back.Name);
        Assert.Equal(original.Description, back.Description);
    }
}
