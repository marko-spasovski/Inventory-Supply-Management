namespace product_service.Application.DTOs;

public class CreateCategoryRequest
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
}