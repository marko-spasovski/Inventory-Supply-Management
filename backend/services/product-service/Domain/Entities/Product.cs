namespace product_service.Domain.Entities;

public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string SKU { get; set; } = null!;
    public string Description { get; set; } = null!;
    public decimal Weight { get; set; }
    public Guid CategoryId { get; set; }
    
    public Product(Guid id, string name, string sku, string description, decimal weight, Guid categoryId)
    {
        Id = id;
        Name = name;
        SKU = sku;
        Description = description;
        Weight = weight;
        CategoryId = categoryId;
    }

    public static Product Create(string name, string sku, string description, decimal weight, Guid categoryId)
    {
        return new Product(
            Guid.NewGuid(),
            name,
            sku,
            description,
            weight,
            categoryId
        );
    }

    public void Update(string name, string sku, string description, decimal weight, Guid categoryId)
    {
        Name = name;
        SKU = sku;
        Description = description;
        Weight = weight;
        CategoryId = categoryId;
    }
}