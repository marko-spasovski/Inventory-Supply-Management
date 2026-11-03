using product_service.Domain.Entities;
using Xunit;

namespace ProductSvc.Tests.Domain;

public class ProductTest
{
    [Fact]
    public void Create_AssignsRandomId_AndCopiesFields()
    {
        var catId = Guid.NewGuid();
        var p = Product.Create("Widget", "SKU-1", "desc", 1.5m, catId);

        Assert.NotEqual(Guid.Empty, p.Id);
        Assert.Equal("Widget", p.Name);
        Assert.Equal("SKU-1", p.SKU);
        Assert.Equal("desc", p.Description);
        Assert.Equal(1.5m, p.Weight);
        Assert.Equal(catId, p.CategoryId);
    }

    [Fact]
    public void Create_GeneratesUniqueIds()
    {
        var a = Product.Create("X", "1", "d", 1m, Guid.NewGuid());
        var b = Product.Create("X", "2", "d", 1m, Guid.NewGuid());
        Assert.NotEqual(a.Id, b.Id);
    }

    [Fact]
    public void Update_OverridesAllFields()
    {
        var p = Product.Create("Old", "S1", "OldDesc", 1m, Guid.NewGuid());
        var newCat = Guid.NewGuid();

        p.Update("New", "S2", "NewDesc", 2m, newCat);

        Assert.Equal("New", p.Name);
        Assert.Equal("S2", p.SKU);
        Assert.Equal("NewDesc", p.Description);
        Assert.Equal(2m, p.Weight);
        Assert.Equal(newCat, p.CategoryId);
    }
}
