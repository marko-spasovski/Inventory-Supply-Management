using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using product_service.Domain.Entities;

namespace product_service.Infrastructure.Entities;

[Table("products")]
public class ProductEntity
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public Guid Id { get; set; }
    [Required]
    [Column("name")]
    public string Name { get; set; } = null!;
    [Required]
    [Column("sku")]
    public string SKU { get; set; } = null!;
    [Required]
    [Column("description")]
    public string Description { get; set; } = null!;
    [Required]
    [Column("weight")]
    public decimal Weight { get; set; }
    [Required]
    [Column("category_id")]
    public Guid CategoryId { get; set; }
    
    protected  ProductEntity() {}
    
    public ProductEntity(Guid id, string name, string sku, string description, decimal weight, Guid categoryId)
    {
        Id = id;
        Name = name;
        SKU = sku;
        Description = description;
        Weight = weight;
        CategoryId = categoryId;
    }
}