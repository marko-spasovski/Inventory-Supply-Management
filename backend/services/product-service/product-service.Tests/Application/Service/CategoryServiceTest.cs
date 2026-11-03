using product_service.Application.DTOs;
using product_service.Application.Ports.Out;
using product_service.Application.Services;
using product_service.Domain.Entities;
using product_service.Domain.Exceptions;
using Moq;
using Xunit;

namespace ProductSvc.Tests.Application.Service;

public class CategoryServiceTest
{
    private readonly Mock<ICategoryRepositoryPort> _repo = new();
    private readonly CategoryService _service;

    public CategoryServiceTest()
    {
        _service = new CategoryService(_repo.Object);
    }

    [Fact]
    public async Task CreateCategory_PersistsAndReturnsResponse()
    {
        _repo.Setup(r => r.Save(It.IsAny<Category>())).ReturnsAsync((Category c) => c);

        var resp = await _service.CreateCategory(new CreateCategoryRequest { Name = "Electronics", Description = "d" });

        Assert.Equal("Electronics", resp.Name);
        Assert.NotEqual(Guid.Empty, resp.Id);
        _repo.Verify(r => r.Save(It.IsAny<Category>()), Times.Once);
    }

    [Fact]
    public async Task UpdateCategory_Succeeds_WhenFound()
    {
        var c = new Category(Guid.NewGuid(), "Old", "Old desc");
        _repo.Setup(r => r.GetById(c.Id)).ReturnsAsync(c);
        _repo.Setup(r => r.Save(It.IsAny<Category>())).ReturnsAsync((Category x) => x);

        var resp = await _service.UpdateCategory(c.Id, new UpdateCategoryRequest { Name = "New", Description = "New desc" });

        Assert.Equal("New", resp.Name);
        Assert.Equal("New desc", resp.Description);
        _repo.Verify(r => r.Save(c), Times.Once);
    }

    [Fact]
    public async Task UpdateCategory_Throws_WhenMissing()
    {
        _repo.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((Category?)null);

        await Assert.ThrowsAsync<CategoryNotFoundException>(() =>
            _service.UpdateCategory(Guid.NewGuid(), new UpdateCategoryRequest { Name = "N", Description = "d" }));
    }

    [Fact]
    public async Task GetAllCategories_MapsAll()
    {
        _repo.Setup(r => r.GetAll()).ReturnsAsync(new List<Category>
        {
            new(Guid.NewGuid(), "A", "x"),
            new(Guid.NewGuid(), "B", "y"),
            new(Guid.NewGuid(), "C", "z")
        });

        var list = (await _service.GetAllCategories()).ToList();
        Assert.Equal(3, list.Count);
    }

    [Fact]
    public async Task GetById_Returns_WhenFound()
    {
        var c = new Category(Guid.NewGuid(), "Cat", "d");
        _repo.Setup(r => r.GetById(c.Id)).ReturnsAsync(c);

        var resp = await _service.GetById(c.Id);

        Assert.Equal(c.Id, resp.Id);
        Assert.Equal("Cat", resp.Name);
    }

    [Fact]
    public async Task GetById_Throws_WhenMissing()
    {
        _repo.Setup(r => r.GetById(It.IsAny<Guid>())).ReturnsAsync((Category?)null);
        await Assert.ThrowsAsync<CategoryNotFoundException>(() => _service.GetById(Guid.NewGuid()));
    }

    [Fact]
    public async Task DeleteById_Succeeds_WhenDeletes()
    {
        var c = new Category(Guid.NewGuid(), "Cat", "d");
        _repo.Setup(r => r.DeleteById(c.Id)).ReturnsAsync(c);

        await _service.DeleteById(c.Id);

        _repo.Verify(r => r.DeleteById(c.Id), Times.Once);
    }

    [Fact]
    public async Task DeleteById_Throws_WhenRepoReturnsNull()
    {
        _repo.Setup(r => r.DeleteById(It.IsAny<Guid>())).ReturnsAsync((Category?)null);
        await Assert.ThrowsAsync<CategoryNotFoundException>(() => _service.DeleteById(Guid.NewGuid()));
    }
}
