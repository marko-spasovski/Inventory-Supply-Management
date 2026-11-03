namespace product_service.Application.DTOs;

public class CategoryResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }
    
    public CategoryResponse(Guid id, string name, string? description)
    {
        Id = id;
        Name = name;
        Description = description;
    }
}