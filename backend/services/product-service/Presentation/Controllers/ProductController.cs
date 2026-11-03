using Microsoft.AspNetCore.Mvc;
using product_service.Application.DTOs;
using product_service.Application.Ports.In.Product;
using product_service.Application.Services;
using product_service.Domain.Entities;
using product_service.Domain.Exceptions;

namespace product_service.Controllers;

[ApiController]
[Route("products")]
public class ProductController : ControllerBase
{
    private readonly ICreateProductUseCase _createProduct;
    private readonly IUpdateProductUseCase _updateProduct;
    private readonly IGetProductUseCase _getProduct;
    private readonly IGetProductBySkuUseCase _getProductBySku;
    private readonly IGetByCategoryUseCase _getByCategory;
    private readonly IGetAllProductsUseCase _getAllProducts;
    private readonly IDeleteProductUseCase _deleteProduct;

    public ProductController(ICreateProductUseCase createProduct, IUpdateProductUseCase updateProduct, IGetProductUseCase getProduct, IGetProductBySkuUseCase getProductBySku, IGetByCategoryUseCase getByCategory, IGetAllProductsUseCase getAllProducts, IDeleteProductUseCase deleteProduct)
    {
        _createProduct = createProduct;
        _updateProduct = updateProduct;
        _getProduct = getProduct;
        _getProductBySku = getProductBySku;
        _getByCategory = getByCategory;
        _getAllProducts = getAllProducts;
        _deleteProduct = deleteProduct;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var products = await _getAllProducts.GetAllProducts();
        return Ok(products);
    }

    // Lookup by business SKU — used by the mobile barcode scanner.
    // Declared before the `{id:guid}` route to remove ambiguity.
    [HttpGet("by-sku")]
    public async Task<IActionResult> GetBySku([FromQuery] string sku)
    {
        if (string.IsNullOrWhiteSpace(sku))
        {
            return BadRequest(new { error = "Bad Request", message = "Query parameter `sku` is required." });
        }

        var product = await _getProductBySku.GetBySku(sku);
        if (product == null)
        {
            return NotFound(new { error = "Not Found", message = $"No product with sku `{sku}`." });
        }

        return Ok(product);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById([FromRoute] Guid id)
    {
        try
        {
            var product = await _getProduct.GetById(id);
            return Ok(product);
        }
        catch (ProductNotFoundException ex)
        {
            return NotFound(new {message = ex.Message});
        }
    }

    [HttpGet("{id:guid}/category")]
    public async Task<IActionResult> GetByCategory([FromQuery] Guid categoryId, [FromQuery] string categoryName)
    {
        var products = await _getByCategory.GetAllByCategoryIdOrName(categoryId, categoryName);
        return Ok(products);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest request)
    {
        try
        {
            var product = await _createProduct.CreateProduct(request);
            return Ok();
        }
        catch(CategoryNotFoundException ex)
        {
            return NotFound(new {message = ex.Message});
        }
    }
    
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateProductRequest request)
    {
        try
        {
            var updatedProduct = await _updateProduct.UpdateProduct(id, request);
            return Ok(updatedProduct);
        }
        catch (ProductNotFoundException ex)
        {
            return NotFound(new {message = ex.Message});
        }
        catch(CategoryNotFoundException ex)
        {
            return NotFound(new {message = ex.Message});
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete([FromRoute] Guid id)
    {
        try
        {
            await _deleteProduct.DeleteById(id);
            return NoContent();
        }
        catch (ProductNotFoundException ex)
        {
            return NotFound(new {message = ex.Message});
        }
    }
}
