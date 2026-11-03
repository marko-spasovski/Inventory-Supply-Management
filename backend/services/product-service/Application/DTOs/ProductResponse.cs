namespace product_service.Application.DTOs;

public class ProductResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string SKU { get; set; } = null!;
    public string Description { get; set; } = null!;
    public decimal Weight { get; set; }
    public Guid CategoryId { get; set; }
    
    public ProductResponse(Guid id, string name, string sku, string description, decimal weight, Guid categoryId)
    {
        Id = id;
        Name = name;
        SKU = sku;
        Description = description;
        Weight = weight;
        CategoryId = categoryId;
    }
}