using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace product_service.Infrastructure.Entities;

[Table("categories")]
public class CategoryEntity
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public Guid Id { get; set; }
    [Required]
    [Column("name")]
    public string Name { get; set; } = null!;
    [Required]
    [Column("description")]
    public string? Description { get; set; }
    
    protected CategoryEntity(){}

    public CategoryEntity(Guid id, string name, string description)
    {
        Id = id;
        Name = name;
        Description = description;
    }
}