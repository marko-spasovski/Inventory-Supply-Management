using order_service.Domain.Enums;

namespace order_service.Application.DTOs;

public class OrderResponse
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid CompanyId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid DriverId { get; set; }
    public int Quantity { get; set; }
    public Status Status { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastModified { get; set; }
}