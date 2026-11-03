using order_service.Application.DTOs;

namespace order_service.Application.Interfaces;

public interface IKafkaProducer
{
    Task PublishOrderCreatedAsync(OrderCreatedEvent evt);
    Task PublishOrderStatusChangedAsync(OrderStatusChangedEvent evt);
}