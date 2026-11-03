namespace order_service.Application.DTOs;

public class CreateOrderRequest
{
    public Guid ProductId { get; set; }
    public Guid CompanyId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid DriverId { get; set; }
    public int Quantity { get; set; }
    public DateTime? DeliveryDate { get; set; }
}