namespace order_service.Application.DTOs;

public class OrderCreatedEvent
{
    public string OrderId     { get; set; } = string.Empty;
    public string CompanyId   { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string WarehouseId { get; set; } = string.Empty;
    public string Status      { get; set; } = string.Empty;
    public string CreatedAt   { get; set; } = string.Empty;
}

public class OrderStatusChangedEvent
{
    public string OrderId   { get; set; } = string.Empty;
    public string OldStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public string ChangedAt { get; set; } = string.Empty;
}