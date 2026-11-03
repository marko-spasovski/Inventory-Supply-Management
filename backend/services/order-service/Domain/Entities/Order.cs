using order_service.Domain.Enums;

namespace order_service.Domain;

public class Order : BaseEntity
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid CompanyId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid DriverId { get; set; }
    public int Quantity { get; set; } 
    public Status Status { get; private set; }
    public DateTime? DeliveryDate { get; set; }  // ← add

    public Order(Guid productId, Guid companyId, Guid warehouseId, Guid driverId, int quantity, DateTime? deliveryDate = null)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        CompanyId = companyId;
        WarehouseId = warehouseId;
        DriverId = driverId;
        Quantity = quantity;
        Status = Status.Requested;
        DeliveryDate = deliveryDate.HasValue 
            ? DateTime.SpecifyKind(deliveryDate.Value, DateTimeKind.Utc)  // ← fix
            : null;

    }
    
    public void UpdateStatus(Status newStatus)
    {
        Status = newStatus;
    }
    
}