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
    
    // Allowed transitions (docs/requirements.md, "Supply order lifecycle"). Repeating a transition,
    // such as approving an approved order, is refused like any other invalid change (finding R04).
    private static readonly Dictionary<Status, Status[]> AllowedTransitions = new()
    {
        [Status.Requested] = [Status.Approved, Status.Rejected],
        [Status.Approved]  = [Status.Delivered],
        [Status.Delivered] = [Status.Closed],
        [Status.Closed]    = [],
        [Status.Rejected]  = [],
    };

    public static bool CanTransition(Status from, Status to) =>
        AllowedTransitions.TryGetValue(from, out var next) && next.Contains(to);

    public void UpdateStatus(Status newStatus)
    {
        if (!CanTransition(Status, newStatus))
            throw new order_service.Domain.Exceptions.InvalidStatusTransitionException(Status.ToString(), newStatus.ToString());
        Status = newStatus;
    }
    
}