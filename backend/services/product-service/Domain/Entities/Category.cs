namespace product_service.Domain.Entities;

public class Category
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    
    public Category(Guid id, string name, string? description)
    {
        Id = id;
        Name = name;
        Description = description;
    }

    public static Category Create(string name, string description)
    {
        return new Category(
            Guid.NewGuid(),
            name,
            description
        );
    }

    public void Update(string name, string description)
    {
        Name = name;
        Description = description;
    }
}