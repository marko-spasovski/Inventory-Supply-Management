using Microsoft.AspNetCore.Mvc;
using Moq;
using product_service.Application.DTOs;
using product_service.Application.Ports.In.Product;
using product_service.Controllers;
using product_service.Domain.Exceptions;
using Xunit;

namespace ProductSvc.Tests.Presentation.Controllers;

public class ProductControllerTest
{
    private readonly Mock<ICreateProductUseCase> _create = new();
    private readonly Mock<IUpdateProductUseCase> _update = new();
    private readonly Mock<IGetProductUseCase> _get = new();
    private readonly Mock<IGetProductBySkuUseCase> _getBySku = new();
    private readonly Mock<IGetByCategoryUseCase> _getByCategory = new();
    private readonly Mock<IGetAllProductsUseCase> _getAll = new();
    private readonly Mock<IDeleteProductUseCase> _delete = new();
    private readonly ProductController _controller;

    public ProductControllerTest()
    {
        _controller = new ProductController(_create.Object, _update.Object, _get.Object,
            _getBySku.Object, _getByCategory.Object, _getAll.Object, _delete.Object);
    }

    private static ProductResponse Sample(Guid id) =>
        new(id, "Widget", "SKU-1", "d", 1m, Guid.NewGuid());

    [Fact]
    public async Task GetAll_ReturnsOk()
    {
        _getAll.Setup(g => g.GetAllProducts()).ReturnsAsync(new List<ProductResponse>
        {
            Sample(Guid.NewGuid()),
            Sample(Guid.NewGuid())
        });

        var result = await _controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<IEnumerable<ProductResponse>>(ok.Value);
        Assert.Equal(2, list.Count());
    }

    [Fact]
    public async Task GetBySku_ReturnsBadRequest_WhenSkuBlank()
    {
        var result = await _controller.GetBySku("  ");
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetBySku_ReturnsNotFound_WhenMissing()
    {
        _getBySku.Setup(g => g.GetBySku("X")).ReturnsAsync((ProductResponse?)null);
        var result = await _controller.GetBySku("X");
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetBySku_ReturnsOk_WhenFound()
    {
        var resp = Sample(Guid.NewGuid());
        _getBySku.Setup(g => g.GetBySku("S")).ReturnsAsync(resp);

        var result = await _controller.GetBySku("S");

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(resp, ok.Value);
    }

    [Fact]
    public async Task GetById_ReturnsOk_WhenFound()
    {
        var id = Guid.NewGuid();
        _get.Setup(g => g.GetById(id)).ReturnsAsync(Sample(id));

        var result = await _controller.GetById(id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var r = Assert.IsType<ProductResponse>(ok.Value);
        Assert.Equal(id, r.Id);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_OnException()
    {
        var id = Guid.NewGuid();
        _get.Setup(g => g.GetById(id)).ThrowsAsync(new ProductNotFoundException(id));

        var result = await _controller.GetById(id);
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Create_ReturnsOk_OnSuccess()
    {
        _create.Setup(c => c.CreateProduct(It.IsAny<CreateProductRequest>())).ReturnsAsync(Sample(Guid.NewGuid()));

        var result = await _controller.Create(new CreateProductRequest
        {
            Name = "X", SKU = "S", Description = "d", Weight = 1m, CategoryId = Guid.NewGuid()
        });

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task Create_ReturnsNotFound_WhenCategoryMissing()
    {
        var catId = Guid.NewGuid();
        _create.Setup(c => c.CreateProduct(It.IsAny<CreateProductRequest>()))
            .ThrowsAsync(new CategoryNotFoundException(catId));

        var result = await _controller.Create(new CreateProductRequest
        {
            Name = "X", SKU = "S", Description = "d", Weight = 1m, CategoryId = catId
        });

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Update_ReturnsOk_OnSuccess()
    {
        var id = Guid.NewGuid();
        var resp = Sample(id);
        _update.Setup(u => u.UpdateProduct(id, It.IsAny<UpdateProductRequest>())).ReturnsAsync(resp);

        var result = await _controller.Update(id, new UpdateProductRequest
        {
            Name = "X", SKU = "S", Description = "d", Weight = 1m, CategoryId = Guid.NewGuid()
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(resp, ok.Value);
    }

    [Fact]
    public async Task Update_ReturnsNotFound_OnProductMissing()
    {
        var id = Guid.NewGuid();
        _update.Setup(u => u.UpdateProduct(id, It.IsAny<UpdateProductRequest>()))
            .ThrowsAsync(new ProductNotFoundException(id));

        var result = await _controller.Update(id, new UpdateProductRequest
        {
            Name = "X", SKU = "S", Description = "d", Weight = 1m, CategoryId = Guid.NewGuid()
        });

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Update_ReturnsNotFound_OnCategoryMissing()
    {
        var id = Guid.NewGuid();
        var catId = Guid.NewGuid();
        _update.Setup(u => u.UpdateProduct(id, It.IsAny<UpdateProductRequest>()))
            .ThrowsAsync(new CategoryNotFoundException(catId));

        var result = await _controller.Update(id, new UpdateProductRequest
        {
            Name = "X", SKU = "S", Description = "d", Weight = 1m, CategoryId = catId
        });

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Delete_ReturnsNoContent_OnSuccess()
    {
        var id = Guid.NewGuid();
        _delete.Setup(d => d.DeleteById(id)).Returns(Task.CompletedTask);

        var result = await _controller.Delete(id);
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_ReturnsNotFound_OnException()
    {
        var id = Guid.NewGuid();
        _delete.Setup(d => d.DeleteById(id)).ThrowsAsync(new ProductNotFoundException(id));

        var result = await _controller.Delete(id);
        Assert.IsType<NotFoundObjectResult>(result);
    }
}
