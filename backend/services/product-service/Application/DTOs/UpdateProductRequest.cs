namespace product_service.Application.DTOs;

public class UpdateProductRequest
{
    public string Name { get; set; } = null!;
    public string SKU { get; set; } = null!;
    public string Description { get; set; } = null!;
    public decimal Weight { get; set; }
    public Guid CategoryId { get; set; }
}