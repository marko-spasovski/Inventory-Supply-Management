using System.Text.Json;
using Confluent.Kafka;
using order_service.Application.DTOs;
using order_service.Application.Interfaces;

namespace order_service.Infrastructure.Kafka;

public class KafkaProducer : IKafkaProducer, IDisposable
{
    private static readonly JsonSerializerOptions KafkaJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IProducer<string, string> _producer;
    private readonly ILogger<KafkaProducer> _logger;

    private const string TopicOrderCreated       = "order.created";
    private const string TopicOrderStatusChanged = "order.status.changed";

    public KafkaProducer(IConfiguration config, ILogger<KafkaProducer> logger)
    {
        _logger = logger;

        var producerConfig = new ProducerConfig
        {
            BootstrapServers = config["Kafka:BootstrapServers"] ?? "localhost:9092",
        };

        _producer = new ProducerBuilder<string, string>(producerConfig).Build();
    }

    public async Task PublishOrderCreatedAsync(OrderCreatedEvent evt)
    {
        await PublishAsync(TopicOrderCreated, evt.OrderId, evt);
    }

    public async Task PublishOrderStatusChangedAsync(OrderStatusChangedEvent evt)
    {
        await PublishAsync(TopicOrderStatusChanged, evt.OrderId, evt);
    }

    private async Task PublishAsync<T>(string topic, string key, T payload)
    {
        var message = new Message<string, string>
        {
            Key   = key,
            Value = JsonSerializer.Serialize(payload, KafkaJsonOptions),
        };

        var result = await _producer.ProduceAsync(topic, message);

        _logger.LogInformation(
            "[Kafka] published to {Topic} — key={Key} offset={Offset}",
            topic, key, result.Offset);
    }

    public void Dispose() => _producer?.Dispose();
}
