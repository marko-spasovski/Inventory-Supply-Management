using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using product_service.Application.DTOs;
using product_service.Application.Ports.In.Category;
using product_service.Application.Services;
using product_service.Domain.Exceptions;

namespace product_service.Controllers;

[ApiController]
[Route("categories")]
public class CategoryController: ControllerBase
{
    private readonly ICreateCategoryUseCase _createCategory;
    private readonly IUpdateCategoryUseCase _updateCategory;
    private readonly IGetAllCategoriesUseCase _getAllCategories;
    private readonly IGetCategoryUseCase _getCategory;
    private readonly IDeleteCategoryUseCase _deleteCategory;


    public CategoryController(
        ICreateCategoryUseCase createCategory,
        IUpdateCategoryUseCase updateCategory,
        IGetAllCategoriesUseCase getAllCategories,
        IGetCategoryUseCase getCategory,
        IDeleteCategoryUseCase deleteCategory)
    {
        _createCategory = createCategory;
        _updateCategory = updateCategory;
        _getAllCategories = getAllCategories;
        _getCategory = getCategory;
        _deleteCategory = deleteCategory;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _getAllCategories.GetAllCategories();
        return Ok(categories);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var category = await _getCategory.GetById(id);
            return Ok(category);
        }
        catch (CategoryNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateCategory(CreateCategoryRequest request)
    {
        await _createCategory.CreateCategory(request);
        return Ok();
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCategory(Guid id, UpdateCategoryRequest request)
    {
        try
        {
            var updatedCategory = await _updateCategory.UpdateCategory(id, request);
            return Ok(updatedCategory);
        }
        catch (CategoryNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        try
        {
            await _deleteCategory.DeleteById(id);
            return NoContent();
        }
        catch (CategoryNotFoundException)
        {
            return NotFound();
        }
    }
    
    
}