using Microsoft.AspNetCore.Mvc;
using Moq;
using product_service.Application.DTOs;
using product_service.Application.Ports.In.Category;
using product_service.Controllers;
using product_service.Domain.Exceptions;
using Xunit;

namespace ProductSvc.Tests.Presentation.Controllers;

public class CategoryControllerTest
{
    private readonly Mock<ICreateCategoryUseCase> _create = new();
    private readonly Mock<IUpdateCategoryUseCase> _update = new();
    private readonly Mock<IGetAllCategoriesUseCase> _getAll = new();
    private readonly Mock<IGetCategoryUseCase> _get = new();
    private readonly Mock<IDeleteCategoryUseCase> _delete = new();
    private readonly CategoryController _controller;

    public CategoryControllerTest()
    {
        _controller = new CategoryController(_create.Object, _update.Object, _getAll.Object,
            _get.Object, _delete.Object);
    }

    [Fact]
    public async Task GetAll_ReturnsOk()
    {
        _getAll.Setup(g => g.GetAllCategories()).ReturnsAsync(new List<CategoryResponse>
        {
            new(Guid.NewGuid(), "A", "d"),
            new(Guid.NewGuid(), "B", "d")
        });

        var result = await _controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<IEnumerable<CategoryResponse>>(ok.Value);
        Assert.Equal(2, list.Count());
    }

    [Fact]
    public async Task GetById_ReturnsOk_WhenFound()
    {
        var id = Guid.NewGuid();
        _get.Setup(g => g.GetById(id)).ReturnsAsync(new CategoryResponse(id, "A", "d"));

        var result = await _controller.GetById(id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var r = Assert.IsType<CategoryResponse>(ok.Value);
        Assert.Equal(id, r.Id);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_OnException()
    {
        var id = Guid.NewGuid();
        _get.Setup(g => g.GetById(id)).ThrowsAsync(new CategoryNotFoundException(id));

        var result = await _controller.GetById(id);
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task CreateCategory_ReturnsOk()
    {
        _create.Setup(c => c.CreateCategory(It.IsAny<CreateCategoryRequest>()))
            .ReturnsAsync(new CategoryResponse(Guid.NewGuid(), "X", "d"));

        var result = await _controller.CreateCategory(new CreateCategoryRequest { Name = "X", Description = "d" });

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task UpdateCategory_ReturnsOk_OnSuccess()
    {
        var id = Guid.NewGuid();
        var resp = new CategoryResponse(id, "New", "Newd");
        _update.Setup(u => u.UpdateCategory(id, It.IsAny<UpdateCategoryRequest>())).ReturnsAsync(resp);

        var result = await _controller.UpdateCategory(id, new UpdateCategoryRequest { Name = "New", Description = "Newd" });

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(resp, ok.Value);
    }

    [Fact]
    public async Task UpdateCategory_ReturnsNotFound_OnException()
    {
        var id = Guid.NewGuid();
        _update.Setup(u => u.UpdateCategory(id, It.IsAny<UpdateCategoryRequest>()))
            .ThrowsAsync(new CategoryNotFoundException(id));

        var result = await _controller.UpdateCategory(id, new UpdateCategoryRequest { Name = "X", Description = "d" });
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task DeleteCategory_ReturnsNoContent_OnSuccess()
    {
        var id = Guid.NewGuid();
        _delete.Setup(d => d.DeleteById(id)).Returns(Task.CompletedTask);

        var result = await _controller.DeleteCategory(id);
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task DeleteCategory_ReturnsNotFound_OnException()
    {
        var id = Guid.NewGuid();
        _delete.Setup(d => d.DeleteById(id)).ThrowsAsync(new CategoryNotFoundException(id));

        var result = await _controller.DeleteCategory(id);
        Assert.IsType<NotFoundResult>(result);
    }
}
