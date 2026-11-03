namespace order_service.Application.Interfaces;

public interface IInventoryGrpcClient
{
    Task SendInventoryAsync(Guid productId, Guid warehouseId, int quantity);
}