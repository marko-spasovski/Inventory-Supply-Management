using order_service.Domain.Enums;

namespace order_service.Application.DTOs;

public class UpdateOrderStatusRequest
{
    public Guid OrderId { get; set; }
    public Status Status { get; set; }
}