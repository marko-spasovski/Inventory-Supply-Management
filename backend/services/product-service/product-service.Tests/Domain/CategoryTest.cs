using product_service.Domain.Entities;
using Xunit;

namespace ProductSvc.Tests.Domain;

public class CategoryTest
{
    [Fact]
    public void Create_AssignsRandomId_AndCopiesFields()
    {
        var c = Category.Create("Electronics", "All things electronic");

        Assert.NotEqual(Guid.Empty, c.Id);
        Assert.Equal("Electronics", c.Name);
        Assert.Equal("All things electronic", c.Description);
    }

    [Fact]
    public void Update_OverridesFields()
    {
        var c = Category.Create("Old", "Old desc");
        c.Update("New", "New desc");

        Assert.Equal("New", c.Name);
        Assert.Equal("New desc", c.Description);
    }
}
