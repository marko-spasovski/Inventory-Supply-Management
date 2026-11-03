using product_service.Application.DTOs;
using product_service.Application.Ports.Out;
using product_service.Application.Services;
using product_service.Domain.Entities;
using product_service.Domain.Exceptions;
using Moq;
using Xunit;

namespace ProductSvc.Tests.Application.Service;

public class ProductServiceTest
{
    private readonly Mock<IProductRepositoryPort> _productRepo = new();
    private readonly Mock<ICategoryRepositoryPort> _categoryRepo = new();
    private readonly ProductService _service;

    public ProductServiceTest()
    {
        _service = new ProductService(_productRepo.Object, _categoryRepo.Object);
    }

    private static Product MakeProduct(Guid? categoryId = null) =>
        Product.Create("Widget", "SKU-1", "desc", 1.5m, categoryId ?? Guid.NewGuid());

    [Fact]
    public async Task CreateProduct_Succeeds_WhenCategoryExists()
    {
        var category = new Category(Guid.NewGuid(), "Cat", "d");
        _categoryRepo.Setup(c => c.GetById(category.Id)).ReturnsAsync(category);
        _productRepo.Setup(p => p.Save(It.IsAny<Product>())).ReturnsAsync((Product p) => p);

        var resp = await _service.CreateProduct(new CreateProductRequest
        {
            Name = "Widget", SKU = "SKU-1", Description = "d",
            Weight = 1m, CategoryId = category.Id
        });

        Assert.Equal("Widget", resp.Name);
        Assert.Equal("SKU-1", resp.SKU);
        Assert.Equal(category.Id, resp.CategoryId);
        _productRepo.Verify(p => p.Save(It.IsAny<Product>()), Times.Once);
    }

    [Fact]
    public async Task CreateProduct_Throws_WhenCategoryMissing()
    {
        _categoryRepo.Setup(c => c.GetById(It.IsAny<Guid>())).ReturnsAsync((Category?)null);

        await Assert.ThrowsAsync<CategoryNotFoundException>(() => _service.CreateProduct(new CreateProductRequest
        {
            Name = "X", SKU = "S", Description = "d", Weight = 1m, CategoryId = Guid.NewGuid()
        }));
        _productRepo.Verify(p => p.Save(It.IsAny<Product>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProduct_Succeeds_WhenAllFound()
    {
        var product = MakeProduct();
        var category = new Category(Guid.NewGuid(), "Cat", "d");
        _productRepo.Setup(p => p.GetById(product.Id)).ReturnsAsync(product);
        _categoryRepo.Setup(c => c.GetById(category.Id)).ReturnsAsync(category);
        _productRepo.Setup(p => p.Save(It.IsAny<Product>())).ReturnsAsync((Product p) => p);

        var resp = await _service.UpdateProduct(product.Id, new UpdateProductRequest
        {
            Name = "NewName", SKU = "SKU-2", Description = "newdesc",
            Weight = 9m, CategoryId = category.Id
        });

        Assert.Equal("NewName", resp.Name);
        Assert.Equal("SKU-2", resp.SKU);
        Assert.Equal(9m, resp.Weight);
        Assert.Equal(category.Id, resp.CategoryId);
    }

    [Fact]
    public async Task UpdateProduct_Throws_WhenProductMissing()
    {
        _productRepo.Setup(p => p.GetById(It.IsAny<Guid>())).ReturnsAsync((Product?)null);

        await Assert.ThrowsAsync<ProductNotFoundException>(() => _service.UpdateProduct(Guid.NewGuid(),
            new UpdateProductRequest { Name = "X", SKU = "S", Description = "d", Weight = 1m, CategoryId = Guid.NewGuid() }));
    }

    [Fact]
    public async Task UpdateProduct_Throws_WhenCategoryMissing()
    {
        var product = MakeProduct();
        _productRepo.Setup(p => p.GetById(product.Id)).ReturnsAsync(product);
        _categoryRepo.Setup(c => c.GetById(It.IsAny<Guid>())).ReturnsAsync((Category?)null);

        await Assert.ThrowsAsync<CategoryNotFoundException>(() => _service.UpdateProduct(product.Id,
            new UpdateProductRequest { Name = "X", SKU = "S", Description = "d", Weight = 1m, CategoryId = Guid.NewGuid() }));
    }

    [Fact]
    public async Task GetAllProducts_MapsAll()
    {
        _productRepo.Setup(p => p.GetAll()).ReturnsAsync(new List<Product>
        {
            MakeProduct(),
            MakeProduct()
        });

        var list = (await _service.GetAllProducts()).ToList();
        Assert.Equal(2, list.Count);
    }

    [Fact]
    public async Task GetById_ReturnsResponse_WhenFound()
    {
        var p = MakeProduct();
        _productRepo.Setup(r => r.GetById(p.Id)).ReturnsAsync(p);

        var resp = await _service.GetById(p.Id);

        Assert.Equal(p.Id, resp.Id);
        Assert.Equal(p.SKU, resp.SKU);
    }

    [Fact]
    public async Task GetById_Throws_WhenMissing()
    {
        _productRepo.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((Product?)null);
        await Assert.ThrowsAsync<ProductNotFoundException>(() => _service.GetById(Guid.NewGuid()));
    }

    [Fact]
    public async Task GetBySku_ReturnsNull_WhenBlank()
    {
        Assert.Null(await _service.GetBySku("   "));
        _productRepo.Verify(r => r.GetBySku(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetBySku_TrimsAndDelegates_WhenFound()
    {
        var p = MakeProduct();
        _productRepo.Setup(r => r.GetBySku("ABC-1")).ReturnsAsync(p);

        var resp = await _service.GetBySku(" ABC-1 ");

        Assert.NotNull(resp);
        Assert.Equal(p.Id, resp!.Id);
    }

    [Fact]
    public async Task GetBySku_ReturnsNull_WhenNotFound()
    {
        _productRepo.Setup(r => r.GetBySku("X")).ReturnsAsync((Product?)null);
        Assert.Null(await _service.GetBySku("X"));
    }

    [Fact]
    public async Task DeleteById_Succeeds_WhenDeletes()
    {
        var p = MakeProduct();
        _productRepo.Setup(r => r.DeleteById(p.Id)).ReturnsAsync(p);

        await _service.DeleteById(p.Id);

        _productRepo.Verify(r => r.DeleteById(p.Id), Times.Once);
    }

    [Fact]
    public async Task DeleteById_Throws_WhenRepoReturnsNull()
    {
        _productRepo.Setup(r => r.DeleteById(It.IsAny<Guid>())).ReturnsAsync((Product?)null);
        await Assert.ThrowsAsync<ProductNotFoundException>(() => _service.DeleteById(Guid.NewGuid()));
    }

    [Fact]
    public async Task GetAllByCategoryIdOrName_DelegatesToRepoFilter()
    {
        var categoryId = Guid.NewGuid();
        _productRepo.Setup(r => r.GetByFilterAsync(categoryId, "wid"))
            .ReturnsAsync(new List<Product> { MakeProduct(categoryId) });

        var list = (await _service.GetAllByCategoryIdOrName(categoryId, "wid")).ToList();
        Assert.Single(list);
    }
}
